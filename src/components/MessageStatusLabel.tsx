import { Check, CheckCheck, Clock, AlertTriangle } from "lucide-react";

const LABELS: Record<string, string> = {
  queued: "Queued",
  accepted: "Accepted",
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Failed",
  undelivered: "Undelivered",
  canceled: "Canceled",
  received: "Received",
};

type Props = {
  status?: string | null;
  error?: string | null;
  errorMessage?: string | null;
  outbound?: boolean;
};

/** Minimal delivery-status indicator for Live Chat bubbles. */
export function MessageStatusLabel({ status, error, errorMessage, outbound }: Props) {
  if (!status) return null;
  const key = status.toLowerCase();
  const label = LABELS[key] || status;
  const detail = errorMessage || error || undefined;
  const isFail = key === "failed" || key === "undelivered" || key === "canceled";
  const isRead = key === "read";
  const isDelivered = key === "delivered";
  const isSent = key === "sent" || key === "accepted" || key === "sending";
  const isQueued = key === "queued";

  const title = detail ? `${label}: ${detail}` : label;

  return (
    <span
      className={`inline-flex items-center gap-1 ${isFail ? "text-destructive/90" : ""}`}
      title={title}
      aria-label={title}
    >
      {outbound && isQueued && <Clock className="w-3 h-3 opacity-80" aria-hidden />}
      {outbound && isSent && !isDelivered && !isRead && <Check className="w-3 h-3 opacity-80" aria-hidden />}
      {outbound && isDelivered && !isRead && <CheckCheck className="w-3 h-3 opacity-80" aria-hidden />}
      {outbound && isRead && <CheckCheck className="w-3 h-3 opacity-100" aria-hidden />}
      {isFail && <AlertTriangle className="w-3 h-3" aria-hidden />}
      <span>{label}</span>
    </span>
  );
}
