import AppLayout from "@/components/AppLayout";
import { Upload, Send, X, FileSpreadsheet, Trash2, Eye, MessageCircle, AlertCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { blasts as blastsApi, templates as templatesApi, mediaApi, Blast, WaTemplate, MediaUploadResult } from "@/lib/api";
import { ChatSocket } from "@/lib/ws";

const BLAST_PURPOSES = ["conversational", "support", "transactional", "marketing"] as const;

interface ParsedNumber {
  phone: string;
  valid: boolean;
}

const normalizePhone = (raw: string): { phone: string; valid: boolean } => {
  let cleaned = String(raw).replace(/[^0-9+]/g, "");
  if (!cleaned.startsWith("+")) {
    if (cleaned.startsWith("0")) cleaned = "+44" + cleaned.slice(1);
    else if (cleaned.startsWith("44")) cleaned = "+" + cleaned;
    else cleaned = "+" + cleaned;
  }
  const valid = /^\+\d{10,15}$/.test(cleaned);
  return { phone: cleaned, valid };
};

const WhatsAppBlast = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "configure" | "review" | "sending">("upload");
  const [parsedNumbers, setParsedNumbers] = useState<ParsedNumber[]>([]);
  const [fileName, setFileName] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const [manualInput, setManualInput] = useState("");
  const [approvedTemplates, setApprovedTemplates] = useState<WaTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [messagePurpose, setMessagePurpose] = useState<(typeof BLAST_PURPOSES)[number]>("conversational");
  const [attachment, setAttachment] = useState<MediaUploadResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const [blasts, setBlasts] = useState<Blast[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [viewingBlast, setViewingBlast] = useState<Blast | null>(null);
  const [viewRecipients, setViewRecipients] = useState<Array<{ id: string; phone: string; status: string }>>([]);

  const fetchBlasts = async () => {
    try {
      const data = await blastsApi.list();
      setBlasts(data);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchBlasts();
    templatesApi
      .list()
      .then((data) =>
        setApprovedTemplates(
          data.filter((t) => t.status === "approved" && t.provider !== "meta" && !!t.content_sid),
        ),
      )
      .catch(() => setApprovedTemplates([]));
  }, []);

  useEffect(() => {
    if (!user) return;
    const socket = new ChatSocket();
    socket.connect(() => {
      fetchBlasts();
    });
    const off = socket.on((evt) => {
      if (evt.event !== "blast:updated") return;
      const data = evt.data as {
        id?: string;
        sent_count?: number;
        failed_count?: number;
        delivered_count?: number;
        read_count?: number;
        undelivered_count?: number;
        status?: string;
        total_recipients?: number;
        recipient_id?: string;
        recipient_status?: string;
      };
      if (!data?.id) return;
      setBlasts((prev) =>
        prev.map((b) =>
          b.id === data.id
            ? {
                ...b,
                sent_count: data.sent_count ?? b.sent_count,
                failed_count: data.failed_count ?? b.failed_count,
                delivered_count: data.delivered_count ?? b.delivered_count,
                read_count: data.read_count ?? b.read_count,
                undelivered_count: data.undelivered_count ?? b.undelivered_count,
                status: data.status ?? b.status,
                total_recipients: data.total_recipients ?? b.total_recipients,
              }
            : b
        )
      );
      setSendProgress((prev) => ({
        sent: data.sent_count ?? prev.sent,
        failed: data.failed_count ?? prev.failed,
        total: data.total_recipients ?? prev.total,
      }));
      setViewingBlast((cur) => {
        if (!cur || cur.id !== data.id) return cur;
        return {
          ...cur,
          sent_count: data.sent_count ?? cur.sent_count,
          failed_count: data.failed_count ?? cur.failed_count,
          delivered_count: data.delivered_count ?? cur.delivered_count,
          read_count: data.read_count ?? cur.read_count,
          undelivered_count: data.undelivered_count ?? cur.undelivered_count,
          status: data.status ?? cur.status,
        };
      });
      if (data.recipient_id && data.recipient_status) {
        setViewRecipients((prev) =>
          prev.map((r) =>
            r.id === data.recipient_id ? { ...r, status: data.recipient_status! } : r
          )
        );
      }
    });
    return () => {
      off();
      socket.close();
    };
  }, [user]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Please upload an Excel (.xlsx, .xls) or CSV file");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const numbers: ParsedNumber[] = [];
        const seen = new Set<string>();

        for (const row of rows) {
          for (const cell of row) {
            if (!cell) continue;
            const str = String(cell).trim();
            if (!str || str.length < 5) continue;
            if (/^(phone|number|mobile|tel|contact|name|email)/i.test(str)) continue;
            if (/\d{7,}/.test(str.replace(/[^0-9]/g, ""))) {
              const { phone, valid } = normalizePhone(str);
              if (!seen.has(phone)) {
                seen.add(phone);
                numbers.push({ phone, valid });
              }
            }
          }
        }

        if (numbers.length === 0) {
          toast.error("No phone numbers found in the file");
          return;
        }

        setParsedNumbers(numbers);
        toast.success(`Found ${numbers.length} phone numbers (${numbers.filter(n => n.valid).length} valid)`);
        setStep("configure");
      } catch {
        toast.error("Failed to parse file");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const removeNumber = (index: number) => {
    setParsedNumbers(prev => prev.filter((_, i) => i !== index));
  };

  const validNumbers = parsedNumbers.filter(n => n.valid);

  const handleSendBlast = async () => {
    if (!user || !campaignName.trim() || validNumbers.length === 0) return;
    if (selectedTemplateId && attachment) {
      toast.error("Cannot attach media to a template blast");
      return;
    }
    if (!selectedTemplateId && !message.trim() && !attachment) {
      toast.error("Provide a free-form message, media, or an approved template");
      return;
    }
    if (selectedTemplateId && !BLAST_PURPOSES.includes(messagePurpose)) {
      toast.error("Select a valid message purpose");
      return;
    }
    setSending(true);
    setStep("sending");
    setSendProgress({ sent: 0, failed: 0, total: validNumbers.length });

    try {
      const created = await blastsApi.create({
        name: campaignName.trim(),
        message: selectedTemplateId ? message.trim() || undefined : message.trim() || undefined,
        recipients: validNumbers.map((n) => n.phone),
        template_id: selectedTemplateId || undefined,
        content_variables:
          selectedTemplateId && Object.keys(templateVars).length ? templateVars : undefined,
        media_url: !selectedTemplateId ? (attachment?.url || attachment?.path) : undefined,
        message_purpose: messagePurpose,
      });
      toast.success("Blast queued — sending in background");
      setSendProgress({ sent: created.sent_count, failed: created.failed_count, total: created.total_recipients });
    } catch (err) {
      toast.error("Failed to queue blast", { description: (err as Error).message });
      setStep("configure");
    } finally {
      setSending(false);
      fetchBlasts();
    }
  };

  const handleViewBlast = async (blast: Blast) => {
    setViewingBlast(blast);
    try {
      const recipients = await blastsApi.recipients(blast.id);
      setViewRecipients(recipients);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDeleteBlast = async (id: string) => {
    try {
      await blastsApi.remove(id);
      toast.success("Blast deleted");
      fetchBlasts();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const resetForm = () => {
    setStep("upload");
    setParsedNumbers([]);
    setFileName("");
    setCampaignName("");
    setMessage("");
    setManualInput("");
    setSelectedTemplateId("");
    setTemplateVars({});
    setMessagePurpose("conversational");
    setAttachment(null);
    setSendProgress({ sent: 0, failed: 0, total: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">
            WhatsApp <span className="text-gradient-green">Blast</span>
          </h1>
          <p className="text-muted-foreground mt-1">Upload numbers, write a message, and blast it to everyone.</p>
        </div>
        {step !== "upload" && (
          <button onClick={resetForm} className="flex items-center gap-2 px-4 py-2 rounded-xl glass glass-border text-sm font-medium">
            <Upload className="w-4 h-4" /> New Blast
          </button>
        )}
      </div>

      {step === "upload" && (
        <div className="grid lg:grid-cols-2 gap-6 max-w-4xl">
          <div className="bg-card rounded-2xl p-8">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet className="w-7 h-7 text-accent" />
              </div>
              <h2 className="text-lg font-display font-bold mb-2">Upload File</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Upload an Excel or CSV file with phone numbers.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 rounded-xl gradient-green text-primary-foreground font-medium text-sm flex items-center gap-2 mx-auto"
              >
                <Upload className="w-4 h-4" /> Choose File
              </button>
              <p className="text-xs text-muted-foreground mt-3">Supported: .xlsx, .xls, .csv</p>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-8">
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-7 h-7 text-accent" />
              </div>
              <h2 className="text-lg font-display font-bold mb-2">Enter Manually</h2>
              <p className="text-sm text-muted-foreground">
                Paste or type phone numbers, one per line.
              </p>
            </div>
            <textarea
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={"+447700900001\n+447700900002\n+447700900003\n...\n\nOne number per line"}
              rows={8}
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none font-mono"
            />
            <button
              onClick={() => {
                const lines = manualInput.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean);
                if (lines.length === 0) { toast.error("Enter at least one number"); return; }
                const seen = new Set<string>();
                const numbers: ParsedNumber[] = [];
                for (const line of lines) {
                  if (/^(phone|number|mobile|tel)/i.test(line)) continue;
                  const { phone, valid } = normalizePhone(line);
                  if (!seen.has(phone)) {
                    seen.add(phone);
                    numbers.push({ phone, valid });
                  }
                }
                if (numbers.length === 0) { toast.error("No valid numbers found"); return; }
                setParsedNumbers(numbers);
                setFileName("manual entry");
                toast.success(`Parsed ${numbers.length} numbers (${numbers.filter(n => n.valid).length} valid)`);
                setStep("configure");
              }}
              disabled={!manualInput.trim()}
              className="w-full mt-3 py-3 rounded-xl gradient-green text-sm font-medium text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> Parse Numbers
            </button>
          </div>
        </div>
      )}

      {step === "configure" && (
        <div className="grid lg:grid-cols-2 gap-6 max-w-5xl">
          <div className="bg-card rounded-2xl p-6">
            <h2 className="font-display font-semibold mb-4">Configure Message</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Campaign Name *</label>
                <input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. April Promo Blast"
                  maxLength={100}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Approved Template (required outside 24h window)</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedTemplateId(id);
                    if (id) setAttachment(null);
                    const t = approvedTemplates.find((x) => x.id === id);
                    const next: Record<string, string> = {};
                    (t?.variables || []).forEach((k) => {
                      next[k] = templateVars[k] || "";
                    });
                    setTemplateVars(next);
                  }}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  <option value="">Free-form</option>
                  {approvedTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.content_sid})
                    </option>
                  ))}
                </select>
              </div>
              {selectedTemplateId &&
                (approvedTemplates.find((t) => t.id === selectedTemplateId)?.variables || []).map((key) => (
                  <div key={key}>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Variable {`{{${key}}}`}</label>
                    <input
                      value={templateVars[key] || ""}
                      onChange={(e) => setTemplateVars((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                ))}
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Message purpose *</label>
                <select
                  value={messagePurpose}
                  onChange={(e) => setMessagePurpose(e.target.value as typeof messagePurpose)}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  {BLAST_PURPOSES.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Use <span className="text-foreground">Conversational</span> for testing.
                  <span className="text-foreground"> Marketing</span> only works for opted-in WhatsApp contacts.
                </p>
              </div>
              {!selectedTemplateId && (
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Optional media (free-form only)</label>
                  <input
                    ref={mediaInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,audio/*,video/mp4,application/pdf"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      setUploading(true);
                      try {
                        setAttachment(await mediaApi.upload(file));
                      } catch (err) {
                        toast.error("Upload failed", { description: (err as Error).message });
                      } finally {
                        setUploading(false);
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => mediaInputRef.current?.click()}
                      disabled={uploading}
                      className="px-4 py-2 rounded-xl glass glass-border text-sm disabled:opacity-50"
                    >
                      {uploading ? "Uploading..." : attachment ? "Replace file" : "Attach file"}
                    </button>
                    {attachment && (
                      <>
                        <span className="text-xs text-muted-foreground truncate">{attachment.filename}</span>
                        <button type="button" onClick={() => setAttachment(null)} className="text-xs text-destructive">
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">
                  {selectedTemplateId ? "Optional note / free-form fallback label" : "Message"}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hi! We have an exclusive offer for you..."
                  rows={6}
                  maxLength={1600}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">{message.length}/1600 characters</p>
              </div>

              <div className="bg-accent/5 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    Free-form blasts only deliver to recipients inside the 24-hour WhatsApp window.
                    Recipients with no recent inbound (or no lead) need an approved template.
                    Marketing purpose requires explicit WhatsApp opt-in — for sandbox testing choose Conversational + template.
                    Media requires PUBLIC_BASE_URL so Twilio can fetch the file. Blacklisted numbers are skipped.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setStep("review")}
                disabled={!campaignName.trim() || (!selectedTemplateId && !message.trim() && !attachment)}
                className="w-full py-3 rounded-xl gradient-green text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Review & Send →
              </button>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold">
                Uploaded Numbers
                <span className="text-xs text-muted-foreground ml-2">({fileName})</span>
              </h2>
              <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
                {validNumbers.length} valid / {parsedNumbers.length} total
              </span>
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-1.5">
              {parsedNumbers.map((n, i) => (
                <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${n.valid ? "bg-muted" : "bg-destructive/10"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${n.valid ? "bg-accent" : "bg-destructive"}`} />
                    <span className={n.valid ? "" : "text-destructive"}>{n.phone}</span>
                    {!n.valid && <span className="text-[10px] text-destructive">INVALID</span>}
                  </div>
                  <button onClick={() => removeNumber(i)} className="p-1 hover:bg-muted rounded">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="bg-card rounded-2xl p-6 max-w-2xl">
          <h2 className="font-display font-semibold text-xl mb-6">Review Blast</h2>
          <div className="space-y-4">
            <div className="bg-muted rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Campaign</p>
              <p className="font-medium">{campaignName}</p>
            </div>
            <div className="bg-muted rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Message</p>
              {selectedTemplateId ? (
                <p className="text-sm">
                  Template: {approvedTemplates.find((t) => t.id === selectedTemplateId)?.name || selectedTemplateId}
                  {message.trim() ? (
                    <span className="block mt-2 whitespace-pre-wrap text-muted-foreground">{message}</span>
                  ) : null}
                </p>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message}</p>
              )}
            </div>
            <div className="bg-muted rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Purpose</p>
              <p className="font-medium capitalize">{messagePurpose}</p>
              {messagePurpose === "marketing" && (
                <p className="text-xs text-yellow-400 mt-1">Requires opted-in WhatsApp consent for each number</p>
              )}
            </div>
            <div className="bg-muted rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Recipients</p>
              <p className="text-2xl font-display font-bold text-accent">{validNumbers.length}</p>
              <p className="text-xs text-muted-foreground">{parsedNumbers.length - validNumbers.length} invalid numbers excluded</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep("configure")} className="flex-1 py-3 rounded-xl glass glass-border text-sm font-medium">
                ← Back
              </button>
              <button
                onClick={handleSendBlast}
                disabled={sending}
                className="flex-1 py-3 rounded-xl gradient-green text-sm font-medium text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> {sending ? "Sending..." : `Send to ${validNumbers.length} numbers`}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "sending" && (
        <div className="bg-card rounded-2xl p-8 max-w-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-xl font-display font-bold mb-2">
            {sending ? "Queuing Messages..." : "Blast Queued"}
          </h2>
          <div className="grid grid-cols-3 gap-4 my-6">
            <div className="bg-muted rounded-xl p-4">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{sendProgress.total}</p>
            </div>
            <div className="bg-muted rounded-xl p-4">
              <p className="text-xs text-accent">Sent</p>
              <p className="text-2xl font-bold text-accent">{sendProgress.sent}</p>
            </div>
            <div className="bg-muted rounded-xl p-4">
              <p className="text-xs text-destructive">Failed</p>
              <p className="text-2xl font-bold text-destructive">{sendProgress.failed}</p>
            </div>
          </div>
          {!sending && (
            <button onClick={resetForm} className="px-6 py-3 rounded-xl gradient-green text-sm font-medium text-primary-foreground">
              Create New Blast
            </button>
          )}
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-xl font-display font-semibold mb-4">Blast History</h2>
        <div className="bg-card rounded-2xl overflow-hidden">
          {loadingHistory ? (
            <div className="p-10 text-center text-muted-foreground">Loading...</div>
          ) : blasts.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">No blasts yet. Create your first one above!</div>
          ) : (
            <div className="divide-y divide-border">
              {blasts.map((b) => (
                <div key={b.id} className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="lg:w-1/4">
                    <p className="font-semibold text-sm">{b.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(b.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="lg:w-1/4">
                    <p className="text-xs text-muted-foreground truncate">{b.message}</p>
                    {b.status === "failed" && b.last_error && (
                      <p className="text-[11px] text-destructive mt-1 line-clamp-2">{b.last_error}</p>
                    )}
                  </div>
                  <div className="lg:w-1/6">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      b.status === "completed" ? "bg-accent/10 text-accent" :
                      b.status === "sending" || b.status === "queued" ? "bg-yellow-500/10 text-yellow-500" :
                      b.status === "failed" ? "bg-destructive/10 text-destructive" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {b.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="lg:w-1/6 text-xs text-muted-foreground">
                    {b.sent_count}/{b.total_recipients} sent
                    {typeof b.delivered_count === "number" && b.delivered_count > 0
                      ? ` · ${b.delivered_count} delivered`
                      : ""}
                    {b.failed_count > 0 ? ` · ${b.failed_count} failed` : ""}
                  </div>
                  <div className="flex items-center gap-2 lg:w-1/6 justify-end">
                    <button onClick={() => handleViewBlast(b)} className="p-2 rounded-lg hover:bg-muted">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDeleteBlast(b.id)} className="p-2 rounded-lg hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {viewingBlast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold">{viewingBlast.name}</h2>
              <button onClick={() => setViewingBlast(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="bg-muted rounded-xl p-3 mb-4">
              <p className="text-xs text-muted-foreground">Message</p>
              <p className="text-sm whitespace-pre-wrap mt-1">{viewingBlast.message}</p>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{viewRecipients.length} recipients</p>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {viewRecipients.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted text-sm">
                  <span>{r.phone}</span>
                  <span className={`text-xs font-medium ${
                    r.status === "sent" ? "text-accent" : r.status === "failed" ? "text-destructive" : "text-muted-foreground"
                  }`}>{r.status.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default WhatsAppBlast;
