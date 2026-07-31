import AppLayout from "@/components/AppLayout";
import { Sparkles, Plus, X, Trash2, Pencil, Ban, Download, Upload, Search, UserCheck, UserX } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  leads as leadsApi,
  blacklist as blacklistApi,
  Lead,
  LeadImportResult,
  LeadListParams,
  tokenStore,
  API_BASE,
} from "@/lib/api";

const Leads = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", score: "cold", source: "", tags: "" });
  const [saving, setSaving] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterScore, setFilterScore] = useState("all");
  const [filterConsent, setFilterConsent] = useState("all");
  const [filterBlacklist, setFilterBlacklist] = useState("all");
  const [filterSource, setFilterSource] = useState("");
  const [sortBy, setSortBy] = useState("updated_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [duplicatePolicy, setDuplicatePolicy] = useState<"skip" | "update" | "fail">("skip");
  const [importResult, setImportResult] = useState<LeadImportResult | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);

  const listParams = useCallback((): LeadListParams => {
    return {
      page,
      page_size: pageSize,
      search: search || undefined,
      score: filterScore !== "all" ? filterScore : undefined,
      consent_status: filterConsent !== "all" ? filterConsent : undefined,
      blacklist_status:
        filterBlacklist === "yes" ? "true" : filterBlacklist === "no" ? "false" : undefined,
      source: filterSource.trim() || undefined,
      created_from: createdFrom ? new Date(createdFrom).toISOString() : undefined,
      created_to: createdTo ? new Date(createdTo + "T23:59:59").toISOString() : undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    };
  }, [
    page,
    pageSize,
    search,
    filterScore,
    filterConsent,
    filterBlacklist,
    filterSource,
    createdFrom,
    createdTo,
    sortBy,
    sortOrder,
  ]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const data = await leadsApi.list(listParams());
      setLeads(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
      setSelected(new Set());
    } catch (err) {
      toast.error("Failed to load leads", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [listParams]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setFilterScore("all");
    setFilterConsent("all");
    setFilterBlacklist("all");
    setFilterSource("");
    setCreatedFrom("");
    setCreatedTo("");
    setSortBy("updated_at");
    setSortOrder("desc");
    setPage(1);
  };

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
    if (!form.name.trim()) {
      toast.error("Lead name is required");
      return;
    }
    if (!user) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      score: form.score as "hot" | "warm" | "cold",
      source: form.source.trim() || null,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
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
    if (!l.phone) {
      toast.error("Lead has no phone");
      return;
    }
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

  const handleOptIn = async (l: Lead) => {
    try {
      await leadsApi.optIn(l.id, { source: "manual" });
      toast.success(`${l.name} marked opted in`);
      fetchLeads();
    } catch (err) {
      toast.error("Opt-in failed", { description: (err as Error).message });
    }
  };

  const handleOptOut = async (l: Lead) => {
    try {
      await leadsApi.optOut(l.id, { source: "manual", reason: "manual_opt_out" });
      toast.success(`${l.name} marked opted out`);
      fetchLeads();
    } catch (err) {
      toast.error("Opt-out failed", { description: (err as Error).message });
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBulk = async (action: string, value?: string) => {
    if (selected.size === 0) {
      toast.error("Select at least one lead");
      return;
    }
    setBulkBusy(true);
    try {
      const res = await leadsApi.bulkAction({
        lead_ids: Array.from(selected),
        action,
        value,
      });
      toast.success(`Bulk ${action}: ${res.affected} updated`);
      fetchLeads();
    } catch (err) {
      toast.error("Bulk action failed", { description: (err as Error).message });
    } finally {
      setBulkBusy(false);
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    try {
      const result = await leadsApi.importCsv(file, duplicatePolicy);
      setImportResult(result);
      toast.success(`Import done: ${result.created} created, ${result.updated} updated`);
      fetchLeads();
    } catch (err) {
      toast.error("Import failed", { description: (err as Error).message });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await leadsApi.exportCsv({ ...listParams(), page: undefined, page_size: undefined });
      toast.success("Export downloaded");
    } catch (err) {
      toast.error("Export failed", { description: (err as Error).message });
    } finally {
      setExporting(false);
    }
  };

  const downloadSample = async () => {
    const headers: Record<string, string> = {};
    const tok = tokenStore.get();
    if (tok) headers["Authorization"] = `Bearer ${tok}`;
    const res = await fetch(`${API_BASE}/leads/sample.csv`, { headers });
    if (!res.ok) {
      toast.error("Could not download sample");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const scoreColor = (s: string | null) => {
    if (s === "hot") return "bg-accent text-accent";
    if (s === "warm") return "bg-yellow-500 text-yellow-500";
    return "bg-muted-foreground text-muted-foreground";
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">Lead Intelligence</h1>
          <p className="text-muted-foreground mt-1">Track and score your WhatsApp leads.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={downloadSample}
            className="flex items-center gap-2 px-3 py-2 rounded-xl glass glass-border text-sm"
          >
            Sample CSV
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-3 py-2 rounded-xl glass glass-border text-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> {exporting ? "Exporting..." : "Export"}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl glass glass-border text-sm disabled:opacity-50"
          >
            <Upload className="w-4 h-4" /> {importing ? "Importing..." : "Import"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
            }}
          />
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-green text-sm text-primary-foreground font-medium"
          >
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-4 mb-6 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, phone, email, source…"
              className="w-full bg-muted rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <select
            value={filterScore}
            onChange={(e) => {
              setFilterScore(e.target.value);
              setPage(1);
            }}
            className="bg-muted rounded-xl px-3 py-2.5 text-sm"
          >
            <option value="all">All scores</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
          <select
            value={filterConsent}
            onChange={(e) => {
              setFilterConsent(e.target.value);
              setPage(1);
            }}
            className="bg-muted rounded-xl px-3 py-2.5 text-sm"
          >
            <option value="all">Consent: all</option>
            <option value="unknown">Consent: unknown</option>
            <option value="pending">Consent: pending</option>
            <option value="opted_in">Consent: opted in (filter only)</option>
            <option value="opted_out">Consent: opted out</option>
          </select>
          <select
            value={filterBlacklist}
            onChange={(e) => {
              setFilterBlacklist(e.target.value);
              setPage(1);
            }}
            className="bg-muted rounded-xl px-3 py-2.5 text-sm"
          >
            <option value="all">Blacklist: any</option>
            <option value="yes">Blacklisted</option>
            <option value="no">Not blacklisted</option>
          </select>
          <input
            value={filterSource}
            onChange={(e) => {
              setFilterSource(e.target.value);
              setPage(1);
            }}
            placeholder="Source"
            className="bg-muted rounded-xl px-3 py-2.5 text-sm w-36"
          />
        </div>
        <div className="flex flex-wrap gap-3 items-center text-sm">
          <label className="text-muted-foreground">From</label>
          <input
            type="date"
            value={createdFrom}
            onChange={(e) => {
              setCreatedFrom(e.target.value);
              setPage(1);
            }}
            className="bg-muted rounded-xl px-3 py-2 text-sm"
          />
          <label className="text-muted-foreground">To</label>
          <input
            type="date"
            value={createdTo}
            onChange={(e) => {
              setCreatedTo(e.target.value);
              setPage(1);
            }}
            className="bg-muted rounded-xl px-3 py-2 text-sm"
          />
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className="bg-muted rounded-xl px-3 py-2 text-sm"
          >
            <option value="updated_at">Updated</option>
            <option value="created_at">Created</option>
            <option value="name">Name</option>
            <option value="lead_score">Score</option>
            <option value="last_inbound_at">Last inbound</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value as "asc" | "desc");
              setPage(1);
            }}
            className="bg-muted rounded-xl px-3 py-2 text-sm"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
          <select
            value={duplicatePolicy}
            onChange={(e) => setDuplicatePolicy(e.target.value as "skip" | "update" | "fail")}
            className="bg-muted rounded-xl px-3 py-2 text-sm"
            title="Import duplicate policy"
          >
            <option value="skip">Import: skip duplicates</option>
            <option value="update">Import: update duplicates</option>
            <option value="fail">Import: fail duplicates</option>
          </select>
          <button onClick={clearFilters} className="px-3 py-2 rounded-xl glass glass-border text-sm">
            Clear filters
          </button>
        </div>
        {selected.size > 0 && (
          <div className="flex flex-wrap gap-2 items-center pt-1">
            <span className="text-xs text-muted-foreground">{selected.size} selected</span>
            <button
              disabled={bulkBusy}
              onClick={() => runBulk("pause_ai")}
              className="px-2.5 py-1.5 rounded-lg bg-muted text-xs"
            >
              Pause AI
            </button>
            <button
              disabled={bulkBusy}
              onClick={() => runBulk("resume_ai")}
              className="px-2.5 py-1.5 rounded-lg bg-muted text-xs"
            >
              Resume AI
            </button>
            <button
              disabled={bulkBusy}
              onClick={() => runBulk("mark_needs_human")}
              className="px-2.5 py-1.5 rounded-lg bg-muted text-xs"
            >
              Needs human
            </button>
            <button
              disabled={bulkBusy}
              onClick={() => runBulk("opt_out")}
              className="px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs"
            >
              Opt out
            </button>
            <button
              disabled={bulkBusy}
              onClick={() => runBulk("add_to_blacklist")}
              className="px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs"
            >
              Blacklist
            </button>
          </div>
        )}
      </div>

      {importResult && (
        <div className="bg-card rounded-2xl p-4 mb-6 text-sm space-y-2">
          <p className="font-medium">
            Import: {importResult.created} created · {importResult.updated} updated ·{" "}
            {importResult.skipped} skipped · {importResult.failed} failed (of {importResult.total_rows})
          </p>
          {importResult.errors?.length > 0 && (
            <div className="max-h-40 overflow-y-auto space-y-1 text-xs text-muted-foreground">
              {importResult.errors.map((e, i) => (
                <p key={i}>
                  Row {e.row} · {e.field}: {e.message}
                </p>
              ))}
            </div>
          )}
          <button onClick={() => setImportResult(null)} className="text-xs text-accent">
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-card rounded-2xl overflow-hidden">
        <div className="p-5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <h2 className="font-display font-semibold">Lead List</h2>
          </div>
          <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
            {total} result{total === 1 ? "" : "s"}
          </span>
        </div>

        <div className="hidden md:grid grid-cols-[auto_1.2fr_1fr_0.8fr_0.8fr_1fr_auto] gap-2 px-5 py-3 text-xs text-muted-foreground uppercase tracking-wider bg-muted/50">
          <span />
          <span>Name</span>
          <span>Phone</span>
          <span>Score</span>
          <span>Consent</span>
          <span>Source</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-muted-foreground">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            No leads match these filters. Try clearing filters or add a lead.
          </div>
        ) : (
          leads.map((lead) => (
            <div
              key={lead.id}
              className={`grid grid-cols-1 md:grid-cols-[auto_1.2fr_1fr_0.8fr_0.8fr_1fr_auto] gap-2 md:gap-2 items-center px-5 py-4 border-t border-border ${
                lead.blacklisted ? "opacity-50" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(lead.id)}
                onChange={() => toggleSelect(lead.id)}
                className="rounded"
              />
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold">
                    {lead.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                </div>
                <p className="font-medium text-sm truncate">{lead.name}</p>
              </div>
              <p className="text-sm text-muted-foreground">{lead.phone || "—"}</p>
              <div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${scoreColor(lead.score)} bg-opacity-10`}
                >
                  {(lead.score || "cold").toUpperCase()}
                  {typeof lead.lead_score === "number" ? ` · ${lead.lead_score}` : ""}
                </span>
              </div>
              <p className="text-xs text-muted-foreground capitalize">
                {(lead.whatsapp_consent_status || "unknown").replace(/_/g, " ")}
              </p>
              <p className="text-sm text-muted-foreground truncate">{lead.source || "—"}</p>
              <div className="flex items-center gap-1">
                {(lead.whatsapp_consent_status || "unknown") !== "opted_in" ? (
                  <button
                    onClick={() => handleOptIn(lead)}
                    className="p-2 rounded-lg hover:bg-accent/10"
                    title="Opt in for WhatsApp marketing"
                  >
                    <UserCheck className="w-4 h-4 text-accent" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleOptOut(lead)}
                    className="p-2 rounded-lg hover:bg-muted"
                    title="Opt out"
                  >
                    <UserX className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
                <button onClick={() => openEdit(lead)} className="p-2 rounded-lg hover:bg-muted">
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => handleBlacklist(lead)}
                  className="p-2 rounded-lg hover:bg-muted"
                  title={lead.blacklisted ? "Unblock" : "Unsubscribe"}
                >
                  <Ban
                    className={`w-4 h-4 ${lead.blacklisted ? "text-yellow-400" : "text-muted-foreground"}`}
                  />
                </button>
                <button onClick={() => handleDelete(lead.id)} className="p-2 rounded-lg hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          ))
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
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-muted text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {Math.max(totalPages, 1)}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
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
              <h2 className="text-xl font-display font-bold">{editingLead ? "Edit Lead" : "Add New Lead"}</h2>
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
                  placeholder="Lead name"
                  maxLength={100}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+44 7700 900000"
                  maxLength={20}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Score</label>
                  <select
                    value={form.score}
                    onChange={(e) => setForm({ ...form, score: e.target.value })}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    <option value="hot">Hot</option>
                    <option value="warm">Warm</option>
                    <option value="cold">Cold</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Source</label>
                  <input
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    placeholder="e.g. WhatsApp, Website"
                    maxLength={100}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Tags (comma-separated)</label>
                <input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="e.g. pricing, enterprise, demo"
                  maxLength={200}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 rounded-xl glass glass-border text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl gradient-green text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
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
