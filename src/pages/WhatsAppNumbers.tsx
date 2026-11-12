import AppLayout from "@/components/AppLayout";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Wrench, Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { sendersApi, WhatsAppSender } from "@/lib/api";

const QUALITY_STYLE: Record<string, string> = {
  HIGH: "bg-accent/10 text-accent",
  MEDIUM: "bg-yellow-500/10 text-yellow-400",
  LOW: "bg-destructive/10 text-destructive",
};

export const senderOptionLabel = (s: WhatsAppSender) =>
  `${s.phone}${s.label ? ` · ${s.label}` : ""}${s.quality ? ` · quality ${s.quality}` : ""}${s.twilio_status && s.twilio_status !== "ONLINE" ? ` · ${s.twilio_status}` : ""}`;

const WhatsAppNumbers = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [items, setItems] = useState<WhatsAppSender[]>([]);
  const [envSender, setEnvSender] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const apply = (r: { senders: WhatsAppSender[]; env_sender: string | null }) => {
    setItems(r.senders);
    setEnvSender(r.env_sender);
  };

  const load = useCallback(async () => {
    try {
      apply(await sendersApi.list());
    } catch (err) {
      toast.error("Couldn't load WhatsApp numbers", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (key: string, fn: () => Promise<{ senders: WhatsAppSender[]; env_sender: string | null }>, ok: string) => {
    setBusy(key);
    try {
      apply(await fn());
      toast.success(ok);
    } catch (err) {
      toast.error("That didn't work", { description: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">
            WhatsApp <span className="text-gradient-green">numbers</span>
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Choose which number each campaign or blast sends from. Replies go out from the number the customer wrote to.
            Status and quality refresh from Twilio every 10 minutes — you're notified if a number goes offline or its quality drops.
            If WhatsApp blocks a number (error 63051) it's switched off automatically and sends move to another number.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => run("sync", sendersApi.sync, "Numbers synced from Twilio")}
            disabled={busy === "sync"}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-green text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${busy === "sync" ? "animate-spin" : ""}`} /> Sync from Twilio
          </button>
        )}
      </div>

      <div className="bg-card rounded-2xl overflow-hidden">
        {loading ? (
          <p className="p-8 text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground space-y-2">
            <p>No numbers yet.{isAdmin ? " Press Sync from Twilio to bring in your WhatsApp senders." : ""}</p>
            {envSender && <p>Until then everything sends from the server's number {envSender}.</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Number</th>
                  <th className="px-4 py-3 font-medium">Label</th>
                  <th className="px-4 py-3 font-medium">Twilio status</th>
                  <th className="px-4 py-3 font-medium">Quality</th>
                  <th className="px-4 py-3 font-medium">Replies reach the app</th>
                  <th className="px-4 py-3 font-medium">Use</th>
                  <th className="px-4 py-3 font-medium">Default</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-b border-border/50">
                    <td className="px-4 py-3 font-mono whitespace-nowrap">
                      {s.phone}
                      {s.display_name && <span className="block text-xs text-muted-foreground font-sans">{s.display_name}</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.label || "—"}</td>
                    <td className="px-4 py-3">
                      {s.restricted ? (
                        <span className="text-destructive">⛔ Restricted by WhatsApp{s.restricted_code ? ` (${s.restricted_code})` : ""}</span>
                      ) : s.twilio_status === "ONLINE" ? (
                        "🟢 Online"
                      ) : (
                        `🔴 ${s.twilio_status || "Unknown"}`
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.quality && s.quality !== "UNKNOWN" ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs ${QUALITY_STYLE[s.quality] || ""}`}>{s.quality}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.webhook_ok ? (
                        "✅ Yes"
                      ) : (
                        <span className="flex items-center gap-2">
                          ⚠️ No
                          {isAdmin && (
                            <button
                              onClick={() => run(`hook-${s.id}`, () => sendersApi.fixWebhook(s.id), "Webhook fixed")}
                              disabled={busy === `hook-${s.id}`}
                              className="text-xs px-2 py-1 rounded-lg glass glass-border flex items-center gap-1"
                            >
                              <Wrench className="w-3 h-3" /> Fix
                            </button>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={s.enabled}
                          onChange={(e) => run(`use-${s.id}`, () => sendersApi.update(s.id, { enabled: e.target.checked }), e.target.checked ? "Number switched on" : "Number switched off")}
                        />
                        {s.enabled ? "On" : "Off"}
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      {s.is_default ? (
                        <span className="flex items-center gap-1 text-accent"><Star className="w-4 h-4 fill-current" /> Default</span>
                      ) : (
                        <button
                          onClick={() => run(`def-${s.id}`, () => sendersApi.update(s.id, { is_default: true }), `${s.phone} is now the default`)}
                          disabled={!s.enabled}
                          className="text-xs px-2 py-1 rounded-lg glass glass-border disabled:opacity-40"
                        >
                          Make default
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        Need a new number? Register it on Twilio, then press Sync. Templates: <Link to="/templates" className="text-accent underline">Templates</Link>.
      </p>
    </AppLayout>
  );
};

export default WhatsAppNumbers;
