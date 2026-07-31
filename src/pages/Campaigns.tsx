import AppLayout from "@/components/AppLayout";
import { Plus, Search, Play, Pause, Pencil, X, Trash2, RotateCcw, Eye, Square } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  campaigns as campaignsApi,
  leads as leadsApi,
  templates as templatesApi,
  agents as agentsApi,
  mediaApi,
  AgentCampaignOption,
  Campaign,
  CampaignAnalytics,
  CampaignRecipient,
  Lead,
  WaTemplate,
  MediaUploadResult,
} from "@/lib/api";
import { ChatSocket } from "@/lib/ws";

const ACTIVE_POLL = new Set(["queued", "running", "paused"]);

const Campaigns = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Campaign | null>(null);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [recipFilter, setRecipFilter] = useState("");
  const [recipStatus, setRecipStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [saving, setSaving] = useState(false);
  const [attachment, setAttachment] = useState<MediaUploadResult | null>(null);

  const [agentOptions, setAgentOptions] = useState<AgentCampaignOption[]>([]);
  const [aiPreviews, setAiPreviews] = useState<Array<Record<string, unknown>>>([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    message: "",
    template_id: "",
    scheduled_at: "",
    selectedLeadIds: [] as string[],
    manualPhones: "",
    templateVars: {} as Record<string, string>,
    content_mode: "template" as "template" | "ai_agent",
    agent_id: "",
    campaign_goal: "",
    campaign_instructions: "",
    use_agent_knowledge: false,
    delivery_scope: "all_eligible_recipients" as
      | "open_window_only"
      | "all_eligible_recipients"
      | "template_only",
    fallback_template_id: "",
  });

  const fetchCampaigns = useCallback(async () => {
    try {
      setCampaigns(await campaignsApi.list());
    } catch (err) {
      toast.error("Failed to load campaigns", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    leadsApi
      .options({ limit: 50 })
      .then((opts) =>
        setLeads(
          opts.map((o) => ({
            id: o.id,
            user_id: "",
            name: o.name,
            phone: o.phone,
            score: (o.score as Lead["score"]) || null,
            source: null,
            tags: [],
            blacklisted: o.blacklisted,
            whatsapp_consent_status: o.whatsapp_consent_status,
            created_at: "",
            updated_at: "",
          })),
        ),
      )
      .catch(() => setLeads([]));
    templatesApi
      .list()
      .then((t) => setTemplates(t.filter((x) => x.status === "approved")))
      .catch(() => setTemplates([]));
    agentsApi
      .options()
      .then(setAgentOptions)
      .catch(() => setAgentOptions([]));
  }, [fetchCampaigns]);

  useEffect(() => {
    if (!user) return;
    const socket = new ChatSocket();
    socket.connect(() => fetchCampaigns());
    const off = socket.on((evt) => {
      if (String(evt.event || "").startsWith("campaign:")) {
        fetchCampaigns();
        const data = evt.data as Campaign;
        if (detail && data?.id === detail.id) {
          setDetail((d) => (d ? { ...d, ...data } : d));
        }
      }
    });
    return () => {
      off();
      socket.close();
    };
  }, [user, fetchCampaigns, detail?.id]);

  // Poll while any campaign is active
  useEffect(() => {
    const hasActive = campaigns.some((c) => ACTIVE_POLL.has(c.status));
    if (!hasActive) return;
    const t = setInterval(() => {
      fetchCampaigns();
      if (detail && ACTIVE_POLL.has(detail.status)) {
        campaignsApi.get(detail.id).then(setDetail).catch(() => {});
        campaignsApi.analytics(detail.id).then(setAnalytics).catch(() => {});
        campaignsApi
          .recipients(detail.id, { status: recipStatus || undefined, q: recipFilter || undefined })
          .then((r) => setRecipients(r.items))
          .catch(() => {});
      }
    }, 4000);
    return () => clearInterval(t);
  }, [campaigns, detail, fetchCampaigns, recipFilter, recipStatus]);

  const emptyForm = () => ({
    name: "",
    description: "",
    message: "",
    template_id: "",
    scheduled_at: "",
    selectedLeadIds: [] as string[],
    manualPhones: "",
    templateVars: {} as Record<string, string>,
    content_mode: "template" as "template" | "ai_agent",
    agent_id: "",
    campaign_goal: "",
    campaign_instructions: "",
    use_agent_knowledge: false,
    delivery_scope: "all_eligible_recipients" as
      | "open_window_only"
      | "all_eligible_recipients"
      | "template_only",
    fallback_template_id: "",
  });

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setAttachment(null);
    setAiPreviews([]);
    setShowForm(true);
  };

  const openEdit = async (c: Campaign) => {
    if (c.status !== "draft" && c.status !== "scheduled") {
      toast.error("Only draft or scheduled campaigns can be edited");
      return;
    }
    try {
      const full = await campaignsApi.get(c.id);
      const rec = await campaignsApi.recipients(c.id);
      const leadIds = rec.items.map((r) => r.lead_id).filter(Boolean) as string[];
      const phonesWithoutLead = rec.items
        .filter((r) => !r.lead_id && r.phone)
        .map((r) => r.phone);
      let scheduledLocal = "";
      if (full.scheduled_at) {
        const d = new Date(full.scheduled_at);
        if (!Number.isNaN(d.getTime())) {
          const pad = (n: number) => String(n).padStart(2, "0");
          scheduledLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        }
      }
      setEditingId(full.id);
      setForm({
        ...emptyForm(),
        name: full.name || "",
        description: full.description || "",
        message: full.message || "",
        template_id: full.template_id || "",
        scheduled_at: scheduledLocal,
        selectedLeadIds: leadIds,
        manualPhones: phonesWithoutLead.join("\n"),
        templateVars: (full.content_variables as Record<string, string>) || {},
        content_mode: full.content_mode === "ai_agent" ? "ai_agent" : "template",
        agent_id: full.agent_id || "",
        campaign_goal: full.campaign_goal || "",
        campaign_instructions: full.campaign_instructions || "",
        use_agent_knowledge: (full.knowledge_scope || "none") !== "none",
        delivery_scope: (full.delivery_scope as typeof form.delivery_scope) || "all_eligible_recipients",
        fallback_template_id: full.fallback_template_id || "",
      });
      setAttachment(null);
      setShowForm(true);
    } catch (err) {
      toast.error("Failed to open campaign for edit", { description: (err as Error).message });
    }
  };

  const openDetail = async (c: Campaign) => {
    try {
      const full = await campaignsApi.get(c.id);
      setDetail(full);
      setAnalytics(await campaignsApi.analytics(c.id));
      const rec = await campaignsApi.recipients(c.id);
      setRecipients(rec.items);
    } catch (err) {
      toast.error("Failed to load campaign", { description: (err as Error).message });
    }
  };

  const estimatedCount = () => {
    const phones = form.manualPhones
      .split(/[\n,;]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    return new Set([...form.selectedLeadIds, ...phones]).size;
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    const phones = form.manualPhones
      .split(/[\n,;]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!form.selectedLeadIds.length && !phones.length) {
      toast.error("Select leads or enter phone numbers");
      return;
    }
    if (form.agent_id) {
      if (!form.campaign_goal.trim() || form.campaign_goal.trim().length < 8) {
        toast.error("Tell the agent what this campaign is about (campaign goal)");
        return;
      }
      const needsFallback =
        form.delivery_scope === "all_eligible_recipients" || form.delivery_scope === "template_only";
      if (needsFallback && !form.fallback_template_id) {
        toast.error("Select an approved fallback template for closed WhatsApp windows");
        return;
      }
    } else if (!form.template_id && !form.message.trim() && !attachment) {
      toast.error("Provide a message, media, or approved template — or select an Agent");
      return;
    }
    setSaving(true);
    const useAgent = Boolean(form.agent_id);
    const needsFallback =
      useAgent &&
      (form.delivery_scope === "all_eligible_recipients" || form.delivery_scope === "template_only");
    const fallbackTpl = needsFallback ? form.fallback_template_id || null : null;
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      message: useAgent ? null : form.message.trim() || null,
      template_id: useAgent ? (needsFallback ? fallbackTpl : null) : form.template_id || null,
      content_variables:
        useAgent && needsFallback && fallbackTpl
          ? form.templateVars
          : !useAgent && form.template_id
            ? form.templateVars
            : undefined,
      media_url: useAgent || form.template_id ? undefined : attachment?.url || attachment?.path,
      media_content_type: useAgent || form.template_id ? undefined : attachment?.content_type,
      lead_ids: form.selectedLeadIds,
      recipients: phones,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      recipient_source: form.selectedLeadIds.length ? "leads" : "manual",
      content_mode: useAgent ? "ai_agent" : "template",
      agent_id: useAgent ? form.agent_id : null,
      campaign_subject: useAgent ? form.name.trim() : null,
      campaign_goal: useAgent ? form.campaign_goal.trim() : null,
      campaign_instructions: useAgent ? form.campaign_instructions.trim() || null : null,
      review_mode: "sample_review",
      preview_count: 5,
      delivery_scope: useAgent ? form.delivery_scope : "open_window_only",
      ai_context_mode: "campaign_only",
      knowledge_scope: useAgent && form.use_agent_knowledge ? "selected" : "none",
      campaign_knowledge_text: null,
      include_conversation_summary: false,
      include_recent_messages: false,
      include_lead_profile: false,
      allow_freeform_inside_window: useAgent ? form.delivery_scope !== "template_only" : true,
      personalise_template_variables: true,
      fallback_template_id: useAgent ? fallbackTpl : null,
      on_window_closed_before_send:
        useAgent && form.delivery_scope === "open_window_only" ? "skip" : "use_static_template",
    };
    try {
      if (editingId) {
        await campaignsApi.update(editingId, payload);
        toast.success("Campaign updated");
      } else {
        await campaignsApi.create(payload);
        toast.success("Campaign created");
      }
      setShowForm(false);
      setEditingId(null);
      fetchCampaigns();
    } catch (err) {
      toast.error(editingId ? "Failed to update campaign" : "Failed to create campaign", {
        description: (err as Error).message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Campaign) => {
    if (["queued", "running", "paused"].includes(c.status)) {
      toast.error("Cancel the campaign before deleting");
      return;
    }
    if (!window.confirm(`Delete campaign "${c.name}"? This cannot be undone.`)) return;
    try {
      await campaignsApi.remove(c.id);
      toast.success("Campaign deleted");
      if (detail?.id === c.id) setDetail(null);
      fetchCampaigns();
    } catch (err) {
      toast.error("Delete failed", { description: (err as Error).message });
    }
  };

  const runAction = async (label: string, fn: () => Promise<Campaign>) => {
    try {
      const updated = await fn();
      toast.success(label);
      fetchCampaigns();
      if (detail?.id === updated.id) {
        setDetail(updated);
        setAnalytics(await campaignsApi.analytics(updated.id));
      }
    } catch (err) {
      toast.error(label + " failed", { description: (err as Error).message });
    }
  };

  const startCampaignWithConfirm = async (c: Campaign) => {
    try {
      const full = await campaignsApi.get(c.id);
      const preview = await campaignsApi.eligibilityPreview(full.id);
      const summary = [
        `Total: ${preview.total_selected}`,
        `Eligible: ${preview.eligible}`,
        `Free-form AI (open window): ${preview.eligible_ai_freeform ?? preview.eligible_freeform_ai ?? 0}`,
        `Template fallback: ${preview.eligible_template_fallback ?? preview.eligible_template_ai ?? 0}`,
        `Static template: ${preview.eligible_template_static ?? 0}`,
        `Skipped closed window: ${preview.skipped_closed_window ?? 0}`,
        `Closed window / missing template: ${preview.closed_window_missing_template ?? 0}`,
        `Opted out: ${preview.opted_out}`,
        `No consent: ${preview.no_consent}`,
        `Blacklisted: ${preview.blacklisted}`,
        `Invalid: ${preview.invalid_number}`,
      ].join("\n");

      if (preview.eligible <= 0) {
        window.confirm(
          `Cannot start — no eligible recipients.\n\n${summary}\n\nOpt in each lead under Live Chat → Lead Info → Opt in, then try again.`,
        );
        toast.error("No eligible recipients", {
          description: "Opt in each lead under Live Chat → Lead Info → Opt in, then try again.",
        });
        return;
      }

      const meta = preview.template_meta;
      if (meta?.warning_required) {
        const warn =
          meta.warning_message ||
          "The selected WhatsApp template has not yet been approved by Meta.\n\nRecipients outside the 24-hour WhatsApp window will be skipped.";
        const header = meta.name
          ? `Template: ${meta.name}\nStatus: ${meta.whatsapp_approval_emoji || "🟡"} ${meta.whatsapp_approval_label || "Under Review"}\n\n`
          : "";
        const proceed = window.confirm(
          `${header}${warn}\n\nClick OK to Continue Anyway, or Cancel to abort launch.`,
        );
        if (!proceed) {
          toast.message("Campaign launch cancelled");
          return;
        }
      }

      const reviewMode = full.review_mode || "sample_review";
      const isAi = full.content_mode === "ai_agent";
      // Full review always needs generated+approved recipients before start.
      // Sample review needs campaign-level approval when not yet approved.
      const needsAiReviewGate =
        isAi && reviewMode !== "no_manual_review" && (reviewMode === "full_review" || !full.approved_at);

      if (needsAiReviewGate) {
        const isFull = reviewMode === "full_review";
        toast.message(isFull ? "Generating AI content for all recipients…" : "Generating AI sample preview…");
        let sampleText = "";
        let readyCount = 0;
        try {
          const count = isFull
            ? Math.min(25, Math.max(full.total_recipients || 5, full.preview_count || 5))
            : full.preview_count || 5;
          const ai = await campaignsApi.aiPreview(full.id, {
            preview_count: count,
            regenerate: isFull,
          });
          setAiPreviews(ai.previews);
          readyCount = ai.previews.filter(
            (p) =>
              p.quality_status === "ok" &&
              (String(p.generated_message || "").trim() || p.generated_template_variables),
          ).length;
          sampleText = ai.previews
            .slice(0, isFull ? 10 : 3)
            .map((p, i) => {
              const name = String(p.name || p.lead_id || `Lead ${i + 1}`);
              const body =
                String(p.generated_message || "").trim() ||
                (p.generated_template_variables
                  ? `Template vars: ${JSON.stringify(p.generated_template_variables)}`
                  : `(${String(p.quality_status || "no content")})`);
              return `${i + 1}. ${name}\n${body}`;
            })
            .join("\n\n");
        } catch (err) {
          toast.error("AI preview failed", { description: (err as Error).message });
          await openDetail(full);
          return;
        }

        if (isFull && readyCount <= 0) {
          toast.error("Full review incomplete", {
            description: "No recipients have usable AI content yet. Check subject/goal and try again.",
          });
          await openDetail(full);
          return;
        }

        const ok = window.confirm(
          `${isFull ? "AI full review" : "AI sample review"}\n\n${summary}\n\n—— Generated messages ——\n${sampleText || "(no samples)"}\n\nApprove and start the campaign?`,
        );
        if (!ok) {
          await openDetail(full);
          toast.message("Opened campaign detail — you can regenerate or approve content there.");
          return;
        }
        await campaignsApi.approveAiContent(full.id);
        await runAction("Started", () => campaignsApi.start(full.id));
        return;
      }

      const ok = window.confirm(
        `Confirm marketing campaign launch?\n\n${summary}\n\nOnly eligible opted-in recipients will be sent.`,
      );
      if (!ok) return;
      await runAction("Started", () => campaignsApi.start(full.id));
    } catch (err) {
      toast.error("Start failed", { description: (err as Error).message });
    }
  };

  const formatRecipientError = (r: CampaignRecipient, campaign?: Campaign | null) => {
    const raw = (r.error_code || r.error_message || "").trim();
    if (!raw) return "—";
    const code = (r.error_code || "").toLowerCase();
    const openOnly = (campaign?.delivery_scope || "") === "open_window_only";
    if (code === "template_under_review") {
      return r.error_message || "Template is Under Review by Meta — closed-window recipient skipped";
    }
    if (code === "template_pending") {
      return r.error_message || "Template is Pending Meta approval — closed-window recipient skipped";
    }
    if (code === "template_rejected") {
      return r.error_message || "Template was Rejected by Meta — closed-window recipient skipped";
    }
    if (code === "template_paused") {
      return r.error_message || "Template is Paused — closed-window recipient skipped";
    }
    if (code === "template_not_approved") {
      return r.error_message || "Template is not approved by Meta — closed-window recipient skipped";
    }
    if (
      code === "skipped_closed_window" ||
      (openOnly &&
        (code === "closed_window_missing_template" ||
          code === "window_closed" ||
          raw.toLowerCase().includes("closed window") ||
          raw.toLowerCase().includes("open whatsapp windows")))
    ) {
      return "Skipped — WhatsApp 24h window closed (open-window-only campaign)";
    }
    if (code === "closed_window_missing_template") {
      return "Outside 24h window — approved fallback template required";
    }
    return r.error_message || raw;
  };

  const templateOptionLabel = (t: WaTemplate) => {
    const wa = (t.whatsapp_approval_status || "").toLowerCase();
    const emoji = t.whatsapp_approval_emoji || "";
    if (wa === "approved" || t.whatsapp_sendable) {
      return `${emoji || "🟢"} ${t.name} (Approved)`;
    }
    if (wa === "under_review" || wa === "pending" || wa === "unsubmitted") {
      return `${emoji || "🟡"} ${t.name} — Waiting for Meta approval`;
    }
    if (wa === "rejected") {
      return `${emoji || "🔴"} ${t.name} — Rejected`;
    }
    if (wa === "paused") {
      return `${emoji || "🟠"} ${t.name} — Paused`;
    }
    return `${t.name}${t.status === "approved" ? "" : ` (${t.status})`}`;
  };

  const isTemplateSelectable = (t: WaTemplate) => {
    // Library must be approved; Meta sendable preferred. Unknown Meta status still selectable
    // (live check happens at send / launch warning). Rejected/paused/under_review disabled.
    if (t.status !== "approved") return false;
    const wa = (t.whatsapp_approval_status || "").toLowerCase();
    if (!wa) return true;
    return wa === "approved" || !!t.whatsapp_sendable;
  };

  const statusBadge = (status: string | null) => {
    const s = (status || "draft").toLowerCase();
    const color =
      s === "running" || s === "queued"
        ? "text-accent"
        : s === "completed" || s === "partially_completed"
          ? "text-accent"
          : s === "failed" || s === "cancelled"
            ? "text-destructive"
            : s === "paused"
              ? "text-yellow-400"
              : "text-muted-foreground";
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${color} bg-current/10`}>
        {s.replace(/_/g, " ")}
      </span>
    );
  };

  const filtered = campaigns.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize) || 1);
  const safePage = Math.min(page, totalPages);
  const pagedCampaigns = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selectedTemplate = templates.find((t) => t.id === form.template_id);

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">
            WhatsApp <span className="text-gradient-green">Campaigns</span>
          </h1>
          <p className="text-muted-foreground mt-1">Queue, send, pause, and measure campaign delivery.</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-green text-primary-foreground text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search campaigns..."
            className="w-full bg-muted rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      </div>

      <div className="bg-card rounded-2xl overflow-hidden">
        <div className="p-5 flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-display font-semibold">Campaign List</h2>
          <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
        {loading ? (
          <p className="p-8 text-sm text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-sm text-muted-foreground">No campaigns yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium">Sent</th>
                  <th className="px-4 py-3 font-medium">Delivered</th>
                  <th className="px-4 py-3 font-medium">Read</th>
                  <th className="px-4 py-3 font-medium">Failed</th>
                  <th className="px-4 py-3 font-medium">Replied</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {pagedCampaigns.map((c) => (
                  <tr key={c.id} className="border-b border-border/60">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {c.content_mode === "ai_agent"
                        ? `AI · ${c.agent_snapshot?.name || "Agent"}`
                        : "Template"}
                    </td>
                    <td className="px-4 py-3">{statusBadge(c.status)}</td>
                    <td className="px-4 py-3 min-w-[120px]">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${Math.min(100, c.progress_percentage || 0)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {c.progress_percentage || 0}% · {c.total_recipients || 0} recipients
                      </p>
                    </td>
                    <td className="px-4 py-3">{c.sent_count || 0}</td>
                    <td className="px-4 py-3">{c.delivered_count || 0}</td>
                    <td className="px-4 py-3">{c.read_count || 0}</td>
                    <td className="px-4 py-3">{c.failed_count || 0}</td>
                    <td className="px-4 py-3">{c.replied_count || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 justify-end">
                        <button onClick={() => openDetail(c)} className="p-1.5 rounded-lg hover:bg-muted" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        {(c.status === "draft" || c.status === "scheduled") && (
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded-lg hover:bg-muted"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {(c.status === "draft" || c.status === "scheduled" || c.status === "queued") && (
                          <button
                            onClick={() => startCampaignWithConfirm(c)}
                            className="p-1.5 rounded-lg hover:bg-muted text-accent"
                            title="Start"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {c.status === "running" && (
                          <button
                            onClick={() => runAction("Paused", () => campaignsApi.pause(c.id))}
                            className="p-1.5 rounded-lg hover:bg-muted"
                            title="Pause"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        {c.status === "paused" && (
                          <button
                            onClick={() => runAction("Resumed", () => campaignsApi.resume(c.id))}
                            className="p-1.5 rounded-lg hover:bg-muted text-accent"
                            title="Resume"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {["running", "paused", "queued", "draft", "scheduled"].includes(c.status) && (
                          <button
                            onClick={() => runAction("Cancelled", () => campaignsApi.cancel(c.id))}
                            className="p-1.5 rounded-lg hover:bg-muted text-destructive"
                            title="Cancel"
                          >
                            <Square className="w-4 h-4" />
                          </button>
                        )}
                        {(c.failed_count || 0) > 0 && c.status !== "cancelled" && (
                          <button
                            onClick={() => runAction("Retry queued", () => campaignsApi.retryFailed(c.id))}
                            className="p-1.5 rounded-lg hover:bg-muted"
                            title="Retry failed"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        {!["queued", "running", "paused"].includes(c.status) && (
                          <button
                            onClick={() => handleDelete(c)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Per page</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="bg-muted rounded-lg px-2 py-1.5 text-sm"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-muted text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {safePage} of {totalPages}
            </span>
            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg bg-muted text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl w-full max-w-2xl p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-display font-bold">{editingId ? "Edit Campaign" : "New Campaign"}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Use a template, or select an Agent below and skip the template.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Campaign name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Summer outreach"
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Select Agent (optional)</label>
                <select
                  value={form.agent_id}
                  onChange={(e) => {
                    const agentId = e.target.value;
                    setForm({
                      ...form,
                      agent_id: agentId,
                      content_mode: agentId ? "ai_agent" : "template",
                      // Clear template when switching to agent so it is not required
                      template_id: agentId ? "" : form.template_id,
                      templateVars: agentId ? {} : form.templateVars,
                    });
                    if (agentId) setAttachment(null);
                  }}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 border border-accent/40"
                >
                  <option value="">No agent — use template / message</option>
                  {agentOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} — {a.kind} · {a.tone}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {form.agent_id
                    ? "Agent campaigns can use free-form messages inside the 24h window, with an optional approved template for closed windows."
                    : "Leave empty to use your usual template campaign."}
                </p>
              </div>
              {form.agent_id ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">What should the agent say? *</label>
                    <input
                      value={form.campaign_goal}
                      onChange={(e) => setForm({ ...form, campaign_goal: e.target.value })}
                      placeholder="e.g. Invite leads to AI Summer Camp 2026"
                      className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Extra instructions (optional)</label>
                    <textarea
                      value={form.campaign_instructions}
                      onChange={(e) => setForm({ ...form, campaign_instructions: e.target.value })}
                      rows={3}
                      maxLength={4000}
                      placeholder="Optional guidance for this campaign only"
                      className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Knowledge base</label>
                    <select
                      value={form.use_agent_knowledge ? "agent" : "none"}
                      onChange={(e) =>
                        setForm({ ...form, use_agent_knowledge: e.target.value === "agent" })
                      }
                      className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    >
                      <option value="none">No knowledge base — use generative AI</option>
                      <option value="agent">Use agent knowledge base — no generative AI</option>
                    </select>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {form.use_agent_knowledge
                        ? "Sends the selected agent’s knowledge base text to leads (not AI-written)."
                        : "AI writes the message from your campaign goal/instructions."}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Delivery mode</label>
                    <select
                      value={form.delivery_scope}
                      onChange={(e) => {
                        const scope = e.target.value as typeof form.delivery_scope;
                        setForm({
                          ...form,
                          delivery_scope: scope,
                          fallback_template_id:
                            scope === "open_window_only" ? "" : form.fallback_template_id,
                          templateVars: scope === "open_window_only" ? {} : form.templateVars,
                        });
                      }}
                      className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    >
                      <option value="all_eligible_recipients">
                        Open windows + approved template fallback (recommended)
                      </option>
                      <option value="open_window_only">Open WhatsApp windows only</option>
                      <option value="template_only">Approved template only</option>
                    </select>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {form.delivery_scope === "all_eligible_recipients" &&
                        "Recommended: open 24h window → Agent AI or knowledge-base message (per setting above); closed window → your approved fallback template. Reaches opted-in leads within WhatsApp rules."}
                      {form.delivery_scope === "open_window_only" &&
                        "Only open-window leads are messaged (e.g. Priya). Closed-window leads are skipped — no template required."}
                      {form.delivery_scope === "template_only" &&
                        "Every eligible lead gets the approved template only. No Agent free-form / KB body. Fixed template text is never rewritten."}
                    </p>
                  </div>
                  {form.delivery_scope !== "open_window_only" ? (
                    <div>
                      <label className="text-sm text-muted-foreground mb-1.5 block">
                        Approved fallback template *
                      </label>
                      <select
                        value={form.fallback_template_id}
                        onChange={(e) => {
                          const id = e.target.value;
                          const t = templates.find((x) => x.id === id);
                          const vars: Record<string, string> = {};
                          (t?.variables || []).forEach((k) => (vars[k] = form.templateVars[k] || ""));
                          setForm({
                            ...form,
                            fallback_template_id: id,
                            templateVars: vars,
                          });
                        }}
                        className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                      >
                        <option value="">Select approved template</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id} disabled={!isTemplateSelectable(t)}>
                            {templateOptionLabel(t)}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Used for closed 24h windows. Choose manually — nothing is auto-selected. Same
                        approved templates that already work in Template campaigns. Under Review templates
                        are disabled until Meta approves them.
                      </p>
                      {templates
                        .find((t) => t.id === form.fallback_template_id)
                        ?.variables?.map((key) => (
                          <div key={key} className="mt-2">
                            <label className="text-sm text-muted-foreground mb-1.5 block">
                              Variable {`{{${key}}}`}
                            </label>
                            <input
                              value={form.templateVars[key] || ""}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  templateVars: { ...form.templateVars, [key]: e.target.value },
                                })
                              }
                              className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                            />
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground rounded-lg bg-muted/60 px-3 py-2">
                      No template required because this campaign is limited to open WhatsApp conversations.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Approved template</label>
                    <select
                      value={form.template_id}
                      onChange={(e) => {
                        const id = e.target.value;
                        const t = templates.find((x) => x.id === id);
                        const vars: Record<string, string> = {};
                        (t?.variables || []).forEach((k) => (vars[k] = ""));
                        setForm({ ...form, template_id: id, templateVars: vars });
                        if (id) setAttachment(null);
                      }}
                      className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    >
                      <option value="">Free-form</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id} disabled={!isTemplateSelectable(t)}>
                          {templateOptionLabel(t)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedTemplate?.variables?.map((key) => (
                    <div key={key}>
                      <label className="text-sm text-muted-foreground mb-1.5 block">Variable {`{{${key}}}`}</label>
                      <input
                        value={form.templateVars[key] || ""}
                        onChange={(e) =>
                          setForm({ ...form, templateVars: { ...form.templateVars, [key]: e.target.value } })
                        }
                        className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                      />
                    </div>
                  ))}
                  {!form.template_id && (
                    <>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1.5 block">Message</label>
                        <textarea
                          value={form.message}
                          onChange={(e) => setForm({ ...form, message: e.target.value })}
                          rows={4}
                          className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1.5 block">Optional media</label>
                        <input
                          type="file"
                          accept="image/*,audio/*,video/mp4,application/pdf"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (!file) return;
                            try {
                              setAttachment(await mediaApi.upload(file));
                            } catch (err) {
                              toast.error("Upload failed", { description: (err as Error).message });
                            }
                          }}
                        />
                        {attachment && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {attachment.filename}{" "}
                            <button type="button" className="text-destructive" onClick={() => setAttachment(null)}>
                              Remove
                            </button>
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Schedule (optional, local time)</label>
                <input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Select leads</label>
                <div className="max-h-40 overflow-y-auto bg-muted rounded-xl p-2 space-y-1">
                  {leads.map((l) => (
                    <label key={l.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded hover:bg-background">
                      <input
                        type="checkbox"
                        checked={form.selectedLeadIds.includes(l.id)}
                        onChange={(e) => {
                          setForm({
                            ...form,
                            selectedLeadIds: e.target.checked
                              ? [...form.selectedLeadIds, l.id]
                              : form.selectedLeadIds.filter((id) => id !== l.id),
                          });
                        }}
                      />
                      <span className="truncate">
                        {l.name} {l.phone ? `(${l.phone})` : "(no phone)"}
                      </span>
                    </label>
                  ))}
                  {leads.length === 0 && <p className="text-xs text-muted-foreground p-2">No leads</p>}
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Or paste phone numbers</label>
                <textarea
                  value={form.manualPhones}
                  onChange={(e) => setForm({ ...form, manualPhones: e.target.value })}
                  placeholder={"+447700900000\n+447700900001"}
                  rows={3}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">Estimated recipients: {estimatedCount()}</p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                  className="flex-1 py-3 rounded-xl glass glass-border text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl gradient-green text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Save changes" : "Create draft"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl w-full max-w-4xl p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-display font-bold">{detail.name}</h2>
                <div className="mt-1">{statusBadge(detail.status)}</div>
              </div>
              <button onClick={() => setDetail(null)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="grid sm:grid-cols-4 gap-3 mb-4">
              {[
                ["Delivery", analytics?.rates.delivery_rate],
                ["Read", analytics?.rates.read_rate],
                ["Reply", analytics?.rates.reply_rate],
                ["Failure", analytics?.rates.failure_rate],
              ].map(([label, val]) => (
                <div key={String(label)} className="bg-muted rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase">{label} rate</p>
                  <p className="text-lg font-bold">{val ?? 0}%</p>
                </div>
              ))}
            </div>

            <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
              <div className="h-full bg-accent" style={{ width: `${detail.progress_percentage || 0}%` }} />
            </div>

            {(() => {
              const tid = detail.fallback_template_id || detail.template_id;
              const tpl = templates.find((t) => t.id === tid);
              if (!tpl && !detail.content_sid) return null;
              const name = tpl?.name || "Template";
              const emoji = tpl?.whatsapp_approval_emoji || "";
              const label = tpl?.whatsapp_approval_label || tpl?.whatsapp_approval_status || tpl?.status || "—";
              return (
                <div className="mb-4 rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-sm">
                  <p>
                    <span className="text-muted-foreground">Template:</span>{" "}
                    <span className="font-medium">{name}</span>
                  </p>
                  <p className="mt-1">
                    <span className="text-muted-foreground">Status:</span>{" "}
                    <span className="font-medium">
                      {emoji} {String(label).replace(/_/g, " ")}
                    </span>
                  </p>
                </div>
              );
            })()}

            {detail.content_mode === "ai_agent" && (
              <div className="mb-4 rounded-xl border border-accent/20 p-3 space-y-2">
                <p className="text-sm font-medium">
                  AI Agent: {detail.agent_snapshot?.name || detail.agent_id || "—"} · {detail.ai_generation_status || "idle"}
                </p>
                <p className="text-xs text-muted-foreground">Goal: {detail.campaign_goal || "—"}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="text-xs px-3 py-2 rounded-xl glass glass-border"
                    onClick={async () => {
                      try {
                        const res = await campaignsApi.aiPreview(detail.id, {
                          preview_count: detail.preview_count || 5,
                        });
                        setAiPreviews(res.previews);
                        toast.success(`Generated ${res.count} AI preview(s)`);
                        setDetail(await campaignsApi.get(detail.id));
                      } catch (err) {
                        toast.error("AI preview failed", { description: (err as Error).message });
                      }
                    }}
                  >
                    Generate AI preview
                  </button>
                  <button
                    className="text-xs px-3 py-2 rounded-xl gradient-green text-primary-foreground"
                    onClick={async () => {
                      try {
                        const updated = await campaignsApi.approveAiContent(detail.id);
                        setDetail(updated);
                        toast.success("AI content approved");
                      } catch (err) {
                        toast.error("Approve failed", { description: (err as Error).message });
                      }
                    }}
                  >
                    Approve AI content
                  </button>
                </div>
                {aiPreviews.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {aiPreviews.map((p) => (
                      <div key={String(p.recipient_id)} className="bg-muted rounded-lg p-2 text-xs">
                        <p className="font-medium">
                          {String(p.name || p.lead_id || p.recipient_id)} · {String(p.content_path || "")}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap">
                          {String(
                            p.generated_message ||
                              (p.generated_template_variables &&
                              Object.keys(p.generated_template_variables as object).length > 0
                                ? `Template vars: ${JSON.stringify(p.generated_template_variables)}`
                                : "") ||
                              (String(p.content_path || "").includes("template")
                                ? "WhatsApp template (see approved Content Template body in Twilio)"
                                : "") ||
                              "—",
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              <input
                value={recipFilter}
                onChange={(e) => setRecipFilter(e.target.value)}
                placeholder="Search phone/name"
                className="bg-muted rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <select
                value={recipStatus}
                onChange={(e) => setRecipStatus(e.target.value)}
                className="bg-muted rounded-xl px-3 py-2 text-xs"
              >
                <option value="">All statuses</option>
                {["pending", "queued", "sent", "delivered", "read", "failed", "skipped", "cancelled", "replied", "retrying"].map(
                  (s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ),
                )}
              </select>
              <button
                className="text-xs px-3 py-2 rounded-xl glass glass-border"
                onClick={async () => {
                  const r = await campaignsApi.recipients(detail.id, {
                    status: recipStatus || undefined,
                    q: recipFilter || undefined,
                  });
                  setRecipients(r.items);
                }}
              >
                Filter
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto border border-border rounded-xl">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">AI</th>
                    <th className="px-3 py-2">Attempts</th>
                    <th className="px-3 py-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.map((r) => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="px-3 py-2">{r.phone}</td>
                      <td className="px-3 py-2 capitalize">{r.status}</td>
                      <td className="px-3 py-2">
                        {r.content_source ||
                          (r.ai_generation_status === "failed" && r.status === "skipped"
                            ? "skipped"
                            : r.ai_generation_status) ||
                          "—"}
                        {r.ai_approved ? " ✓" : ""}
                      </td>
                      <td className="px-3 py-2">{r.attempt_count || 0}</td>
                      <td
                        className={`px-3 py-2 truncate max-w-[240px] ${
                          r.status === "skipped" ? "text-muted-foreground" : "text-destructive"
                        }`}
                        title={formatRecipientError(r, detail)}
                      >
                        {formatRecipientError(r, detail)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {analytics?.top_errors?.length ? (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2">Top errors</p>
                <ul className="text-xs space-y-1">
                  {analytics.top_errors.map((e) => (
                    <li key={e.message}>
                      {e.count}× {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Campaigns;
