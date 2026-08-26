import { useState } from "react";
import { toast } from "sonner";
import { leads as leadsApi } from "@/lib/api";

type AgentOption = { id: string; name: string };

/**
 * Shows which agent currently handles a lead and lets the operator reassign it
 * (or set it back to "Auto" so the router decides on the next inbound message).
 */
export default function AgentAssign({
  leadId,
  value,
  agents,
  onChange,
  className,
}: {
  leadId: string;
  value?: string | null;
  agents: AgentOption[];
  onChange?: (agentId: string | null) => void;
  className?: string;
}) {
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState<string>(value || "");

  const handle = async (v: string) => {
    const prev = current;
    setCurrent(v);
    setSaving(true);
    try {
      await leadsApi.bulkAction({
        lead_ids: [leadId],
        action: "assign_agent",
        value: v || "auto",
      });
      onChange?.(v || null);
      toast.success(v ? "Agent assigned" : "Set to auto-routing");
    } catch (e) {
      setCurrent(prev);
      toast.error("Failed to update agent", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <select
      value={current}
      disabled={saving}
      onChange={(e) => handle(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className={
        className ||
        "bg-muted rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50"
      }
      title="Which agent handles this conversation"
    >
      <option value="">Auto — route by message</option>
      {agents.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  );
}
