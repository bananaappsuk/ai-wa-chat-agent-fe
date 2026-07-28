import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, User, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { notificationsApi, AppNotification, WS_BASE, tokenStore } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const topNavItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Agents", path: "/agents" },
  { label: "Campaigns", path: "/campaigns" },
  { label: "Leads", path: "/leads" },
  { label: "Activity", path: "/activity" },
  { label: "Settings", path: "/settings" },
];

const AppTopbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    try {
      const res = await notificationsApi.unreadCount();
      setCount(res.count || 0);
    } catch {
      /* ignore */
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.list({ page: 1 });
      setItems(res.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, 60000);
    return () => clearInterval(t);
  }, [refreshCount]);

  useEffect(() => {
    const tok = tokenStore.get();
    if (!tok || !user) return;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`${WS_BASE}/ws/chat?token=${encodeURIComponent(tok)}`);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.event === "notification:new") {
            refreshCount();
            if (open) loadList();
          }
        } catch {
          /* ignore */
        }
      };
    } catch {
      /* ignore */
    }
    return () => {
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    };
  }, [user, open, refreshCount, loadList]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) await loadList();
  };

  const goTo = async (n: AppNotification) => {
    if (!n.is_read) {
      try {
        await notificationsApi.markRead(n.id);
        refreshCount();
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
    if (n.resource_type === "lead" && n.resource_id) {
      navigate(`/live-chat?lead=${n.resource_id}`);
    } else if (n.resource_type === "campaign") {
      navigate("/campaigns");
    } else if (n.type === "security_notice") {
      navigate("/settings");
    }
  };

  return (
    <header className="fixed top-0 left-60 right-0 z-30 h-16 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-6">
      <nav className="flex items-center gap-6">
        {topNavItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm font-medium transition-colors ${
                active ? "text-accent border-b-2 border-accent pb-0.5" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-3">
        <Link
          to="/campaigns"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full gradient-green text-sm text-primary-foreground font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          New Campaign
        </Link>
        <div className="relative" ref={panelRef}>
          <button
            onClick={toggle}
            className="p-2 rounded-full hover:bg-muted transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-[10px] text-primary-foreground flex items-center justify-center">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto bg-card border border-border rounded-2xl shadow-lg z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-medium">Notifications</span>
                <button
                  className="text-xs text-accent hover:underline"
                  onClick={async () => {
                    await notificationsApi.markAllRead();
                    refreshCount();
                    loadList();
                  }}
                >
                  Mark all read
                </button>
              </div>
              {loading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
              ) : items.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</div>
              ) : (
                <ul>
                  {items.map((n) => (
                    <li key={n.id}>
                      <button
                        onClick={() => goTo(n)}
                        className={`w-full text-left px-4 py-3 hover:bg-muted/60 border-b border-border ${
                          n.is_read ? "opacity-70" : ""
                        }`}
                      >
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <Link to="/settings" className="p-2 rounded-full hover:bg-muted transition-colors">
          <User className="w-5 h-5 text-muted-foreground" />
        </Link>
      </div>
    </header>
  );
};

export default AppTopbar;
