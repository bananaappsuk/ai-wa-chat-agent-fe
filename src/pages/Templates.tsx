import AppLayout from "@/components/AppLayout";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { templates as templatesApi, TemplateStatus, WaTemplate } from "@/lib/api";

const STATUSES: TemplateStatus[] = ["draft", "pending", "approved", "rejected"];

const emptyForm = {
  name: "",
  content_sid: "",
  language: "en",
  status: "draft" as TemplateStatus,
  variables: "",
};

const Templates = () => {
  const [items, setItems] = useState<WaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WaTemplate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await templatesApi.list());
    } catch (err) {
      toast.error("Failed to load templates", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (t: WaTemplate) => {
    setEditing(t);
    setForm({
      name: t.name,
      content_sid: t.content_sid,
      language: t.language || "en",
      status: t.status,
      variables: (t.variables || []).join(", "),
    });
    setShowForm(true);
  };

  const parseVariables = (raw: string) =>
    raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

  const handleSave = async () => {
    if (!form.name.trim() || !form.content_sid.trim()) {
      toast.error("Name and Content SID are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        content_sid: form.content_sid.trim(),
        language: form.language.trim() || "en",
        status: form.status,
        variables: parseVariables(form.variables),
      };
      if (editing) {
        await templatesApi.update(editing.id, payload);
        toast.success("Template updated");
      } else {
        await templatesApi.create(payload);
        toast.success("Template created");
      }
      setShowForm(false);
      await load();
    } catch (err) {
      toast.error("Save failed", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: WaTemplate) => {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    try {
      await templatesApi.remove(t.id);
      toast.success("Template deleted");
      await load();
    } catch (err) {
      toast.error("Delete failed", { description: (err as Error).message });
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">
            WhatsApp <span className="text-gradient-green">Templates</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Store Twilio Content SIDs for messages outside the 24-hour window.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-green text-primary-foreground text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      <div className="bg-card rounded-2xl overflow-hidden">
        {loading ? (
          <p className="p-8 text-sm text-muted-foreground">Loading...</p>
        ) : items.length === 0 ? (
          <p className="p-8 text-sm text-muted-foreground">No templates yet. Create one with a Twilio Content SID.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Content SID</th>
                  <th className="px-4 py-3 font-medium">Language</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Variables</th>
                  <th className="px-4 py-3 font-medium w-24"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id} className="border-b border-border/60">
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{t.content_sid}</td>
                    <td className="px-4 py-3">{t.language}</td>
                    <td className="px-4 py-3 capitalize">{t.status}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {(t.variables || []).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-muted" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(t)} className="p-1.5 rounded-lg hover:bg-muted text-destructive" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold">{editing ? "Edit Template" : "New Template"}</h2>
              <button onClick={() => setShowForm(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Twilio Content SID *</label>
                <input
                  value={form.content_sid}
                  onChange={(e) => setForm({ ...form, content_sid: e.target.value })}
                  placeholder="HXxxxxxxxx"
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Language</label>
                  <input
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as TemplateStatus })}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Variables (comma-separated keys)</label>
                <input
                  value={form.variables}
                  onChange={(e) => setForm({ ...form, variables: e.target.value })}
                  placeholder="1, 2, name"
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl glass glass-border text-sm font-medium">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl gradient-green text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Templates;
