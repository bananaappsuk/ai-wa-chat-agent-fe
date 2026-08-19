import AppLayout from "@/components/AppLayout";
import { Plus, Pencil, Trash2, X, RefreshCw, Copy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

const metaLabel = (t: WaTemplate) => {
  const emoji = t.whatsapp_approval_emoji || "";
  const label =
    t.whatsapp_approval_label ||
    (t.whatsapp_approval_status || "").replace(/_/g, " ") ||
    "Not checked";
  if (!t.whatsapp_approval_status) {
    return "⚪ Not checked — click Refresh Meta";
  }
  return `${emoji} ${label}`.trim();
};

const Templates = () => {
  const [items, setItems] = useState<WaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WaTemplate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = useCallback(async (opts?: { refreshMeta?: boolean }) => {
    try {
      if (opts?.refreshMeta) setRefreshing(true);
      else setLoading(true);
      setItems(await templatesApi.list({ refresh: !!opts?.refreshMeta }));
      if (opts?.refreshMeta) toast.success("Meta approval status refreshed from Twilio");
    } catch (err) {
      toast.error("Failed to load templates", { description: (err as Error).message });
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      await load({ refreshMeta: true });
    } catch (err) {
      toast.error("Save failed", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncMeta = async () => {
    setSyncingMeta(true);
    try {
      const result = await templatesApi.syncMeta();
      toast.success(`Synced ${result.synced} Meta template${result.synced === 1 ? "" : "s"}`);
      await load();
    } catch (err) {
      toast.error("Meta sync failed", { description: (err as Error).message });
    } finally {
      setSyncingMeta(false);
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

  const refreshOne = async (t: WaTemplate) => {
    setBusyId(t.id);
    try {
      const updated = await templatesApi.refreshStatus(t.id);
      setItems((prev) => prev.map((row) => (row.id === t.id ? updated : row)));
      toast.success(
        `${t.name}: ${updated.whatsapp_approval_emoji || ""} ${updated.whatsapp_approval_label || updated.whatsapp_approval_status || "updated"}`,
      );
    } catch (err) {
      toast.error("Refresh Meta status failed", { description: (err as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  const copySid = async (sid: string) => {
    try {
      await navigator.clipboard.writeText(sid);
      toast.success("Content SID copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize) || 1);
  const safePage = Math.min(page, totalPages);
  const pagedItems = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">
            WhatsApp <span className="text-gradient-green">Templates</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Library status is yours. <strong className="text-foreground font-medium">Meta status</strong> comes from
            Twilio / WhatsApp and controls closed-window campaign sends.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSyncMeta}
            disabled={syncingMeta || refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass glass-border text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncingMeta ? "animate-spin" : ""}`} />
            Sync from Meta
          </button>
          <button
            type="button"
            onClick={() => load({ refreshMeta: true })}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass glass-border text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Meta status
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-green text-primary-foreground text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> New Template
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm">
        Looking for filters / full Meta details? Also available under{" "}
        <Link to="/settings/whatsapp-templates" className="text-accent underline underline-offset-2">
          Settings → WhatsApp Templates
        </Link>
        .
      </div>

      <div className="bg-card rounded-2xl overflow-hidden">
        <div className="p-5 flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-display font-semibold">Template List</h2>
          <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
            {items.length} result{items.length === 1 ? "" : "s"}
          </span>
        </div>
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
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 font-medium">Meta status</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Content SID</th>
                  <th className="px-4 py-3 font-medium">Library</th>
                  <th className="px-4 py-3 font-medium">Language</th>
                  <th className="px-4 py-3 font-medium w-36"></th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((t) => (
                  <tr key={t.id} className="border-b border-border/60">
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3 text-xs">
                      {(t.provider || "twilio_content") === "meta" ? "Meta" : "Twilio"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{metaLabel(t)}</td>
                    <td className="px-4 py-3">{t.whatsapp_category || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {(t.provider || "") === "meta"
                        ? "—"
                        : t.content_sid_masked || t.content_sid || "—"}
                    </td>
                    <td className="px-4 py-3 capitalize">{t.status}</td>
                    <td className="px-4 py-3">{t.meta_language_code || t.language}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 justify-end">
                        {(t.provider || "") !== "meta" && (
                          <>
                        <button
                          onClick={() => refreshOne(t)}
                          disabled={busyId === t.id}
                          className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-50"
                          title="Refresh Meta status"
                        >
                          <RefreshCw className={`w-4 h-4 ${busyId === t.id ? "animate-spin" : ""}`} />
                        </button>
                        <button
                          onClick={() => copySid(t.content_sid)}
                          className="p-1.5 rounded-lg hover:bg-muted"
                          title="Copy Content SID"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-muted" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(t)}
                          className="p-1.5 rounded-lg hover:bg-muted text-destructive"
                          title="Delete"
                        >
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
                  <label className="text-sm text-muted-foreground mb-1.5 block">Library status</label>
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
