import AppLayout from "@/components/AppLayout";
import { Search, Plus, Send, X, MessageCircle, Phone, Paperclip, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { leads as leadsApi, messages as messagesApi, templates as templatesApi, mediaApi, activityApi, conversationsApi, aiSuggestionsApi, agents as agentsApi, Lead, Message, WaTemplate, MediaUploadResult, ActivityEvent, ConversationSummary, AiSuggestion } from "@/lib/api";
import { ChatSocket } from "@/lib/ws";
import { MessageStatusLabel } from "@/components/MessageStatusLabel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const TEMPLATE_PURPOSES = ["conversational", "support", "transactional", "marketing"] as const;

const isWindowOpen = (lead: Lead | null) => {
  if (!lead?.whatsapp_window_expires_at && !lead?.last_inbound_at) return false;
  const expires = lead.whatsapp_window_expires_at
    ? new Date(lead.whatsapp_window_expires_at).getTime()
    : new Date(lead.last_inbound_at!).getTime() + 24 * 60 * 60 * 1000;
  return Date.now() < expires;
};

const latestInboundProvider = (msgs: Message[]): "twilio" | "meta" => {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].direction !== "inbound") continue;
    return msgs[i].provider === "meta" ? "meta" : "twilio";
  }
  return "twilio";
};

/** Resolve stored template placeholders like [template:HX…] to a readable label. */
const formatChatMessageText = (
  message: Message,
  templates: WaTemplate[],
): string => {
  const raw = (message.message || "").trim();
  const bracket = raw.match(/^\[template:(.+)\]$/i);
  const sid = message.content_sid || (bracket?.[1]?.startsWith("HX") ? bracket[1] : undefined);
  const key = bracket?.[1];

  if (message.template_name) {
    return `Template: ${message.template_name}`;
  }

  if (sid || key || message.template_id) {
    const match =
      templates.find((t) => sid && t.content_sid === sid) ||
      templates.find((t) => message.template_id && t.id === message.template_id) ||
      templates.find((t) => key && (t.name === key || t.content_sid === key));
    if (match?.name) return `Template: ${match.name}`;
    if (key && !key.startsWith("HX")) return `Template: ${key}`;
    if (sid) return `Template: ${sid}`;
  }

  return message.message || "";
};

const outboundSenderLabel = (message: Message, activeAgentName?: string | null): string => {
  if (message.agent_name?.trim()) return message.agent_name.trim();
  if (message.sender_type === "ai") return activeAgentName?.trim() || "AI Agent";
  // Legacy AI replies (before sender_type was stored): support purpose, no template
  if (
    message.message_purpose === "support" &&
    !message.content_sid &&
    !message.template_id
  ) {
    return activeAgentName?.trim() || "AI Agent";
  }
  return "You";
};

const MessageMedia = ({ message }: { message: Message }) => {
  const items = message.media_items?.length
    ? message.media_items
    : message.media_url
      ? [{ url: message.media_url, content_type: message.media_content_type || undefined, filename: message.media_filename }]
      : [];
  if (!items.length) return null;

  return (
    <div className="space-y-2 mb-2">
      {items.map((item, idx) => {
        const ct = (item.content_type || message.media_content_type || "").toLowerCase();
        const src = mediaApi.proxyUrl(message.id, item.index ?? idx);
        const name = item.filename || message.media_filename || "attachment";
        if (ct.startsWith("image/")) {
          return (
            <a key={idx} href={src} target="_blank" rel="noreferrer">
              <img src={src} alt={name} className="max-w-full max-h-64 rounded-lg object-contain" />
            </a>
          );
        }
        if (ct.startsWith("audio/")) {
          return <audio key={idx} controls src={src} className="w-full max-w-xs" />;
        }
        if (ct.startsWith("video/")) {
          return <video key={idx} controls src={src} className="max-w-full max-h-64 rounded-lg" />;
        }
        return (
          <a
            key={idx}
            href={src}
            target="_blank"
            rel="noreferrer"
            className="text-xs underline break-all"
          >
            {name}
          </a>
        );
      })}
    </div>
  );
};

const LiveChat = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatForm, setNewChatForm] = useState({ name: "", phone: "" });
  const [approvedTemplates, setApprovedTemplates] = useState<WaTemplate[]>([]);
  const [activeAgentName, setActiveAgentName] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [templatePurpose, setTemplatePurpose] = useState<"conversational" | "support" | "transactional" | "marketing">("conversational");
  const [attachment, setAttachment] = useState<MediaUploadResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [leadActivity, setLeadActivity] = useState<ActivityEvent[]>([]);
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [intent, setIntent] = useState<string | undefined>();
  const [sentiment, setSentiment] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeLeadRef = useRef<Lead | null>(null);
  const socketRef = useRef<ChatSocket | null>(null);

  useEffect(() => {
    activeLeadRef.current = activeLead;
  }, [activeLead]);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await leadsApi.list({ page: 1, page_size: 50, sort_by: "updated_at", sort_order: "desc" });
      setLeads(data.items);
    } catch (err) {
      toast.error("Failed to load leads", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (leadId: string) => {
    try {
      const data = await messagesApi.list(leadId);
      setMessages(data);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      toast.error("Failed to load messages", { description: (err as Error).message });
    }
  }, []);

  useEffect(() => {
    if (!activeLead?.id) {
      setLeadActivity([]);
      setSummary(null);
      setSuggestions([]);
      setIntent(undefined);
      setSentiment(undefined);
      return;
    }
    activityApi
      .forLead(activeLead.id, 1)
      .then((res) => setLeadActivity((res.items || []).slice(0, 8)))
      .catch(() => setLeadActivity([]));
    conversationsApi
      .summary(activeLead.id)
      .then(setSummary)
      .catch(() => setSummary(null));
    aiSuggestionsApi
      .list(activeLead.id)
      .then((res) => {
        setSuggestions((res.items || []).filter((s) => s.status === "pending"));
        setIntent(res.current_intent);
        setSentiment(res.current_sentiment);
      })
      .catch(() => setSuggestions([]));
  }, [activeLead?.id]);

  useEffect(() => {
    fetchConversations();
    templatesApi
      .list()
      .then((data) =>
        setApprovedTemplates(
          data.filter((t) => t.status === "approved" || t.provider === "meta"),
        ),
      )
      .catch(() => setApprovedTemplates([]));
    agentsApi
      .list()
      .then((list) => {
        const active = list
          .filter((a) => a.status === "active")
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
        setActiveAgentName(active?.name || null);
      })
      .catch(() => setActiveAgentName(null));
  }, [fetchConversations]);

  useEffect(() => {
    const meta = latestInboundProvider(messages) === "meta";
    templatesApi
      .list({ provider: meta ? "meta" : "twilio_content" })
      .then((data) =>
        setApprovedTemplates(
          data.filter((t) => t.status === "approved" || t.provider === "meta"),
        ),
      )
      .catch(() => undefined);
  }, [activeLead?.id, messages]);

  useEffect(() => {
    if (!user) return;
    const socket = new ChatSocket();
    socketRef.current = socket;
    socket.connect(() => {
      const cur = activeLeadRef.current;
      if (cur) fetchMessages(cur.id);
      fetchConversations();
    });
    const off = socket.on((evt) => {
      if (evt.event === "message:new" || evt.event === "message:updated") {
        const msg = evt.data as Message;
        const cur = activeLeadRef.current;
        if (cur && msg.lead_id === cur.id) {
          setMessages((prev) => {
            if (evt.event === "message:updated") {
              return prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m));
            }
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
        fetchConversations();
      }
      if (evt.event === "lead:updated") {
        const updated = evt.data as Lead;
        setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
        setActiveLead((cur) => (cur && cur.id === updated.id ? { ...cur, ...updated } : cur));
      }
    });
    return () => {
      off();
      socket.close();
      socketRef.current = null;
    };
  }, [user, fetchConversations, fetchMessages]);

  useEffect(() => {
    if (!activeLead) return;
    fetchMessages(activeLead.id);
  }, [activeLead, fetchMessages]);

  const handleSendMessage = async () => {
    if (!activeLead || !user || activeLead.blacklisted) return;
    const windowOpen = isWindowOpen(activeLead);
    const chatProvider = latestInboundProvider(messages);
    const isMetaChat = chatProvider === "meta";
    if (selectedTemplateId && attachment) {
      toast.error("Cannot attach media to a template message");
      return;
    }
    if (isMetaChat && attachment) {
      toast.error("Media sending is not yet supported for Meta WhatsApp conversations.");
      return;
    }
    if (!windowOpen && !selectedTemplateId) {
      toast.error(
        isMetaChat
          ? "Use an approved Meta WhatsApp template to message outside the 24-hour window."
          : "WhatsApp customer service window closed. Use an approved template.",
      );
      return;
    }
    if (windowOpen && !newMessage.trim() && !selectedTemplateId && !attachment) return;
    if (selectedTemplateId && !TEMPLATE_PURPOSES.includes(templatePurpose)) {
      toast.error("Select a valid message purpose for this template");
      return;
    }

    setSending(true);
    try {
      const sent = selectedTemplateId
        ? await messagesApi.send(activeLead.id, undefined, undefined, {
            template_id: selectedTemplateId,
            content_variables: Object.keys(templateVars).length ? templateVars : undefined,
            message_purpose: templatePurpose,
          })
        : await messagesApi.send(
            activeLead.id,
            newMessage.trim() || undefined,
            attachment?.url || attachment?.path,
            attachment
              ? {
                  media_content_type: attachment.content_type,
                  media_filename: attachment.filename,
                }
              : undefined,
          );
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setNewMessage("");
      setSelectedTemplateId("");
      setTemplateVars({});
      setTemplatePurpose("conversational");
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setAttachment(null);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      toast.error("Failed to send message", { description: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  const handlePickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (selectedTemplateId) {
      toast.error("Clear the template selection before attaching media");
      return;
    }
    setUploading(true);
    try {
      const uploaded = await mediaApi.upload(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
      setAttachment(uploaded);
    } catch (err) {
      toast.error("Upload failed", { description: (err as Error).message });
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStartNewChat = async () => {
    if (!newChatForm.name.trim() || !user) {
      toast.error("Name is required");
      return;
    }
    try {
      const newLead = await leadsApi.create({
        name: newChatForm.name.trim(),
        phone: newChatForm.phone.trim() || null,
        score: "warm",
        source: "manual",
      });
      toast.success("Conversation started");
      setShowNewChat(false);
      setNewChatForm({ name: "", phone: "" });
      await fetchConversations();
      setActiveLead(newLead);
    } catch (err) {
      toast.error("Failed to create conversation", { description: (err as Error).message });
    }
  };

  const selectLead = (lead: Lead) => {
    setActiveLead(lead);
  };

  const applyLeadUpdate = (updated: Lead) => {
    setActiveLead(updated);
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
  };

  const runLeadAction = async (action: () => Promise<Lead>, okMsg: string) => {
    if (!activeLead) return;
    try {
      const updated = await action();
      applyLeadUpdate(updated);
      toast.success(okMsg);
    } catch (err) {
      toast.error("Action failed", { description: (err as Error).message });
    }
  };

  const filteredLeads = leads.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.phone || "").includes(searchQuery)
  );

  const initials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const aiPaused = !!activeLead?.ai_paused;
  const humanTakeover = !!activeLead?.takeover_by;
  const needsHuman = !!activeLead?.needs_human;
  const windowOpen = isWindowOpen(activeLead);
  const chatProvider = latestInboundProvider(messages);
  const isMetaChat = chatProvider === "meta";
  const pickerTemplates = approvedTemplates.filter((t) =>
    isMetaChat
      ? t.provider === "meta" && !!t.whatsapp_sendable
      : t.provider !== "meta" && t.status === "approved",
  );
  const selectedTemplate = pickerTemplates.find((t) => t.id === selectedTemplateId) || null;
  const templateVarKeys =
    selectedTemplate?.variable_schema?.length
      ? selectedTemplate.variable_schema.map((s) => s.key)
      : selectedTemplate?.variables || [];

  const refreshSummary = async () => {
    if (!activeLead) return;
    setSummaryLoading(true);
    try {
      await conversationsApi.refreshSummary(activeLead.id);
      toast.success("Summary refresh queued");
      setTimeout(() => {
        conversationsApi.summary(activeLead.id).then(setSummary).catch(() => undefined);
      }, 2000);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100dvh-3.5rem)] lg:h-[calc(100dvh-4rem)] min-h-0 gap-0 -m-4 md:-m-6 lg:-m-8 overflow-hidden">
        <div className="w-full md:w-72 lg:w-80 bg-card border-r border-border flex flex-col flex-shrink-0 min-h-0">
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full bg-muted rounded-xl pl-9 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <button
                onClick={() => setShowNewChat(true)}
                className="p-2.5 rounded-xl gradient-green flex-shrink-0"
                title="New Chat"
              >
                <Plus className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
            ) : filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                {leads.length === 0 ? "No conversations yet. Start one!" : "No matches."}
              </div>
            ) : (
              filteredLeads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => selectLead(lead)}
                  className={`w-full text-left p-4 border-l-2 transition-colors ${
                    activeLead?.id === lead.id ? "border-accent bg-accent/5" : "border-transparent hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold">{initials(lead.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{lead.name}</p>
                        {lead.score && (
                          <span className={`text-[10px] font-medium ${
                            lead.score === "hot" ? "text-accent" : lead.score === "warm" ? "text-yellow-400" : "text-muted-foreground"
                          }`}>
                            {lead.score.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{lead.phone || "No phone"}</p>
                      {(lead.ai_paused || lead.takeover_by || lead.needs_human) && (
                        <p className="text-[10px] mt-1 text-muted-foreground truncate">
                          {[
                            lead.needs_human ? "Needs human" : null,
                            lead.takeover_by ? "Takeover" : null,
                            lead.ai_paused ? "AI paused" : null,
                          ].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-hidden bg-background">
          {activeLead ? (
            <>
              <div className="shrink-0 px-4 py-3 border-b border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold">{initials(activeLead.name)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{activeLead.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        {activeLead.phone && <><Phone className="w-3 h-3 shrink-0" /> {activeLead.phone}</>}
                        {!activeLead.phone && "No phone number"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end max-w-[55%]">
                    {needsHuman && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                        Needs Human
                      </span>
                    )}
                    {aiPaused && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 font-medium">
                        AI Paused
                      </span>
                    )}
                    {humanTakeover && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                        Human Takeover
                      </span>
                    )}
                    {intent && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-medium capitalize">
                        {intent.replace(/_/g, " ")}
                      </span>
                    )}
                    {sentiment && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium capitalize">
                        {sentiment}
                      </span>
                    )}
                    {activeLead.score && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        activeLead.score === "hot" ? "bg-accent/10 text-accent" :
                        activeLead.score === "warm" ? "bg-yellow-500/10 text-yellow-400" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {activeLead.score.toUpperCase()}
                        {typeof activeLead.lead_score === "number" ? ` · ${activeLead.lead_score}` : ""}
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        windowOpen ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
                      }`}
                      title={
                        activeLead.whatsapp_window_expires_at
                          ? `Expires ${new Date(activeLead.whatsapp_window_expires_at).toLocaleString()}`
                          : undefined
                      }
                    >
                      {windowOpen ? "Window Open" : "Window Closed"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {aiPaused ? (
                    <button
                      onClick={() => runLeadAction(() => leadsApi.resumeAi(activeLead.id), "AI resumed")}
                      disabled={humanTakeover}
                      className="text-xs px-3 py-1 rounded-lg glass glass-border hover:bg-muted disabled:opacity-40"
                      title={humanTakeover ? "Hand back to AI to fully resume" : undefined}
                    >
                      Resume AI
                    </button>
                  ) : (
                    <button
                      onClick={() => runLeadAction(() => leadsApi.pauseAi(activeLead.id), "AI paused")}
                      className="text-xs px-3 py-1 rounded-lg glass glass-border hover:bg-muted"
                    >
                      Pause AI
                    </button>
                  )}
                  {humanTakeover ? (
                    <button
                      onClick={() => runLeadAction(() => leadsApi.handBack(activeLead.id), "Handed back to AI")}
                      className="text-xs px-3 py-1 rounded-lg gradient-green text-primary-foreground"
                    >
                      Hand Back to AI
                    </button>
                  ) : (
                    <button
                      onClick={() => runLeadAction(() => leadsApi.takeOver(activeLead.id), "Conversation taken over")}
                      className="text-xs px-3 py-1 rounded-lg gradient-green text-primary-foreground"
                    >
                      Take Over
                    </button>
                  )}
                  {needsHuman ? (
                    <button
                      onClick={() => runLeadAction(() => leadsApi.clearNeedsHuman(activeLead.id), "Needs human cleared")}
                      className="text-xs px-3 py-1 rounded-lg glass glass-border hover:bg-muted"
                    >
                      Clear Needs Human
                    </button>
                  ) : (
                    <button
                      onClick={() => runLeadAction(() => leadsApi.markNeedsHuman(activeLead.id), "Marked needs human")}
                      className="text-xs px-3 py-1 rounded-lg glass glass-border hover:bg-muted"
                    >
                      Mark Needs Human
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const hasMedia = !!(m.media_url || m.media_items?.length);
                    const placeholder = /^\[(image|audio|video|document|media)\]$/i.test((m.message || "").trim());
                    const displayText = formatChatMessageText(m, approvedTemplates);
                    const showText = !!displayText && !(hasMedia && placeholder);
                    return (
                    <div key={m.id} className={`flex ${m.direction === "inbound" ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-md rounded-2xl p-4 ${
                        m.direction === "inbound" ? "bg-muted" : "gradient-green text-primary-foreground"
                      }`}>
                        <MessageMedia message={m} />
                        {showText && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayText}</p>
                        )}
                        <p className={`text-[10px] mt-2 ${
                          m.direction === "inbound" ? "text-muted-foreground" : "text-primary-foreground/60"
                        }`}>
                          {m.direction === "outbound" && `${outboundSenderLabel(m, activeAgentName)} · `}
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {m.status && (
                            <>
                              {" · "}
                              <MessageStatusLabel
                                status={m.status}
                                error={m.error}
                                errorMessage={m.error_message}
                                outbound={m.direction === "outbound"}
                              />
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="shrink-0 px-4 py-3 border-t border-border space-y-2 bg-background">
                {!windowOpen ? (
                  <p className="text-xs text-destructive">
                    {isMetaChat ? (
                      <>
                        The 24-hour customer service window is closed. Send an approved Meta WhatsApp
                        template.
                      </>
                    ) : (
                      <>
                        Window closed
                        {activeLead.whatsapp_window_expires_at
                          ? ` · expired ${new Date(activeLead.whatsapp_window_expires_at).toLocaleString()}`
                          : " · no recent inbound"}
                        . Send an approved template.
                      </>
                    )}
                  </p>
                ) : activeLead.whatsapp_window_expires_at ? (
                  <p className="text-[11px] text-muted-foreground">
                    Window open until {new Date(activeLead.whatsapp_window_expires_at).toLocaleString()}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedTemplateId(id);
                      const t = pickerTemplates.find((x) => x.id === id);
                      const next: Record<string, string> = {};
                      const keys =
                        t?.variable_schema?.length ? t.variable_schema.map((s) => s.key) : t?.variables || [];
                      keys.forEach((k) => {
                        next[k] = templateVars[k] || "";
                      });
                      setTemplateVars(next);
                      if (!id) setTemplatePurpose("conversational");
                    }}
                    className="bg-muted rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    <option value="">{windowOpen ? "Free-form message" : "Select approved template"}</option>
                    {pickerTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  {selectedTemplateId && (
                    <select
                      value={templatePurpose}
                      onChange={(e) => setTemplatePurpose(e.target.value as typeof templatePurpose)}
                      className="bg-muted rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30"
                      title="Message purpose (required for templates)"
                    >
                      {TEMPLATE_PURPOSES.map((p) => (
                        <option key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {selectedTemplate && templateVarKeys.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {templateVarKeys.map((key) => (
                      <input
                        key={key}
                        value={templateVars[key] || ""}
                        onChange={(e) => setTemplateVars((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder={`{{${key}}}`}
                        className="bg-muted rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30"
                      />
                    ))}
                  </div>
                )}
                {attachment && (
                  <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2 text-xs">
                    {previewUrl && attachment.content_type.startsWith("image/") ? (
                      <img src={previewUrl} alt="" className="h-10 w-10 rounded object-cover" />
                    ) : null}
                    <span className="flex-1 truncate">{attachment.filename}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                        setPreviewUrl(null);
                        setAttachment(null);
                      }}
                      className="p-1 hover:bg-background rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,audio/*,video/mp4,video/3gpp,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                    onChange={handlePickFile}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={
                      isMetaChat ||
                      !!activeLead.blacklisted ||
                      !windowOpen ||
                      !!selectedTemplateId ||
                      uploading
                    }
                    className={`p-2.5 rounded-xl glass glass-border disabled:opacity-40 ${isMetaChat ? "hidden" : ""}`}
                    title={
                      isMetaChat
                        ? "Media is not yet supported for Meta conversations"
                        : !windowOpen
                          ? "Window closed"
                          : selectedTemplateId
                            ? "Clear template to attach media"
                            : "Attach file"
                    }
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      activeLead.blacklisted
                        ? "Lead is unsubscribed"
                        : !windowOpen
                          ? isMetaChat
                            ? "Free-form disabled — choose an approved Meta template"
                            : "Free-form disabled — choose a template"
                          : uploading
                            ? "Uploading..."
                            : "Type a message..."
                    }
                    disabled={!!activeLead.blacklisted || !windowOpen}
                    className="flex-1 bg-muted rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={
                      sending ||
                      uploading ||
                      !!activeLead.blacklisted ||
                      (isMetaChat
                        ? selectedTemplateId
                          ? false
                          : !windowOpen || !newMessage.trim()
                        : selectedTemplateId
                          ? false
                          : !windowOpen || (!newMessage.trim() && !attachment))
                    }
                    className="p-2.5 rounded-xl gradient-green disabled:opacity-50"
                  >
                    <Send className="w-4 h-4 text-primary-foreground" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-display font-semibold mb-1">Select a Conversation</p>
              <p className="text-sm">Choose a lead from the left or start a new chat</p>
            </div>
          )}
        </div>

        {activeLead && (
          <div className="hidden lg:flex lg:flex-col w-80 bg-card border-l border-border flex-shrink-0 min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
              <h3 className="font-display font-semibold">Lead Info</h3>

              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg font-semibold">{initials(activeLead.name)}</span>
                </div>
                <p className="font-semibold">{activeLead.name}</p>
                <p className="text-xs text-muted-foreground">{activeLead.phone || "No phone"}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Score</p>
                  <p className={`text-sm font-bold capitalize ${
                    activeLead.score === "hot" ? "text-accent" : activeLead.score === "warm" ? "text-yellow-400" : "text-muted-foreground"
                  }`}>
                    {activeLead.score || "Unscored"}
                    {typeof activeLead.lead_score === "number" ? ` · ${activeLead.lead_score}` : ""}
                  </p>
                </div>
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Messages</p>
                  <p className="text-sm font-bold">{messages.length}</p>
                </div>
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Source</p>
                  <p className="text-sm font-medium truncate">{activeLead.source || "Unknown"}</p>
                </div>
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">WA Window</p>
                  <p className={`text-sm font-bold ${windowOpen ? "text-accent" : "text-destructive"}`}>
                    {windowOpen ? "Open" : "Closed"}
                  </p>
                </div>
              </div>

              <Collapsible defaultOpen>
                <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-xl bg-muted px-3 py-2.5 text-left">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Conversation summary</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2 rounded-xl border border-border p-3">
                  <div className="flex justify-end">
                    <button
                      disabled={summaryLoading}
                      onClick={refreshSummary}
                      className="text-[10px] text-accent hover:underline disabled:opacity-40"
                    >
                      {summaryLoading ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>
                  {summary?.summary ? (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{summary.summary}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">No summary yet.</p>
                  )}
                  {summary?.updated_at && (
                    <p className="text-[10px] text-muted-foreground">
                      Updated {new Date(summary.updated_at).toLocaleString()}
                    </p>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {leadActivity.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-xl bg-muted px-3 py-2.5 text-left">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Lead activity ({leadActivity.length})
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-border p-3">
                    <ul className="space-y-2">
                      {leadActivity.map((ev) => (
                        <li key={ev.id} className="text-xs text-muted-foreground">
                          <p className="leading-snug">{ev.summary || ev.event_type}</p>
                          <p className="text-[10px] mt-0.5 opacity-70">
                            {new Date(ev.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {suggestions.length > 0 && (
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-xl bg-muted px-3 py-2.5 text-left">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      AI suggestions ({suggestions.length})
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    {suggestions.map((s) => (
                      <div key={s.id} className="text-xs bg-muted/40 rounded-lg border border-border p-2">
                        <div className="flex justify-between gap-2">
                          <span className="font-medium capitalize">{s.field.replace(/_/g, " ")}</span>
                          <span className="text-muted-foreground">{Math.round(s.confidence * 100)}%</span>
                        </div>
                        <p className="text-muted-foreground mt-0.5 break-words">{String(s.suggested_value)}</p>
                        <div className="flex gap-2 mt-1">
                          <button
                            className="text-accent hover:underline"
                            onClick={async () => {
                              try {
                                await aiSuggestionsApi.accept(activeLead.id, s.id);
                                setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
                                toast.success("Suggestion accepted");
                              } catch (err) {
                                toast.error((err as Error).message);
                              }
                            }}
                          >
                            Accept
                          </button>
                          <button
                            className="text-muted-foreground hover:underline"
                            onClick={async () => {
                              try {
                                await aiSuggestionsApi.reject(activeLead.id, s.id);
                                setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
                              } catch (err) {
                                toast.error((err as Error).message);
                              }
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {activeLead.blacklisted && (
                <div className="bg-destructive/10 rounded-xl p-3 text-destructive text-xs font-medium">
                  Unsubscribed (blacklisted)
                </div>
              )}

              <div className="bg-muted rounded-xl p-3 space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase">WhatsApp Consent</p>
                <p className="text-sm font-bold capitalize">
                  {(activeLead.whatsapp_consent_status || "unknown").replace(/_/g, " ")}
                </p>
                {activeLead.whatsapp_consent_source && (
                  <p className="text-[10px] text-muted-foreground">Source: {activeLead.whatsapp_consent_source}</p>
                )}
                {activeLead.whatsapp_consent_at && (
                  <p className="text-[10px] text-muted-foreground">
                    Opted in: {new Date(activeLead.whatsapp_consent_at).toLocaleString()}
                  </p>
                )}
                {activeLead.whatsapp_opted_out_at && (
                  <p className="text-[10px] text-muted-foreground">
                    Opted out: {new Date(activeLead.whatsapp_opted_out_at).toLocaleString()}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    className="flex-1 text-xs py-1.5 rounded-lg bg-accent/15 text-accent"
                    onClick={async () => {
                      try {
                        const updated = await leadsApi.optIn(activeLead.id, { source: "manual" });
                        setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
                        applyLeadUpdate(updated);
                        toast.success("Marked opted in");
                      } catch (err) {
                        toast.error("Opt-in failed", { description: (err as Error).message });
                      }
                    }}
                  >
                    Opt in
                  </button>
                  <button
                    type="button"
                    className="flex-1 text-xs py-1.5 rounded-lg bg-destructive/10 text-destructive"
                    onClick={async () => {
                      try {
                        const updated = await leadsApi.optOut(activeLead.id, {
                          source: "manual",
                          reason: "manual_opt_out",
                        });
                        setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
                        applyLeadUpdate(updated);
                        toast.success("Marked opted out");
                      } catch (err) {
                        toast.error("Opt-out failed", { description: (err as Error).message });
                      }
                    }}
                  >
                    Opt out
                  </button>
                </div>
              </div>

              {activeLead.tags && activeLead.tags.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeLead.tags.map(t => (
                      <span key={t} className="px-2 py-1 rounded-md bg-muted text-xs">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold">Start New Chat</h2>
              <button onClick={() => setShowNewChat(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Contact Name *</label>
                <input
                  value={newChatForm.name}
                  onChange={(e) => setNewChatForm({ ...newChatForm, name: e.target.value })}
                  placeholder="e.g. John Smith"
                  maxLength={100}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Phone Number</label>
                <input
                  value={newChatForm.phone}
                  onChange={(e) => setNewChatForm({ ...newChatForm, phone: e.target.value })}
                  placeholder="+44 7700 900000"
                  maxLength={20}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowNewChat(false)} className="flex-1 py-3 rounded-xl glass glass-border text-sm font-medium">Cancel</button>
                <button onClick={handleStartNewChat} className="flex-1 py-3 rounded-xl gradient-green text-sm font-medium text-primary-foreground">
                  Start Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default LiveChat;
