import AppLayout from "@/components/AppLayout";
import { ArrowLeft, Copy, Eye, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { templates as templatesApi, WaTemplate } from "@/lib/api";

const WA_FILTERS = [
  { value: "", label: "All Meta statuses" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under Review" },
  { value: "rejected", label: "Rejected" },
  { value: "paused", label: "Paused" },
] as const;

const WhatsAppTemplatesSettings = () => {
  const [rows, setRows] = useState<WaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [waFilter, setWaFilter] = useState("");
  const [viewing, setViewing] = useState<WaTemplate | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = useCallback(async (opts?: { refresh?: boolean }) => {
    setLoading(true);
    try {
      const list = await templatesApi.list({
        q: q || undefined,
        whatsapp_status: waFilter || undefined,
        refresh: opts?.refresh,
      });
      setRows(list);
    } catch (err) {
      toast.error("Failed to load templates", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [q, waFilter]);

  useEffect(() => {
    setPage(1);
    load();
  }, [load]);

  const filtered = useMemo(() => rows, [rows]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize) || 1);
  const safePage = Math.min(page, totalPages);
  const pagedRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const copySid = async (sid: string) => {
    try {
      await navigator.clipboard.writeText(sid);
      toast.success("Content SID copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const refreshOne = async (id: string) => {
    setBusyId(id);
    try {
      const updated = await templatesApi.refreshStatus(id);
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
      if (viewing?.id === id) setViewing(updated);
      toast.success("Status refreshed from Twilio / Meta");
    } catch (err) {
      toast.error("Refresh failed", { description: (err as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <Link
          to="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Settings
        </Link>
        <h1 className="text-3xl md:text-4xl font-display font-bold">
          WhatsApp <span className="text-gradient-green">Templates</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Meta approval status for Twilio Content Templates. Once Meta marks a template Approved,
          closed-window campaign sends use it automatically — no code change required.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, category, language…"
            className="w-full bg-muted rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <select
          value={waFilter}
          onChange={(e) => {
            setWaFilter(e.target.value);
            setPage(1);
          }}
          className="bg-muted rounded-xl px-4 py-2.5 text-sm"
        >
          {WA_FILTERS.map((f) => (
            <option key={f.value || "all"} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => load({ refresh: true })}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-green text-primary-foreground text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" /> Refresh all
        </button>
      </div>

      <div className="rounded-2xl border border-border/60 overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-border/40">
          <span className="text-sm font-medium">Templates</span>
          <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Template Name</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Language</th>
                <th className="px-4 py-3 font-medium">Content SID</th>
                <th className="px-4 py-3 font-medium">Eligibility</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No templates found. Add them under Templates, then refresh status here.
                  </td>
                </tr>
              )}
              {!loading &&
                pagedRows.map((t) => (
                  <tr key={t.id} className="border-t border-border/40">
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3">
                      {t.whatsapp_approval_emoji || ""}{" "}
                      {t.whatsapp_approval_label ||
                        (t.whatsapp_approval_status || "Unknown").replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3">{t.whatsapp_category || "—"}</td>
                    <td className="px-4 py-3">{t.language || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {t.content_sid_masked || t.content_sid}
                    </td>
                    <td className="px-4 py-3">
                      {t.whatsapp_sendable ? "Business initiated ✓" : "Not yet approved"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {t.updated_at ? new Date(t.updated_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className="p-1.5 rounded-lg glass glass-border"
                          title="View"
                          onClick={() => setViewing(t)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg glass glass-border"
                          title="Copy Content SID"
                          onClick={() => copySid(t.content_sid)}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg glass glass-border disabled:opacity-50"
                          title="Refresh Status"
                          disabled={busyId === t.id}
                          onClick={() => refreshOne(t.id)}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${busyId === t.id ? "animate-spin" : ""}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
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

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-background border border-border p-6 space-y-3">
            <h2 className="text-xl font-display font-semibold">{viewing.name}</h2>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Meta status</dt>
              <dd>
                {viewing.whatsapp_approval_emoji} {viewing.whatsapp_approval_label || viewing.whatsapp_approval_status || "—"}
              </dd>
              <dt className="text-muted-foreground">Category</dt>
              <dd>{viewing.whatsapp_category || "—"}</dd>
              <dt className="text-muted-foreground">Language</dt>
              <dd>{viewing.language || "—"}</dd>
              <dt className="text-muted-foreground">Content SID</dt>
              <dd className="font-mono text-xs break-all">{viewing.content_sid}</dd>
              <dt className="text-muted-foreground">Business initiated</dt>
              <dd>{viewing.business_initiated ? "Yes" : "No"}</dd>
              <dt className="text-muted-foreground">User initiated</dt>
              <dd>{viewing.user_initiated == null ? "—" : viewing.user_initiated ? "Yes" : "No"}</dd>
              <dt className="text-muted-foreground">Provider</dt>
              <dd>{viewing.provider || "twilio_content"}</dd>
              <dt className="text-muted-foreground">Library status</dt>
              <dd>{viewing.status}</dd>
            </dl>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl glass glass-border text-sm"
                onClick={() => setViewing(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default WhatsAppTemplatesSettings;
