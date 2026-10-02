import AppLayout from "@/components/AppLayout";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileText,
  Globe,
  Loader2,
  Network,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  Type,
  Upload,
  X,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  knowledgeBases as kbApi,
  KnowledgeBase,
  KbDocument,
  KbGap,
  KbSource,
  KbSourceStatus,
  KbSourceType,
  KbTestResult,
} from "@/lib/api";

const INPUT = "w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30";
const FILE_ACCEPT = ".pdf,.docx,.txt,.md,.csv,.tsv,.xlsx,.html,.htm,.pptx";

const TYPE_META: Record<KbSourceType, { label: string; icon: typeof Globe }> = {
  url: { label: "Web page", icon: Globe },
  crawl: { label: "Website crawl", icon: Network },
  file: { label: "File", icon: FileText },
  text: { label: "Text", icon: Type },
};

const STATUS_META: Record<KbSourceStatus, { label: string; cls: string }> = {
  queued: { label: "Queued", cls: "bg-muted text-muted-foreground" },
  processing: { label: "Processing", cls: "bg-accent/10 text-accent" },
  ready: { label: "Ready", cls: "bg-accent/15 text-accent" },
  partial: { label: "Partial", cls: "bg-yellow-500/15 text-yellow-500" },
  failed: { label: "Failed", cls: "bg-destructive/15 text-destructive" },
};

function ago(iso?: string | null): string {
  if (!iso) return "—";
  // API timestamps are UTC; treat any without an offset as UTC rather than local time.
  const utc = /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`;
  const s = Math.max(0, (Date.now() - new Date(utc).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const isBusy = (s: KbSource) => s.status === "queued" || s.status === "processing";

function errMsg(err: unknown): string {
  return (err as Error)?.message || "Something went wrong";
}

// --- Add source dialog ---------------------------------------------------------------------

type AddTab = "url" | "crawl" | "file" | "text";

function AddSourceDialog({ kb, onClose, onAdded }: { kb: KnowledgeBase; onClose: () => void; onAdded: () => void }) {
  const [tab, setTab] = useState<AddTab>("crawl");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [maxPages, setMaxPages] = useState(50);
  const [maxDepth, setMaxDepth] = useState(3);
  const [include, setInclude] = useState("");
  const [exclude, setExclude] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const split = (v: string) => v.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);

  const submit = async () => {
    setSaving(true);
    try {
      if (tab === "file") {
        if (!file) throw new Error("Choose a file to upload");
        await kbApi.uploadSource(kb.id, file, title.trim() || undefined);
      } else if (tab === "text") {
        await kbApi.addSource(kb.id, { type: "text", title: title.trim() || undefined, content });
      } else if (tab === "url") {
        await kbApi.addSource(kb.id, { type: "url", url: url.trim(), title: title.trim() || undefined });
      } else {
        await kbApi.addSource(kb.id, {
          type: "crawl",
          url: url.trim(),
          title: title.trim() || undefined,
          crawl: { max_pages: maxPages, max_depth: maxDepth, include_paths: split(include), exclude_paths: split(exclude) },
        });
      }
      toast.success("Source added — indexing in the background");
      onAdded();
      onClose();
    } catch (err) {
      toast.error("Couldn't add source", { description: errMsg(err) });
    } finally {
      setSaving(false);
    }
  };

  const tabs: { key: AddTab; label: string; icon: typeof Globe }[] = [
    { key: "crawl", label: "Crawl website", icon: Network },
    { key: "url", label: "Single page", icon: Globe },
    { key: "file", label: "Upload file", icon: Upload },
    { key: "text", label: "Text", icon: Type },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-display font-bold">Add knowledge</h2>
          <button onClick={onClose} aria-label="Close"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-medium transition-colors ${
                tab === t.key ? "bg-accent/15 text-accent ring-1 ring-accent/40" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {(tab === "url" || tab === "crawl") && (
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">{tab === "crawl" ? "Start URL *" : "Page URL *"}</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourbusiness.com/" className={INPUT} />
              <p className="text-xs text-muted-foreground mt-1">
                Normal HTML sites only — pages built with JavaScript (empty until the browser runs scripts) can't be read; upload their content as files or text instead.
              </p>
            </div>
          )}

          {tab === "crawl" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Max pages</label>
                  <input type="number" min={1} max={200} value={maxPages} onChange={(e) => setMaxPages(Math.max(1, Math.min(200, Number(e.target.value) || 1)))} className={INPUT} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Link depth</label>
                  <input type="number" min={0} max={5} value={maxDepth} onChange={(e) => setMaxDepth(Math.max(0, Math.min(5, Number(e.target.value) || 0)))} className={INPUT} />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Only these paths (optional)</label>
                <input value={include} onChange={(e) => setInclude(e.target.value)} placeholder="/courses, /faq" className={INPUT} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Skip these paths (optional)</label>
                <input value={exclude} onChange={(e) => setExclude(e.target.value)} placeholder="/blog, /privacy, /careers/*" className={INPUT} />
                <p className="text-xs text-muted-foreground mt-1">Stays on the same site, follows robots.txt and sitemaps, and refreshes daily if auto-refresh is on.</p>
              </div>
            </>
          )}

          {tab === "file" && (
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">File *</label>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/30 rounded-xl py-8 cursor-pointer hover:border-accent/50 transition-colors">
                <Upload className="w-6 h-6 text-accent" />
                <span className="text-sm">{file ? file.name : "Choose a file"}</span>
                <span className="text-xs text-muted-foreground">PDF, Word, Excel, PowerPoint, CSV, TXT, Markdown, HTML · up to 20 MB</span>
                <input type="file" accept={FILE_ACCEPT} className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          )}

          {tab === "text" && (
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Content *</label>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} maxLength={100000} placeholder="FAQs, prices, policies, opening hours…" className={`${INPUT} resize-y`} />
              <p className="text-xs text-muted-foreground mt-1">{content.length.toLocaleString()} / 100,000 characters</p>
            </div>
          )}

          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Name (optional)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Shown in your source list" className={INPUT} />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-5 py-2.5 rounded-full glass glass-border text-sm">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-full gradient-green text-sm text-primary-foreground font-medium disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Add source
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Pages (documents) dialog ---------------------------------------------------------------

function PagesDialog({ kb, source, onClose }: { kb: KnowledgeBase; source: KbSource; onClose: () => void }) {
  const [docs, setDocs] = useState<KbDocument[] | null>(null);
  useEffect(() => {
    kbApi.documents(kb.id, source.id).then(setDocs).catch((err) => {
      toast.error("Couldn't load pages", { description: errMsg(err) });
      setDocs([]);
    });
  }, [kb.id, source.id]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold truncate pr-4">{source.title || source.url}</h2>
          <button onClick={onClose} aria-label="Close"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        {docs === null ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No pages indexed yet.</p>
        ) : (
          <div className="divide-y divide-muted">
            {docs.map((d) => (
              <div key={d.id} className="py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.title || d.url || d.key}</p>
                  {d.url && (
                    <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-accent truncate block hover:underline">{d.url}</a>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{d.chunk_count} chunks · {d.chars.toLocaleString()} chars</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Test playground ------------------------------------------------------------------------

function TestPanel({ kb }: { kb: KnowledgeBase }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<KbTestResult | null>(null);
  const ask = async () => {
    if (!q.trim()) return;
    setBusy(true);
    try {
      setRes(await kbApi.test(kb.id, q.trim(), true));
    } catch (err) {
      toast.error("Test failed", { description: errMsg(err) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="bg-card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Search className="w-4 h-4 text-accent" />
        <h3 className="font-semibold">Test your knowledge base</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Ask what a customer would ask. See which pieces of knowledge are found, their relevance, and the answer the AI would give.</p>
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder="e.g. How much is the weekend workshop?" className={INPUT} />
        <button onClick={ask} disabled={busy || !q.trim()} className="px-5 rounded-xl gradient-green text-sm text-primary-foreground font-medium disabled:opacity-60 flex items-center gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ask"}
        </button>
      </div>
      {res && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl bg-accent/5 border border-accent/20 p-4">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-accent mb-1.5">AI answer</p>
            <p className="text-sm whitespace-pre-wrap">{res.answer || "No answer generated."}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
              Matches · threshold {res.threshold.toFixed(2)} · up to {res.chunks_to_retrieve} used
            </p>
            {res.results.length === 0 && <p className="text-sm text-muted-foreground">Nothing in this knowledge base yet.</p>}
            <div className="space-y-2">
              {res.results.map((r) => (
                <div key={r.chunk_id} className={`rounded-xl p-3 border ${r.used ? "border-accent/30 bg-muted" : "border-muted opacity-60"}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-1.5 w-20 rounded-full bg-background overflow-hidden">
                      <div className={`h-full ${r.used ? "bg-accent" : "bg-muted-foreground/50"}`} style={{ width: `${Math.round(r.score * 100)}%` }} />
                    </div>
                    <span className="text-xs font-mono">{r.score.toFixed(3)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.used ? "bg-accent/15 text-accent" : "bg-background text-muted-foreground"}`}>
                      {r.used ? "used" : "below threshold"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">{[r.title, r.heading].filter(Boolean).join(" — ")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Settings dialog ------------------------------------------------------------------------

function SettingsDialog({ kb, onClose, onSaved, onDeleted }: { kb: KnowledgeBase; onClose: () => void; onSaved: (kb: KnowledgeBase) => void; onDeleted: () => void }) {
  const [name, setName] = useState(kb.name);
  const [description, setDescription] = useState(kb.description || "");
  const [k, setK] = useState(kb.chunks_to_retrieve);
  const [threshold, setThreshold] = useState(kb.similarity_threshold);
  const [auto, setAuto] = useState(kb.auto_refresh);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const updated = await kbApi.update(kb.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        chunks_to_retrieve: k,
        similarity_threshold: threshold,
        auto_refresh: auto,
      });
      toast.success("Settings saved");
      onSaved(updated);
      onClose();
    } catch (err) {
      toast.error("Couldn't save", { description: errMsg(err) });
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!window.confirm(`Delete "${kb.name}" and everything in it? Agents using it will stop using it.`)) return;
    try {
      await kbApi.remove(kb.id);
      toast.success("Knowledge base deleted");
      onDeleted();
    } catch (err) {
      toast.error("Couldn't delete", { description: errMsg(err) });
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-display font-bold">Knowledge base settings</h2>
          <button onClick={onClose} aria-label="Close"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className={INPUT} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} placeholder="What this knowledge covers" className={INPUT} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 flex justify-between"><span>Pieces of knowledge per reply</span><span className="font-mono text-foreground">{k}</span></label>
            <input type="range" min={1} max={10} value={k} onChange={(e) => setK(Number(e.target.value))} className="w-full accent-accent" />
            <p className="text-xs text-muted-foreground">More gives the AI more context but longer prompts. 3 is a good default.</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 flex justify-between"><span>Relevance threshold</span><span className="font-mono text-foreground">{threshold.toFixed(2)}</span></label>
            <input type="range" min={0.5} max={0.95} step={0.01} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-full accent-accent" />
            <p className="text-xs text-muted-foreground">Higher = stricter: fewer but more relevant matches. Use the test panel to tune it.</p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="w-4 h-4 rounded accent-accent" />
            <span>Auto-refresh websites every 24 hours</span>
          </label>
        </div>
        <div className="flex items-center justify-between mt-6">
          <button onClick={remove} className="flex items-center gap-1.5 text-sm text-destructive hover:underline"><Trash2 className="w-4 h-4" /> Delete</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-5 py-2.5 rounded-full glass glass-border text-sm">Cancel</button>
            <button onClick={save} disabled={saving || !name.trim()} className="flex items-center gap-2 px-5 py-2.5 rounded-full gradient-green text-sm text-primary-foreground font-medium disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- KB detail ------------------------------------------------------------------------------

function KbDetail({ kb, onBack, onChanged }: { kb: KnowledgeBase; onBack: () => void; onChanged: (kb?: KnowledgeBase) => void }) {
  const [sources, setSources] = useState<KbSource[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [settings, setSettings] = useState(false);
  const [pagesOf, setPagesOf] = useState<KbSource | null>(null);
  const timer = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await kbApi.sources(kb.id);
      setSources(list);
      return list;
    } catch (err) {
      toast.error("Couldn't load sources", { description: errMsg(err) });
      setSources([]);
      return [];
    }
  }, [kb.id]);

  // Poll while anything is indexing.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const list = await load();
      if (!alive) return;
      if (list.some(isBusy)) {
        timer.current = window.setTimeout(tick, 3000);
      } else {
        onChanged();
      }
    };
    tick();
    return () => {
      alive = false;
      if (timer.current) window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kb.id]);

  const refreshSoon = () => {
    if (timer.current) window.clearTimeout(timer.current);
    const tick = async () => {
      const list = await load();
      if (list.some(isBusy)) timer.current = window.setTimeout(tick, 3000);
      else onChanged();
    };
    tick();
  };

  const resync = async (s: KbSource) => {
    try {
      await kbApi.resync(kb.id, s.id);
      toast.success("Re-syncing");
      refreshSoon();
    } catch (err) {
      toast.error("Couldn't re-sync", { description: errMsg(err) });
    }
  };
  const remove = async (s: KbSource) => {
    if (!window.confirm(`Remove "${s.title || s.url}" from this knowledge base?`)) return;
    try {
      await kbApi.removeSource(kb.id, s.id);
      toast.success("Source removed");
      refreshSoon();
    } catch (err) {
      toast.error("Couldn't remove", { description: errMsg(err) });
    }
  };

  return (
    <>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> All knowledge bases
      </button>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-display font-bold truncate">{kb.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {kb.description ? `${kb.description} · ` : ""}
            {kb.chunk_count.toLocaleString()} chunks · {kb.chunks_to_retrieve} per reply · threshold {kb.similarity_threshold.toFixed(2)}
            {kb.auto_refresh ? " · auto-refresh on" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSettings(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-full glass glass-border text-sm"><Settings className="w-4 h-4" /> Settings</button>
          <button onClick={() => setAdding(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-full gradient-green text-sm text-primary-foreground font-medium glow-green"><Plus className="w-4 h-4" /> Add knowledge</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-card rounded-2xl p-5">
          <h3 className="font-semibold mb-4">Sources</h3>
          {sources === null ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
          ) : sources.length === 0 ? (
            <div className="text-center py-10">
              <BookOpen className="w-8 h-8 text-accent mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No knowledge yet. Crawl your website, upload documents, or paste text.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sources.map((s) => {
                const meta = TYPE_META[s.type];
                const st = STATUS_META[s.status] || STATUS_META.queued;
                return (
                  <div key={s.id} className="rounded-xl bg-muted/60 p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center shrink-0"><meta.icon className="w-4 h-4 text-accent" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.title || s.url || s.filename}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {meta.label}
                          {s.url && s.title !== s.url ? ` · ${s.url}` : ""}
                          {` · ${s.stats?.pages ?? 0} ${s.type === "crawl" || s.type === "url" ? "pages" : "docs"} · ${s.stats?.chunks ?? 0} chunks · synced ${ago(s.last_synced_at)}`}
                        </p>
                      </div>
                      <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium flex items-center gap-1 whitespace-nowrap ${st.cls}`}>
                        {isBusy(s) && <Loader2 className="w-3 h-3 animate-spin" />}
                        {s.status === "ready" && <CheckCircle2 className="w-3 h-3" />}
                        {st.label}
                      </span>
                    </div>
                    {s.status === "processing" && s.type === "crawl" && (s.stats?.fetched ?? 0) > 0 && (
                      <p className="text-xs text-muted-foreground mt-2 ml-12">Crawled {s.stats?.fetched} pages so far…</p>
                    )}
                    {s.error && (
                      <p className="text-xs text-destructive mt-2 ml-12 flex items-start gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{s.error}</p>
                    )}
                    <div className="flex gap-1 mt-2 ml-12">
                      {(s.type === "crawl" || s.type === "url") && (
                        <button onClick={() => setPagesOf(s)} className="text-xs px-2.5 py-1 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground">View pages</button>
                      )}
                      <button onClick={() => resync(s)} disabled={isBusy(s)} className="text-xs px-2.5 py-1 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground flex items-center gap-1 disabled:opacity-40">
                        <RefreshCw className="w-3 h-3" /> Re-sync
                      </button>
                      <button onClick={() => remove(s)} className="text-xs px-2.5 py-1 rounded-lg hover:bg-destructive/10 text-destructive flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="lg:col-span-2">
          <TestPanel kb={kb} />
        </div>
      </div>

      {adding && <AddSourceDialog kb={kb} onClose={() => setAdding(false)} onAdded={refreshSoon} />}
      {pagesOf && <PagesDialog kb={kb} source={pagesOf} onClose={() => setPagesOf(null)} />}
      {settings && (
        <SettingsDialog kb={kb} onClose={() => setSettings(false)} onSaved={(u) => onChanged(u)} onDeleted={onBack} />
      )}
    </>
  );
}

// --- Page -----------------------------------------------------------------------------------

export default function Knowledge() {
  const [kbs, setKbs] = useState<KnowledgeBase[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"kbs" | "gaps">("kbs");
  const [gaps, setGaps] = useState<KbGap[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const loadKbs = useCallback(async () => {
    try {
      setKbs(await kbApi.list());
    } catch (err) {
      toast.error("Couldn't load knowledge bases", { description: errMsg(err) });
      setKbs([]);
    }
  }, []);

  useEffect(() => {
    loadKbs();
  }, [loadKbs]);

  useEffect(() => {
    if (tab === "gaps" && gaps === null) {
      kbApi.gaps(100).then(setGaps).catch(() => setGaps([]));
    }
  }, [tab, gaps]);

  const create = async () => {
    try {
      const kb = await kbApi.create({ name: newName.trim(), description: newDesc.trim() || undefined });
      toast.success("Knowledge base created");
      setCreating(false);
      setNewName("");
      setNewDesc("");
      await loadKbs();
      setSelected(kb.id);
    } catch (err) {
      toast.error("Couldn't create knowledge base", { description: errMsg(err) });
    }
  };

  const current = kbs?.find((k) => k.id === selected) || null;

  if (current) {
    return (
      <AppLayout>
        <KbDetail
          kb={current}
          onBack={() => {
            setSelected(null);
            loadKbs();
          }}
          onChanged={(updated) => {
            if (updated) setKbs((list) => (list || []).map((k) => (k.id === updated.id ? { ...k, ...updated } : k)));
            else loadKbs();
          }}
        />
      </AppLayout>
    );
  }

  const totals = (kbs || []).reduce(
    (a, k) => ({ sources: a.sources + k.source_count, chunks: a.chunks + k.chunk_count, busy: a.busy + k.processing_count }),
    { sources: 0, chunks: 0, busy: 0 },
  );

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">
            Knowledge <span className="text-gradient-green">Base</span>
          </h1>
          <p className="text-muted-foreground mt-1">What your agents know — websites, documents and notes they answer from.</p>
        </div>
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-full gradient-green text-sm text-primary-foreground font-medium glow-green">
          <Plus className="w-4 h-4" /> New knowledge base
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "KNOWLEDGE BASES", value: String(kbs?.length ?? 0) },
          { label: "SOURCES", value: String(totals.sources) },
          { label: "CHUNKS", value: totals.chunks.toLocaleString() },
          { label: "INDEXING NOW", value: String(totals.busy) },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-2xl p-5 border-l-2 border-accent/30">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-accent">{s.label}</p>
            <p className="text-2xl font-display font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        {([["kbs", "Knowledge bases"], ["gaps", "Unanswered questions"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-full text-sm font-medium ${tab === key ? "bg-accent/15 text-accent" : "text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "kbs" ? (
        kbs === null ? (
          <div className="text-center text-muted-foreground py-10">Loading…</div>
        ) : kbs.length === 0 ? (
          <div className="bg-card rounded-2xl p-10 text-center">
            <BookOpen className="w-10 h-10 text-accent mx-auto mb-3" />
            <p className="font-semibold">No knowledge bases yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-5">Create one, add your website or documents, then link it to an agent.</p>
            <button onClick={() => setCreating(true)} className="px-5 py-2.5 rounded-full gradient-green text-sm text-primary-foreground font-medium">Create knowledge base</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kbs.map((k) => (
              <button key={k.id} onClick={() => setSelected(k.id)} className="text-left bg-card rounded-2xl p-5 border-t-2 border-accent hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"><BookOpen className="w-5 h-5 text-accent" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{k.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{k.description || "Knowledge base"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted rounded-lg p-2"><p className="text-muted-foreground">Sources</p><p className="font-semibold text-sm">{k.source_count}</p></div>
                  <div className="bg-muted rounded-lg p-2"><p className="text-muted-foreground">Chunks</p><p className="font-semibold text-sm">{k.chunk_count.toLocaleString()}</p></div>
                </div>
                <div className="flex gap-2 mt-3 text-[11px]">
                  {k.processing_count > 0 && <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> {k.processing_count} indexing</span>}
                  {k.failed_count > 0 && <span className="px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">{k.failed_count} failed</span>}
                  {k.auto_refresh && <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">auto-refresh</span>}
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="bg-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1"><HelpCircle className="w-4 h-4 text-accent" /><h3 className="font-semibold">Questions your knowledge couldn't answer</h3></div>
          <p className="text-xs text-muted-foreground mb-4">Customers asked these and no knowledge base had a relevant answer. Add the missing information to close the gap.</p>
          {gaps === null ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
          ) : gaps.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nothing yet — every question so far had an answer.</p>
          ) : (
            <div className="divide-y divide-muted">
              {gaps.map((g) => (
                <div key={g.id} className="py-3 flex items-start gap-3">
                  <p className="flex-1 text-sm">{g.question}</p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{g.agent_name ? `${g.agent_name} · ` : ""}{ago(g.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-display font-bold">New knowledge base</h2>
              <button onClick={() => setCreating(false)} aria-label="Close"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Name *</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={100} placeholder="e.g. Courses & fees" className={INPUT} autoFocus />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Description</label>
                <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} maxLength={500} placeholder="What this knowledge covers" className={INPUT} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setCreating(false)} className="px-5 py-2.5 rounded-full glass glass-border text-sm">Cancel</button>
              <button onClick={create} disabled={!newName.trim()} className="px-5 py-2.5 rounded-full gradient-green text-sm text-primary-foreground font-medium disabled:opacity-60">Create</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
