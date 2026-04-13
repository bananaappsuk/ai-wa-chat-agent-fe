import AppLayout from "@/components/AppLayout";
import { MessageCircle, Users, Bot, Megaphone } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { dashboard as dashboardApi, Lead, Agent } from "@/lib/api";

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ leads: 0, agents: 0, campaigns: 0, messages: 0 });
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [recentAgents, setRecentAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const data = await dashboardApi.stats();
        setStats(data.counts);
        setRecentLeads(data.recent_leads);
        setRecentAgents(data.recent_agents);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const userName = user?.full_name || "there";

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold">
          Dashboard <span className="text-gradient-green">Overview</span>
        </h1>
        <p className="text-muted-foreground mt-2">Welcome back, {userName}. Here's your current overview.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total Leads", value: stats.leads, icon: Users, color: "text-accent", link: "/leads" },
          { label: "AI Agents", value: stats.agents, icon: Bot, color: "text-accent", link: "/agents" },
          { label: "Campaigns", value: stats.campaigns, icon: Megaphone, color: "text-accent", link: "/campaigns" },
          { label: "Messages", value: stats.messages, icon: MessageCircle, color: "text-accent", link: "/live-chat" },
        ].map((s) => (
          <Link to={s.link} key={s.label} className="bg-card rounded-2xl p-5 hover:bg-surface-light transition-colors">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-3xl font-display font-bold">{loading ? "—" : s.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-semibold">Active Agents</h2>
            <Link to="/agents" className="text-accent text-sm font-medium">View All →</Link>
          </div>
          <div className="space-y-4">
            {loading ? (
              <div className="bg-card rounded-2xl p-5 text-center text-muted-foreground">Loading...</div>
            ) : recentAgents.length === 0 ? (
              <div className="bg-card rounded-2xl p-5 text-center text-muted-foreground">
                No agents yet. <Link to="/agents" className="text-accent underline">Deploy one</Link>
              </div>
            ) : (
              recentAgents.map((a) => (
                <div key={a.id} className="bg-card rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                      {a.logo_url ? <img src={a.logo_url} alt={a.name} className="w-full h-full object-cover" /> : <Bot className="w-5 h-5 text-accent" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{a.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{a.tone} tone</p>
                    </div>
                    <div className={`w-2.5 h-2.5 rounded-full ${a.status === "active" ? "bg-accent animate-pulse-green" : "bg-muted-foreground"}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted rounded-xl p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
                      <p className="text-sm font-display font-bold capitalize">{a.status}</p>
                    </div>
                    <div className="bg-muted rounded-xl p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tone</p>
                      <p className="text-sm font-display font-bold capitalize">{a.tone}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-semibold">Recent Leads</h2>
            <Link to="/leads" className="text-accent text-sm font-medium">View All →</Link>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="bg-card rounded-2xl p-5 text-center text-muted-foreground">Loading...</div>
            ) : recentLeads.length === 0 ? (
              <div className="bg-card rounded-2xl p-5 text-center text-muted-foreground">
                No leads yet. <Link to="/leads" className="text-accent underline">Add one</Link>
              </div>
            ) : (
              recentLeads.map((lead) => (
                <div key={lead.id} className="bg-card rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold">{lead.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.phone || "No phone"}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    lead.score === "hot" ? "bg-accent/10 text-accent" : lead.score === "warm" ? "bg-yellow-500/10 text-yellow-500" : "bg-muted text-muted-foreground"
                  }`}>
                    {(lead.score || "cold").toUpperCase()}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="bg-card rounded-2xl p-5 mt-4 border-l-2 border-accent">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-accent" />
              <p className="font-display font-semibold text-sm">Quick Tip</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.leads === 0
                ? "Start by adding leads to track your WhatsApp conversations."
                : `You have ${stats.leads} lead${stats.leads > 1 ? "s" : ""} and ${stats.agents} agent${stats.agents > 1 ? "s" : ""}. Keep growing!`}
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
