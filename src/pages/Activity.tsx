import AppLayout from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { activityApi, ActivityEvent } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const formatWhen = (iso: string, tz?: string | null) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: tz || undefined,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
};

const Activity = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ActivityEvent[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [eventType, setEventType] = useState("");

  const load = async (p = page) => {
    setLoading(true);
    try {
      const res = await activityApi.list({
        page: p,
        page_size: 25,
        event_type: eventType || undefined,
      });
      setItems(res.items || []);
      setTotalPages(res.total_pages || 0);
      setPage(res.page || p);
    } catch (err) {
      toast.error((err as Error).message || "Failed to load activity");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType]);

  const resourceLink = (ev: ActivityEvent) => {
    if (ev.resource_type === "lead" && ev.resource_id) {
      return `/live-chat?lead=${ev.resource_id}`;
    }
    if (ev.resource_type === "campaign" && ev.resource_id) {
      return `/campaigns`;
    }
    return null;
  };

  return (
    <AppLayout>
      <div className="max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Activity</h1>
        <p className="text-muted-foreground mb-6">Recent account and workspace events.</p>

        <div className="mb-4 flex flex-wrap gap-3">
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="bg-muted rounded-xl px-3 py-2 text-sm"
          >
            <option value="">All events</option>
            <option value="user.login">Logins</option>
            <option value="profile.updated">Profile</option>
            <option value="lead.takeover">Takeover</option>
            <option value="lead.needs_human">Needs human</option>
            <option value="consent.opt_out">Opt-outs</option>
            <option value="leads.import">Imports</option>
            <option value="admin.user_created">Admin user changes</option>
          </select>
          <button
            onClick={() => load(page)}
            className="px-3 py-2 rounded-xl bg-muted text-sm hover:bg-muted/80"
          >
            Refresh
          </button>
        </div>

        <div className="bg-card rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-muted-foreground">Loading activity...</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">No activity yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((ev) => {
                const href = resourceLink(ev);
                return (
                  <li key={ev.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-2 justify-between">
                    <div>
                      <p className="text-sm font-medium">{ev.summary || ev.event_type}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {ev.event_type}
                        {ev.actor_id ? ` · actor ${ev.actor_id.slice(-6)}` : ""}
                        {ev.resource_type ? ` · ${ev.resource_type}` : ""}
                      </p>
                      {href && (
                        <Link to={href} className="text-xs text-accent hover:underline mt-1 inline-block">
                          Open related
                        </Link>
                      )}
                    </div>
                    <time className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatWhen(ev.created_at, user?.timezone)}
                    </time>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <button
              disabled={page <= 1 || loading}
              onClick={() => load(page - 1)}
              className="px-3 py-2 rounded-xl bg-muted text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => load(page + 1)}
              className="px-3 py-2 rounded-xl bg-muted text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Activity;
