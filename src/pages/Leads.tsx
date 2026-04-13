import AppLayout from "@/components/AppLayout";
import { Sparkles, Plus, X, Trash2, Pencil, Ban } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { leads as leadsApi, blacklist as blacklistApi, Lead } from "@/lib/api";

const Leads = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", score: "cold", source: "", tags: "" });
  const [saving, setSaving] = useState(false);
  const [filterScore, setFilterScore] = useState<string>("all");

  const fetchLeads = async () => {
    try {
      const data = await leadsApi.list();
      setLeads(data);
    } catch (err) {
      toast.error("Failed to load leads", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, []);

  const openNew = () => {
    setEditingLead(null);
    setForm({ name: "", phone: "", score: "cold", source: "", tags: "" });
    setShowForm(true);
  };

  const openEdit = (l: Lead) => {
    setEditingLead(l);
    setForm({
      name: l.name,
      phone: l.phone || "",
      score: l.score || "cold",
      source: l.source || "",
      tags: (l.tags || []).join(", "),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Lead name is required"); return; }
    if (!user) return;
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      score: form.score as "hot" | "warm" | "cold",
      source: form.source.trim() || null,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
    };

    try {
      if (editingLead) {
        await leadsApi.update(editingLead.id, payload);
        toast.success("Lead updated");
      } else {
        await leadsApi.create(payload);
        toast.success("Lead added");
      }
      setShowForm(false);
      fetchLeads();
    } catch (err) {
      toast.error("Failed to save lead", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await leadsApi.remove(id);
      toast.success("Lead deleted");
      fetchLeads();
    } catch (err) {
      toast.error("Failed to delete lead", { description: (err as Error).message });
    }
  };

  const handleBlacklist = async (l: Lead) => {
    if (!l.phone) { toast.error("Lead has no phone"); return; }
    try {
      if (l.blacklisted) {
        await blacklistApi.remove(l.phone);
        toast.success("Removed from blacklist");
      } else {
        await blacklistApi.add(l.phone);
        toast.success("Added to blacklist (unsubscribed)");
      }
      fetchLeads();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const filtered = filterScore === "all" ? leads : leads.filter(l => l.score === filterScore);
  const hotCount = leads.filter(l => l.score === "hot").length;
  const warmCount = leads.filter(l => l.score === "warm").length;
  const coldCount = leads.filter(l => l.score === "cold").length;

  const scoreColor = (s: string | null) => {
    if (s === "hot") return "bg-accent text-accent";
    if (s === "warm") return "bg-yellow-500 text-yellow-500";
    return "bg-muted-foreground text-muted-foreground";
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">Lead Intelligence</h1>
          <p className="text-muted-foreground mt-1">Track and score your WhatsApp leads.</p>
        </div>
        <div className="flex gap-3">
          <select value={filterScore} onChange={(e) => setFilterScore(e.target.value)}
            className="bg-muted rounded-xl px-4 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-accent/30">
            <option value="all">All Scores</option>
            <option value="hot">🔥 Hot</option>
            <option value="warm">🌤 Warm</option>
            <option value="cold">❄️ Cold</option>
          </select>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-green text-sm text-primary-foreground font-medium">
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Hot Leads", value: hotCount, emoji: "🔥", color: "border-accent" },
          { label: "Warm Leads", value: warmCount, emoji: "🌤", color: "border-yellow-500" },
          { label: "Cold Leads", value: coldCount, emoji: "❄️", color: "border-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className={`bg-card rounded-2xl p-5 border-l-2 ${s.color}`}>
            <p className="text-sm text-muted-foreground">{s.emoji} {s.label}</p>
            <p className="text-3xl font-display font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl overflow-hidden">
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <h2 className="font-display font-semibold">Lead List</h2>
          </div>
          <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">{leads.length} TOTAL</span>
        </div>

        <div className="hidden md:grid grid-cols-7 px-5 py-3 text-xs text-muted-foreground uppercase tracking-wider bg-muted/50">
          <span>Name</span>
          <span>Phone</span>
          <span>Score</span>
          <span>Source</span>
          <span className="col-span-2">Tags</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-muted-foreground">Loading leads...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            {leads.length === 0 ? "No leads yet. Add your first lead!" : "No leads match this filter."}
          </div>
        ) : (
          filtered.map((lead) => (
            <div key={lead.id} className={`grid grid-cols-1 md:grid-cols-7 gap-3 md:gap-0 items-center px-5 py-4 border-t border-border ${lead.blacklisted ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold">{lead.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</span>
                </div>
                <p className="font-medium text-sm truncate">{lead.name}</p>
              </div>
              <p className="text-sm text-muted-foreground">{lead.phone || "—"}</p>
              <div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${scoreColor(lead.score)} bg-opacity-10`}>
                  {(lead.score || "cold").toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{lead.source || "—"}</p>
              <div className="col-span-2 flex flex-wrap gap-1.5">
                {(lead.tags || []).map((t) => (
                  <span key={t} className="px-2 py-1 rounded-md bg-muted text-[10px] font-medium uppercase">{t}</span>
                ))}
                {lead.blacklisted && <span className="px-2 py-1 rounded-md bg-destructive/10 text-destructive text-[10px] font-medium uppercase">UNSUBSCRIBED</span>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(lead)} className="p-2 rounded-lg hover:bg-muted">
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
                <button onClick={() => handleBlacklist(lead)} className="p-2 rounded-lg hover:bg-muted" title={lead.blacklisted ? "Unblock" : "Unsubscribe"}>
                  <Ban className={`w-4 h-4 ${lead.blacklisted ? "text-yellow-400" : "text-muted-foreground"}`} />
                </button>
                <button onClick={() => handleDelete(lead.id)} className="p-2 rounded-lg hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold">{editingLead ? "Edit Lead" : "Add New Lead"}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Lead name" maxLength={100}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+44 7700 900000" maxLength={20}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Score</label>
                  <select value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-accent/30">
                    <option value="hot">🔥 Hot</option>
                    <option value="warm">🌤 Warm</option>
                    <option value="cold">❄️ Cold</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Source</label>
                  <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. WhatsApp, Website" maxLength={100}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Tags (comma-separated)</label>
                <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. pricing, enterprise, demo" maxLength={200}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl glass glass-border text-sm font-medium">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl gradient-green text-sm font-medium text-primary-foreground disabled:opacity-50">
                  {saving ? "Saving..." : editingLead ? "Update Lead" : "Add Lead"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Leads;
