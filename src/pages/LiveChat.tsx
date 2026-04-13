import AppLayout from "@/components/AppLayout";
import { Search, Plus, Send, X, MessageCircle, Phone } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { leads as leadsApi, messages as messagesApi, Lead, Message } from "@/lib/api";
import { ChatSocket } from "@/lib/ws";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeLeadRef = useRef<Lead | null>(null);
  const socketRef = useRef<ChatSocket | null>(null);

  useEffect(() => {
    activeLeadRef.current = activeLead;
  }, [activeLead]);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await leadsApi.list();
      setLeads(data);
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
    fetchConversations();
  }, [fetchConversations]);

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
    if (!newMessage.trim() || !activeLead || !user) return;
    setSending(true);
    try {
      const sent = await messagesApi.send(activeLead.id, newMessage.trim());
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setNewMessage("");
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      toast.error("Failed to send message", { description: (err as Error).message });
    } finally {
      setSending(false);
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

  const filteredLeads = leads.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.phone || "").includes(searchQuery)
  );

  const initials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-7rem)] lg:h-[calc(100vh-6rem)] gap-0 -m-4 md:-m-6 lg:-m-8">
        <div className="w-full md:w-80 bg-card border-r border-border flex flex-col flex-shrink-0">
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

          <div className="flex-1 overflow-y-auto">
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
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="hidden md:flex flex-col flex-1 bg-background">
          {activeLead ? (
            <>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs font-semibold">{initials(activeLead.name)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{activeLead.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {activeLead.phone && <><Phone className="w-3 h-3" /> {activeLead.phone}</>}
                      {!activeLead.phone && "No phone number"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeLead.score && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      activeLead.score === "hot" ? "bg-accent/10 text-accent" :
                      activeLead.score === "warm" ? "bg-yellow-500/10 text-yellow-400" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {activeLead.score.toUpperCase()}
                    </span>
                  )}
                  {activeLead.source && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                      {activeLead.source}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.direction === "inbound" ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-md rounded-2xl p-4 ${
                        m.direction === "inbound" ? "bg-muted" : "gradient-green text-primary-foreground"
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.message}</p>
                        <p className={`text-[10px] mt-2 ${
                          m.direction === "inbound" ? "text-muted-foreground" : "text-primary-foreground/60"
                        }`}>
                          {m.direction === "outbound" && "You · "}
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {m.status && ` · ${m.status}`}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={activeLead.blacklisted ? "Lead is unsubscribed" : "Type a message..."}
                    disabled={!!activeLead.blacklisted}
                    className="flex-1 bg-muted rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim() || !!activeLead.blacklisted}
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
          <div className="hidden xl:block w-72 bg-card border-l border-border overflow-y-auto flex-shrink-0">
            <div className="p-5">
              <h3 className="font-display font-semibold mb-4">Lead Info</h3>

              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg font-semibold">{initials(activeLead.name)}</span>
                </div>
                <p className="font-semibold">{activeLead.name}</p>
                <p className="text-xs text-muted-foreground">{activeLead.phone || "No phone"}</p>
              </div>

              <div className="space-y-3">
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Score</p>
                  <p className={`text-sm font-bold capitalize ${
                    activeLead.score === "hot" ? "text-accent" : activeLead.score === "warm" ? "text-yellow-400" : "text-muted-foreground"
                  }`}>{activeLead.score || "Unscored"}</p>
                </div>
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Source</p>
                  <p className="text-sm font-medium">{activeLead.source || "Unknown"}</p>
                </div>
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">Messages</p>
                  <p className="text-sm font-bold">{messages.length}</p>
                </div>
                {activeLead.blacklisted && (
                  <div className="bg-destructive/10 rounded-xl p-3 text-destructive text-xs font-medium">
                    Unsubscribed (blacklisted)
                  </div>
                )}
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
