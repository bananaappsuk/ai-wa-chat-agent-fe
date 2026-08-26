import AppLayout from "@/components/AppLayout";
import { Plus, Bot, Play, Settings, X, Trash2, Pencil, Upload } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { agents as agentsApi, Agent, AgentKind, SocialLinks } from "@/lib/api";

const KB_MAX = 10000;

type FormState = {
  name: string;
  kind: AgentKind;
  prompt: string;
  tone: "sales" | "support" | "neutral";
  knowledge_base: string;
  status: "active" | "inactive";
  description: string;
  routing_keywords: string;
  is_default: boolean;
  business_description: string;
  callback_number: string;
  logo_url: string;
  cta_text: string;
  cta_url: string;
  website_url: string;
  welcome_message: string;
  terms_text: string;
  support_email: string;
  business_hours: string;
  booking_link: string;
  price_floor: string;
  price_ceiling: string;
  social_links: SocialLinks;
};

const emptyForm: FormState = {
  name: "",
  kind: "inbound",
  prompt: "",
  tone: "neutral",
  knowledge_base: "",
  status: "active",
  description: "",
  routing_keywords: "",
  is_default: false,
  business_description: "",
  callback_number: "",
  logo_url: "",
  cta_text: "",
  cta_url: "",
  website_url: "",
  welcome_message: "",
  terms_text: "",
  support_email: "",
  business_hours: "",
  booking_link: "",
  price_floor: "",
  price_ceiling: "",
  social_links: {},
};

const isValidHttpUrl = (value: string): boolean => {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

const parseOptionalNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : NaN;
};

const Agents = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [kbUploading, setKbUploading] = useState(false);
  const kbFileRef = useRef<HTMLInputElement>(null);

  const fetchAgents = async () => {
    try {
      const data = await agentsApi.list();
      setAgents(data);
    } catch (err) {
      toast.error("Failed to load agents", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAgents(); }, []);

  const openNew = () => {
    setEditingAgent(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (a: Agent) => {
    setEditingAgent(a);
    setForm({
      name: a.name,
      kind: a.kind || "inbound",
      prompt: a.prompt || "",
      tone: a.tone || "neutral",
      knowledge_base: a.knowledge_base || "",
      status: a.status || "active",
      description: a.description || "",
      routing_keywords: (a.routing_keywords || []).join(", "),
      is_default: !!a.is_default,
      business_description: a.business_description || "",
      callback_number: a.callback_number || "",
      logo_url: a.logo_url || "",
      cta_text: a.cta_text || "",
      cta_url: a.cta_url || "",
      website_url: a.website_url || "",
      welcome_message: a.welcome_message || "",
      terms_text: a.terms_text || "",
      support_email: a.support_email || "",
      business_hours: a.business_hours || "",
      booking_link: a.booking_link || "",
      price_floor: a.price_floor || "",
      price_ceiling: a.price_ceiling || "",
      social_links: a.social_links || {},
    });
    setShowForm(true);
  };

  const mergeKnowledgeText = (incoming: string, source: string) => {
    const chunk = incoming.trim();
    if (!chunk) return;
    const header = `\n\n--- From file: ${source} ---\n`;
    const current = form.knowledge_base.trim();
    let next = current ? `${current}${header}${chunk}` : `${header.trim()}\n${chunk}`;
    if (next.length > KB_MAX) {
      next = next.slice(0, KB_MAX);
      toast.message("Knowledge base truncated to 10,000 characters");
    }
    setForm((prev) => ({ ...prev, knowledge_base: next }));
  };

  const handleKnowledgeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setKbUploading(true);
    try {
      const result = await agentsApi.extractKnowledge(file);
      mergeKnowledgeText(result.text, result.filename);
      toast.success(`Added text from ${result.filename} (${result.chars} chars)`);
    } catch (err) {
      toast.error("Knowledge upload failed", { description: (err as Error).message });
    } finally {
      setKbUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Agent name is required"); return; }

    const booking = form.booking_link.trim();
    if (booking && !isValidHttpUrl(booking)) {
      toast.error("Booking link must be a valid http(s) URL (e.g. https://ittalenthub.co.uk/contact)");
      return;
    }
    for (const [label, value] of [
      ["Website URL", form.website_url],
      ["CTA URL", form.cta_url],
      ["Logo URL", form.logo_url],
    ] as const) {
      const v = value.trim();
      if (v && !isValidHttpUrl(v)) {
        toast.error(`${label} must be a valid http(s) URL`);
        return;
      }
    }

    const floor = parseOptionalNumber(form.price_floor);
    const ceiling = parseOptionalNumber(form.price_ceiling);
    if (Number.isNaN(floor)) {
      toast.error("Price floor must be a number");
      return;
    }
    if (Number.isNaN(ceiling)) {
      toast.error("Price ceiling must be a number");
      return;
    }
    if (floor !== null && ceiling !== null && ceiling < floor) {
      toast.error("Price ceiling cannot be lower than price floor");
      return;
    }

    if (!user) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      kind: form.kind,
      prompt: form.prompt.trim() || null,
      tone: form.tone,
      knowledge_base: form.knowledge_base.trim() || null,
      status: form.status,
      description: form.description.trim() || null,
      routing_keywords: form.routing_keywords
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
      is_default: form.is_default,
      business_description: form.business_description.trim() || null,
      callback_number: form.callback_number.trim() || null,
      logo_url: form.logo_url.trim() || null,
      cta_text: form.cta_text.trim() || null,
      cta_url: form.cta_url.trim() || null,
      website_url: form.website_url.trim() || null,
      welcome_message: form.welcome_message.trim() || null,
      terms_text: form.terms_text.trim() || null,
      support_email: form.support_email.trim() || null,
      business_hours: form.business_hours.trim() || null,
      booking_link: booking || null,
      price_floor: form.price_floor.trim() || null,
      price_ceiling: form.price_ceiling.trim() || null,
      social_links: form.social_links,
    };
    try {
      if (editingAgent) {
        await agentsApi.update(editingAgent.id, payload as Partial<Agent>);
        toast.success("Agent updated");
      } else {
        await agentsApi.create(payload as Partial<Agent>);
        toast.success("Agent deployed");
      }
      setShowForm(false);
      fetchAgents();
    } catch (err) {
      toast.error("Failed to save agent", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await agentsApi.remove(id);
      toast.success("Agent deleted");
      fetchAgents();
    } catch (err) {
      toast.error("Failed to delete agent", { description: (err as Error).message });
    }
  };

  const toggleStatus = async (a: Agent) => {
    const newStatus = a.status === "active" ? "inactive" : "active";
    try {
      await agentsApi.update(a.id, { status: newStatus });
      toast.success(`Agent ${newStatus === "active" ? "activated" : "deactivated"}`);
      fetchAgents();
    } catch (err) {
      toast.error("Failed to update status", { description: (err as Error).message });
    }
  };

  const activeCount = agents.filter(a => a.status === "active").length;
  const setSocial = (k: keyof SocialLinks) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, social_links: { ...form.social_links, [k]: e.target.value || undefined } });

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">
            AI Agent <span className="text-gradient-green">Ecosystem</span>
          </h1>
          <p className="text-muted-foreground mt-1">Monitor and optimize your WhatsApp automation workforce.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-5 py-2.5 rounded-full gradient-green text-sm text-primary-foreground font-medium glow-green">
          <Plus className="w-4 h-4" /> Deploy New Agent
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "TOTAL AGENTS", value: String(agents.length), color: "text-accent" },
          { label: "ACTIVE", value: String(activeCount), color: "text-accent" },
          { label: "INACTIVE", value: String(agents.length - activeCount), color: "text-muted-foreground" },
          { label: "TONES", value: [...new Set(agents.map(a => a.tone))].length + " types", color: "text-accent" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-2xl p-5 border-l-2 border-accent/30">
            <p className={`text-[10px] uppercase tracking-wider font-semibold ${s.color}`}>{s.label}</p>
            <p className="text-2xl font-display font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-10">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          No agents yet. Deploy your first AI agent!
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((a) => (
            <div key={a.id} className={`bg-card rounded-2xl p-5 border-t-2 ${a.status === "active" ? "border-accent" : "border-muted-foreground/30"}`}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                  {a.logo_url ? (
                    <img src={a.logo_url} alt={a.name} className="w-full h-full object-cover" />
                  ) : (
                    <Bot className="w-5 h-5 text-accent" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{a.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{a.kind || "inbound"} · {a.tone} · {a.status}</p>
                </div>
                <span className={`text-xs font-medium flex items-center gap-1 ${a.status === "active" ? "text-accent" : "text-muted-foreground"}`}>
                  ● {a.status === "active" ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>

              {a.prompt && (
                <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{a.prompt}</p>
              )}

              {a.callback_number && (
                <p className="text-[11px] text-muted-foreground mb-1">📞 {a.callback_number}</p>
              )}
              {a.website_url && (
                <p className="text-[11px] text-muted-foreground mb-3 truncate">🌐 {a.website_url}</p>
              )}

              <div className="flex gap-2">
                <button onClick={() => openEdit(a)} className="flex-1 py-2.5 rounded-xl glass glass-border text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-muted transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => toggleStatus(a)} className="flex-1 py-2.5 rounded-xl gradient-green text-sm font-medium text-primary-foreground flex items-center justify-center gap-1.5">
                  {a.status === "active" ? <><Settings className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Activate</>}
                </button>
                <button onClick={() => handleDelete(a.id)} className="p-2.5 rounded-xl hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold">{editingAgent ? "Edit Agent" : "Deploy New Agent"}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Agent Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sales Bot Alpha" maxLength={100}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Logo URL</label>
                  <input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." maxLength={500}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">System Prompt / Instructions</label>
                <textarea value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} placeholder="Describe how this agent should behave..." rows={3} maxLength={4000}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
              </div>

              <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-3">
                <p className="text-xs font-medium text-accent uppercase tracking-wide">Routing — when should this agent handle a message?</p>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Description / Domain</label>
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Train ticket bookings & PNR status" maxLength={500}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                  <p className="text-xs text-muted-foreground mt-1">Used by the router (and shown in the UI) to decide which agent fits an incoming message.</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Routing Keywords</label>
                  <input value={form.routing_keywords} onChange={(e) => setForm({ ...form, routing_keywords: e.target.value })} placeholder="train, pnr, irctc, ticket (comma-separated)"
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                  <p className="text-xs text-muted-foreground mt-1">Inbound messages matching any keyword route to this agent first (before the AI router).</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Business Identity (optional, overrides account default)</label>
                  <textarea value={form.business_description} onChange={(e) => setForm({ ...form, business_description: e.target.value })} placeholder="Who this agent represents — keeps multiple agents distinct." rows={2} maxLength={2000}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                    className="w-4 h-4 rounded accent-accent" />
                  <span>Default agent — handles anything no other agent matches</span>
                </label>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Agent Kind</label>
                  <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as AgentKind })}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 appearance-none">
                    <option value="inbound">Inbound</option>
                    <option value="outbound">Outbound</option>
                    <option value="sales">Sales</option>
                    <option value="support">Support</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Tone</label>
                  <select value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value as FormState["tone"] })}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 appearance-none">
                    <option value="sales">Sales</option>
                    <option value="support">Support</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FormState["status"] })}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 appearance-none">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Support Email</label>
                  <input type="email" value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} placeholder="support@example.com" maxLength={200}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Booking Link</label>
                  <input type="url" value={form.booking_link} onChange={(e) => setForm({ ...form, booking_link: e.target.value })} placeholder="https://cal.example.com/book" maxLength={500}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Business Hours</label>
                <input value={form.business_hours} onChange={(e) => setForm({ ...form, business_hours: e.target.value })} placeholder="Mon–Fri 9:00–17:00 GMT" maxLength={200}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Price Floor</label>
                  <input type="number" inputMode="decimal" value={form.price_floor} onChange={(e) => setForm({ ...form, price_floor: e.target.value })} placeholder="e.g. 50" maxLength={50}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Price Ceiling</label>
                  <input type="number" inputMode="decimal" value={form.price_ceiling} onChange={(e) => setForm({ ...form, price_ceiling: e.target.value })} placeholder="e.g. 500" maxLength={50}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Callback Number</label>
                  <input value={form.callback_number} onChange={(e) => setForm({ ...form, callback_number: e.target.value })} placeholder="+44 7700 900000" maxLength={20}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Website URL</label>
                  <input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="https://yourstore.co.uk" maxLength={500}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">CTA Text</label>
                  <input value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} placeholder="Book an appointment" maxLength={120}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">CTA URL</label>
                  <input value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} placeholder="https://book.example.com" maxLength={500}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Social Links</label>
                <div className="grid md:grid-cols-2 gap-2">
                  {(["facebook", "instagram", "twitter", "linkedin", "tiktok", "youtube"] as const).map((k) => (
                    <input
                      key={k}
                      value={form.social_links[k] || ""}
                      onChange={setSocial(k)}
                      placeholder={`${k.charAt(0).toUpperCase() + k.slice(1)} URL`}
                      maxLength={500}
                      className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Welcome Message (sent on first contact)</label>
                <textarea value={form.welcome_message} onChange={(e) => setForm({ ...form, welcome_message: e.target.value })} placeholder="Hi! Thanks for reaching out…" rows={3} maxLength={2000}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Terms & Conditions (sent with welcome)</label>
                <textarea value={form.terms_text} onChange={(e) => setForm({ ...form, terms_text: e.target.value })} placeholder="By writing to us here, you agree to receive messages… Reply STOP to unsubscribe." rows={3} maxLength={4000}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="text-sm text-muted-foreground">Knowledge Base</label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={kbFileRef}
                      type="file"
                      accept=".txt,.md,.csv,.pdf,text/plain,text/markdown,text/csv,application/pdf"
                      className="hidden"
                      onChange={handleKnowledgeUpload}
                    />
                    <button
                      type="button"
                      disabled={kbUploading}
                      onClick={() => kbFileRef.current?.click()}
                      className="text-xs px-2.5 py-1.5 rounded-lg glass glass-border hover:bg-muted disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {kbUploading ? "Uploading..." : "Upload file / PDF"}
                    </button>
                  </div>
                </div>
                <textarea
                  value={form.knowledge_base}
                  onChange={(e) => setForm({ ...form, knowledge_base: e.target.value })}
                  placeholder="Paste FAQ content, product docs, or upload a .txt / .md / .csv / .pdf file..."
                  rows={5}
                  maxLength={KB_MAX}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  {form.knowledge_base.length}/{KB_MAX} characters · Upload extracts text and appends it here (you can still edit).
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl glass glass-border text-sm font-medium">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl gradient-green text-sm font-medium text-primary-foreground disabled:opacity-50">
                  {saving ? "Saving..." : editingAgent ? "Update Agent" : "Deploy Agent"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Agents;
