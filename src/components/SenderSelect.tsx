import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { sendersApi, WhatsAppSender } from "@/lib/api";
import { senderOptionLabel } from "@/pages/WhatsAppNumbers";

type Props = { value: string; onChange: (phone: string) => void };

const SenderSelect = ({ value, onChange }: Props) => {
  const [senders, setSenders] = useState<WhatsAppSender[]>([]);
  const [envSender, setEnvSender] = useState<string | null>(null);

  useEffect(() => {
    sendersApi
      .list()
      .then((r) => {
        const usable = r.senders.filter((s) => s.enabled);
        setSenders(usable);
        setEnvSender(r.env_sender);
        if (!value) {
          const def = usable.find((s) => s.is_default) || usable[0];
          if (def) onChange(def.phone);
        }
      })
      .catch(() => setSenders([]));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = senders.find((s) => s.phone === value);
  return (
    <div>
      <label className="text-sm text-muted-foreground mb-1.5 flex justify-between">
        <span>Send from</span>
        <Link to="/settings/whatsapp-numbers" className="text-accent text-xs underline underline-offset-2">
          Manage numbers
        </Link>
      </label>
      {senders.length === 0 ? (
        <p className="text-sm bg-muted rounded-xl px-4 py-3">{envSender ? `${envSender} (server number)` : "Server number"}</p>
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          {senders.map((s) => (
            <option key={s.id} value={s.phone}>
              {senderOptionLabel(s)}
              {s.is_default ? " · default" : ""}
            </option>
          ))}
        </select>
      )}
      {chosen?.quality === "LOW" && (
        <p className="text-xs text-yellow-400 mt-1">This number's quality is LOW — sending a lot from it risks WhatsApp restricting it.</p>
      )}
    </div>
  );
};

export default SenderSelect;
