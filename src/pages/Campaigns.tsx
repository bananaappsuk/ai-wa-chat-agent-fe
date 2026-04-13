import AppLayout from "@/components/AppLayout";
import { Plus, Send, TrendingUp, Search, Play, Pencil, X, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { campaigns as campaignsApi, Campaign } from "@/lib/api";

const Campaigns = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [form, setForm] = useState({ name: "", message: "", media_url: "", status: "draft", scheduled_at: "" });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const fetchCampaigns = async () => {
    try {
      const data = await campaignsApi.list();
      setCampaigns(data);
    } catch (err) {
      toast.error("Failed to load campaigns", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const openNew = () => {
    setEditingCampaign(null);
    setForm({ name: "", message: "", media_url: "", status: "draft", scheduled_at: "" });
    setShowForm(true);
  };

  const openEdit = (c: Campaign) => {
    setEditingCampaign(c);
    setForm({
      name: c.name,
      message: c.message || "",
      media_url: c.media_url || "",
      status: c.status || "draft",
      scheduled_at: c.scheduled_at ? c.scheduled_at.slice(0, 16) : "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Campaign name is required"); return; }
    if (!user) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      message: form.message.trim() || null,
      media_url: form.media_url.trim() || null,
      status: form.status,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
    };
    try {
      if (editingCampaign) {
        await campaignsApi.update(editingCampaign.id, payload);
        toast.success("Campaign updated");
      } else {
        await campaignsApi.create(payload);
        toast.success("Campaign created");
      }
      setShowForm(false);
      fetchCampaigns();
    } catch (err) {
      toast.error("Failed to save campaign", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await campaignsApi.remove(id);
      toast.success("Campaign deleted");
      fetchCampaigns();
    } catch (err) {
      toast.error("Failed to delete campaign", { description: (err as Error).message });
    }
  };

  const statusBadge = (status: string | null) => {
    const s = (status || "draft").toUpperCase();
    const color = s === "RUNNING" || s === "ACTIVE" ? "text-accent" : s === "COMPLETED" ? "text-accent" : s === "DRAFT" ? "text-muted-foreground" : "text-yellow-400";
    return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${color} bg-opacity-10 bg-current`}>{s === "RUNNING" ? "● " : ""}{s}</span>;
  };

  const filtered = campaigns.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const totalSent = campaigns.length;
  const activeCount = campaigns.filter(c => c.status === "active" || c.status === "running").length;
  const draftCount = campaigns.filter(c => c.status === "draft").length;
  const completedCount = campaigns.filter(c => c.status === "completed").length;

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">WhatsApp Campaigns</h1>
          <p className="text-muted-foreground mt-1">Automate your outreach with AI-powered conversational flows.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-5 py-2.5 rounded-full gradient-green text-sm text-primary-foreground font-medium glow-green">
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Campaigns", value: String(totalSent), icon: Send },
          { label: "Active", value: String(activeCount), icon: Play },
          { label: "Drafts", value: String(draftCount), icon: Pencil },
          { label: "Completed", value: String(completedCount), icon: TrendingUp },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <s.icon className="w-5 h-5 text-accent" />
            </div>
            <p className="text-2xl font-display font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl">
        <div className="p-5 flex items-center justify-between">
          <h2 className="text-lg font-display font-semibold">Recent Campaigns</h2>
          <div className="flex gap-2">
            <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-lg hover:bg-muted"><Search className="w-4 h-4 text-muted-foreground" /></button>
          </div>
        </div>
        {showSearch && (
          <div className="px-5 pb-3">
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search campaigns..."
              className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-muted-foreground">Loading campaigns...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            {campaigns.length === 0 ? "No campaigns yet. Create your first campaign!" : "No campaigns match your search."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((c) => (
              <div key={c.id} className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="lg:w-1/3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{c.name}</h3>
                    {statusBadge(c.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{c.message || "No message template"}</p>
                </div>
                <div className="lg:w-1/4">
                  <p className="text-xs text-muted-foreground">
                    {c.scheduled_at ? `Scheduled: ${new Date(c.scheduled_at).toLocaleDateString()}` : "Not scheduled"}
                  </p>
                </div>
                <div className="lg:w-1/4">
                  <p className="text-xs text-muted-foreground">Created {new Date(c.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 lg:w-1/6 justify-end">
                  <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold">{editingCampaign ? "Edit Campaign" : "New Campaign"}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Campaign Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Summer Product Launch" maxLength={100}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Message Template</label>
                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Write your campaign message..." rows={4} maxLength={1000}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Media URL (optional)</label>
                <input value={form.media_url} onChange={(e) => setForm({ ...form, media_url: e.target.value })} placeholder="https://..." maxLength={500}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 appearance-none">
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="running">Running</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Schedule (optional)</label>
                  <input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl glass glass-border text-sm font-medium">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl gradient-green text-sm font-medium text-primary-foreground disabled:opacity-50">
                  {saving ? "Saving..." : editingCampaign ? "Update Campaign" : "Create Campaign"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Campaigns;
