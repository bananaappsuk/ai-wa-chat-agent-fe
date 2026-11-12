import { useMemo, useRef, useState } from "react";
import { X, Plus, Trash2, Link2, Phone, Reply } from "lucide-react";
import { toast } from "sonner";
import { templates as templatesApi, TemplateButtonDraft, WaTemplate, WhatsAppTemplateDraft } from "@/lib/api";

const BODY_MAX = 1024;
const SHORT_MAX = 60;
const VAR = /\{\{\s*(\d+)\s*\}\}/g;

export const templateVariables = (text: string): string[] =>
  [...new Set([...text.matchAll(VAR)].map((m) => Number(m[1])))].sort((a, b) => a - b).map(String);

export const checkTemplateDraft = (d: WhatsAppTemplateDraft): string[] => {
  const problems: string[] = [];
  if (!d.name.trim()) problems.push("Give the template a name.");
  if (!d.body.trim()) problems.push("Write the message body.");
  if (d.body.length > BODY_MAX) problems.push(`The body is ${d.body.length} characters — WhatsApp allows ${BODY_MAX}.`);
  if ((d.header_text || "").length > SHORT_MAX) problems.push(`The header can be at most ${SHORT_MAX} characters.`);
  if ((d.footer || "").length > SHORT_MAX) problems.push(`The footer can be at most ${SHORT_MAX} characters.`);
  if (/\{\{\s*\d+\s*\}\}/.test(d.footer || "")) problems.push("The footer can't contain variables.");
  const vars = templateVariables(`${d.header_text || ""}\n${d.body}`);
  if (vars.some((v, i) => Number(v) !== i + 1)) problems.push("Variables must be numbered in order: {{1}}, {{2}}, {{3}}…");
  vars.forEach((v) => {
    if (!(d.samples[v] || "").trim()) problems.push(`Add a sample value for {{${v}}} — WhatsApp needs it to approve the template.`);
  });
  const count = (t: TemplateButtonDraft["type"]) => d.buttons.filter((b) => b.type === t).length;
  if (count("URL") > 2) problems.push("At most 2 website buttons.");
  if (count("PHONE_NUMBER") > 1) problems.push("At most 1 call button.");
  if (count("QUICK_REPLY") > 10) problems.push("At most 10 quick-reply buttons.");
  d.buttons.forEach((b, i) => {
    const label = b.title.trim() || `Button ${i + 1}`;
    const max = b.type === "QUICK_REPLY" ? 25 : 20;
    if (!b.title.trim()) problems.push(`Button ${i + 1} needs text.`);
    else if (b.title.length > max) problems.push(`"${label}": button text can be at most ${max} characters.`);
    if (b.type === "URL" && !(b.url || "").startsWith("https://")) problems.push(`"${label}": the website link must start with https://`);
    if (b.type === "PHONE_NUMBER" && !/^\+\d{8,15}$/.test(b.phone || "")) problems.push(`"${label}": use an international number, e.g. +447453289655`);
  });
  return problems;
};

const fill = (text: string, samples: Record<string, string>) =>
  text.replace(VAR, (m, n: string) => samples[n]?.trim() || m);

const input = "w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30";

type Props = { onClose: () => void; onCreated: (t: WaTemplate) => void };

const CreateWhatsAppTemplate = ({ onClose, onCreated }: Props) => {
  const [draft, setDraft] = useState<WhatsAppTemplateDraft>({
    name: "",
    category: "MARKETING",
    language: "en",
    header_text: "",
    body: "",
    footer: "",
    buttons: [],
    samples: {},
  });
  const [saving, setSaving] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const set = (patch: Partial<WhatsAppTemplateDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const vars = useMemo(() => templateVariables(`${draft.header_text || ""}\n${draft.body}`), [draft.header_text, draft.body]);
  const problems = useMemo(() => checkTemplateDraft(draft), [draft]);

  const addVariable = () => {
    const next = `{{${vars.length ? Math.max(...vars.map(Number)) + 1 : 1}}}`;
    const el = bodyRef.current;
    const at = el ? el.selectionStart : draft.body.length;
    set({ body: draft.body.slice(0, at) + next + draft.body.slice(at) });
    setTimeout(() => {
      el?.focus();
      el?.setSelectionRange(at + next.length, at + next.length);
    }, 0);
  };

  const setButton = (i: number, patch: Partial<TemplateButtonDraft>) =>
    set({ buttons: draft.buttons.map((b, j) => (j === i ? { ...b, ...patch } : b)) });

  const submit = async () => {
    setTriedSubmit(true);
    if (problems.length) return;
    setSaving(true);
    try {
      const created = await templatesApi.createWhatsApp({
        ...draft,
        name: draft.name.trim(),
        header_text: draft.header_text?.trim() || undefined,
        footer: draft.footer?.trim() || undefined,
        samples: Object.fromEntries(vars.map((v) => [v, draft.samples[v].trim()])),
      });
      toast.success("Submitted to WhatsApp", { description: "Approval usually takes a few minutes — the status updates here automatically." });
      onCreated(created);
    } catch (err) {
      toast.error("Couldn't create the template", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold">Create WhatsApp template</h2>
          <button onClick={onClose} aria-label="Close">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Template name *</label>
              <input value={draft.name} onChange={(e) => set({ name: e.target.value })} maxLength={120} placeholder="e.g. GBBS day 3 follow-up" className={input} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Category</label>
                <select value={draft.category} onChange={(e) => set({ category: e.target.value as WhatsAppTemplateDraft["category"] })} className={input}>
                  <option value="MARKETING">Marketing (offers, invites, follow-ups)</option>
                  <option value="UTILITY">Utility (updates about something they asked for)</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Language</label>
                <select value={draft.language} onChange={(e) => set({ language: e.target.value })} className={input}>
                  <option value="en">English</option>
                  <option value="en_GB">English (UK)</option>
                  <option value="en_US">English (US)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 flex justify-between">
                <span>Header (optional, bold)</span>
                <span>{(draft.header_text || "").length}/{SHORT_MAX}</span>
              </label>
              <input value={draft.header_text} onChange={(e) => set({ header_text: e.target.value.replace(/\n/g, " ") })} className={input} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 flex justify-between items-end">
                <span>Message *</span>
                <span className={draft.body.length > BODY_MAX ? "text-red-400 font-medium" : ""}>
                  {draft.body.length}/{BODY_MAX}
                </span>
              </label>
              <textarea
                ref={bodyRef}
                value={draft.body}
                onChange={(e) => set({ body: e.target.value })}
                rows={10}
                placeholder={"Hi {{1}},\n\nThank you for visiting us…"}
                className={`${input} resize-y`}
              />
              <div className="flex items-center justify-between mt-2">
                <button type="button" onClick={addVariable} className="text-xs px-3 py-1.5 rounded-lg glass glass-border">
                  + Add variable
                </button>
                <span className="text-xs text-muted-foreground">
                  Use <code>Hi {"{{1}}"}</code> to greet each contact by first name. *bold*, _italic_ work in WhatsApp.
                </span>
              </div>
            </div>
            {vars.length > 0 && (
              <div className="rounded-xl border border-border p-3 space-y-2">
                <p className="text-xs text-muted-foreground">Sample values (WhatsApp uses these to review the template)</p>
                {vars.map((v) => (
                  <div key={v} className="flex items-center gap-2">
                    <span className="text-xs font-mono w-12">{`{{${v}}}`}</span>
                    <input
                      value={draft.samples[v] || ""}
                      onChange={(e) => set({ samples: { ...draft.samples, [v]: e.target.value } })}
                      placeholder={v === "1" ? "e.g. Jane" : "sample value"}
                      className={`${input} py-2`}
                    />
                  </div>
                ))}
              </div>
            )}
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 flex justify-between">
                <span>Footer (optional, small grey text)</span>
                <span>{(draft.footer || "").length}/{SHORT_MAX}</span>
              </label>
              <input value={draft.footer} onChange={(e) => set({ footer: e.target.value.replace(/\n/g, " ") })} className={input} />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Buttons (optional)</p>
              {draft.buttons.map((b, i) => (
                <div key={i} className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{b.type === "URL" ? "Website button" : b.type === "PHONE_NUMBER" ? "Call button" : "Quick reply"}</span>
                    <button type="button" onClick={() => set({ buttons: draft.buttons.filter((_, j) => j !== i) })} aria-label="Remove button">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input value={b.title} onChange={(e) => setButton(i, { title: e.target.value })} placeholder="Button text" className={`${input} py-2`} />
                  {b.type === "URL" && (
                    <input value={b.url || ""} onChange={(e) => setButton(i, { url: e.target.value.trim() })} placeholder="https://aiagenthub.live/business-assessment" className={`${input} py-2`} />
                  )}
                  {b.type === "PHONE_NUMBER" && (
                    <input value={b.phone || ""} onChange={(e) => setButton(i, { phone: e.target.value.replace(/[^\d+]/g, "") })} placeholder="+447453289655" className={`${input} py-2`} />
                  )}
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => set({ buttons: [...draft.buttons, { type: "URL", title: "", url: "https://" }] })} className="text-xs px-3 py-1.5 rounded-lg glass glass-border flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5" /> Website
                </button>
                <button type="button" onClick={() => set({ buttons: [...draft.buttons, { type: "PHONE_NUMBER", title: "", phone: "+44" }] })} className="text-xs px-3 py-1.5 rounded-lg glass glass-border flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Call
                </button>
                <button type="button" onClick={() => set({ buttons: [...draft.buttons, { type: "QUICK_REPLY", title: "" }] })} className="text-xs px-3 py-1.5 rounded-lg glass glass-border flex items-center gap-1">
                  <Reply className="w-3.5 h-3.5" /> Quick reply
                </button>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Preview</p>
            <div className="rounded-2xl bg-[#0b141a] p-4">
              <div className="rounded-xl bg-[#1f2c34] text-[#e9edef] p-3 text-sm max-w-md">
                {draft.header_text?.trim() && <p className="font-semibold mb-1">{fill(draft.header_text, draft.samples)}</p>}
                <p className="whitespace-pre-wrap break-words">{fill(draft.body, draft.samples) || "Your message appears here."}</p>
                {draft.footer?.trim() && <p className="text-xs text-[#8696a0] mt-2">{draft.footer}</p>}
              </div>
              {draft.buttons.map((b, i) => (
                <div key={i} className="mt-1 max-w-md rounded-xl bg-[#1f2c34] text-[#53bdeb] text-sm text-center py-2">
                  {b.title || "Button"}
                </div>
              ))}
            </div>
            {triedSubmit && problems.length > 0 && (
              <ul className="mt-4 space-y-1 text-sm text-red-400">
                {problems.map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl glass glass-border text-sm font-medium">
                Cancel
              </button>
              <button onClick={submit} disabled={saving} className="flex-1 py-3 rounded-xl gradient-green text-sm font-medium text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> {saving ? "Submitting…" : "Create & submit to WhatsApp"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Once WhatsApp approves it, it appears in WA Blast and Campaigns. You'll get a notification if it's rejected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateWhatsAppTemplate;
