import { useEffect, useState } from "react";
import { templates as templatesApi } from "@/lib/api";

/** The selected template's message text, exactly as WhatsApp will show it ({{1}} = a variable). */
export default function TemplatePreview({ templateId }: { templateId: string }) {
  const [body, setBody] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!templateId) return;
    let active = true;
    setBody(null);
    setError(false);
    templatesApi
      .preview(templateId)
      .then((r) => active && setBody(r.body || ""))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [templateId]);

  if (!templateId) return null;
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground mb-1.5">Message preview</p>
      {error ? (
        <p className="text-sm text-destructive">Couldn't load this template's text.</p>
      ) : body === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : body ? (
        <p className="text-sm whitespace-pre-wrap break-words">{body}</p>
      ) : (
        <p className="text-sm text-muted-foreground">No text found for this template.</p>
      )}
    </div>
  );
}
