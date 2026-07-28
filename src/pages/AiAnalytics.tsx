import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { aiAnalyticsApi } from "@/lib/api";

const AiAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, unknown> | null>(null);
  const [days, setDays] = useState(30);

  const load = async () => {
    setLoading(true);
    try {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - days);
      const params = { date_from: from.toISOString(), date_to: to.toISOString() };
      const [ov, out] = await Promise.all([
        aiAnalyticsApi.overview(params),
        aiAnalyticsApi.outcomes(params),
      ]);
      setOverview(ov);
      setOutcomes(out);
    } catch (err) {
      toast.error((err as Error).message || "Failed to load AI analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const num = (k: string) => Number(overview?.[k] ?? 0);

  return (
    <AppLayout>
      <div className="max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold">AI Analytics</h1>
            <p className="text-muted-foreground mt-1">Usage, cost, intents and escalation metrics.</p>
          </div>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-muted rounded-xl px-3 py-2 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {loading ? (
          <div className="p-10 text-center text-muted-foreground">Loading...</div>
        ) : overview?.enabled === false ? (
          <div className="bg-card rounded-2xl p-8 text-center text-muted-foreground">
            AI analytics is disabled for this account.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Replies", value: num("replies_generated") },
                { label: "Success rate", value: `${Math.round(num("success_rate") * 100)}%` },
                { label: "Est. cost", value: `$${num("estimated_cost").toFixed(2)}` },
                { label: "Avg latency", value: `${Math.round(num("avg_latency_ms"))} ms` },
                { label: "Input tokens", value: num("input_tokens") },
                { label: "Output tokens", value: num("output_tokens") },
                { label: "Summaries", value: num("summaries_generated") },
                { label: "Escalations", value: num("conversations_escalated") },
                { label: "Accepted suggestions", value: num("suggestions_accepted") },
                { label: "Rejected suggestions", value: num("suggestions_rejected") },
                { label: "Moderation blocks", value: Number(outcomes?.moderation_blocks ?? 0) },
                { label: "Fallback usage", value: Number(outcomes?.fallback_usage ?? 0) },
              ].map((s) => (
                <div key={s.label} className="bg-card rounded-2xl p-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-display font-bold mt-1">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-card rounded-2xl p-5">
                <h2 className="font-display font-semibold mb-3">Top intents</h2>
                <ul className="space-y-2 text-sm">
                  {((outcomes?.intent_distribution as Array<{ intent: string; count: number }>) || []).length === 0 ? (
                    <li className="text-muted-foreground">No data yet.</li>
                  ) : (
                    ((outcomes?.intent_distribution as Array<{ intent: string; count: number }>) || []).map((i) => (
                      <li key={i.intent} className="flex justify-between">
                        <span className="capitalize">{i.intent.replace(/_/g, " ")}</span>
                        <span>{i.count}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="bg-card rounded-2xl p-5">
                <h2 className="font-display font-semibold mb-3">Sentiment</h2>
                <ul className="space-y-2 text-sm">
                  {((outcomes?.sentiment_distribution as Array<{ sentiment: string; count: number }>) || []).length === 0 ? (
                    <li className="text-muted-foreground">No data yet.</li>
                  ) : (
                    ((outcomes?.sentiment_distribution as Array<{ sentiment: string; count: number }>) || []).map((i) => (
                      <li key={i.sentiment} className="flex justify-between">
                        <span className="capitalize">{i.sentiment}</span>
                        <span>{i.count}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default AiAnalytics;
