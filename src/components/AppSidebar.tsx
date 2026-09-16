import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Bot, Megaphone, Users, MessageCircle, Settings, HelpCircle, LogOut, Shield, Send, FileText, History, BarChart3, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Bot, label: "Agents", path: "/agents" },
  { icon: Megaphone, label: "Campaigns", path: "/campaigns" },
  { icon: Send, label: "WA Blast", path: "/whatsapp-blast" },
  { icon: FileText, label: "Templates", path: "/templates" },
  { icon: Users, label: "Leads", path: "/leads" },
  { icon: MessageCircle, label: "Live Chat", path: "/live-chat" },
  { icon: History, label: "Activity", path: "/activity" },
  { icon: BarChart3, label: "AI Analytics", path: "/ai-analytics" },
  { icon: CreditCard, label: "Billing", path: "/billing" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const isAdmin = user?.role === "admin";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const allNavItems = isAdmin ? [...navItems, { icon: Shield, label: "Admin", path: "/admin" }] : navItems;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 bg-sidebar flex flex-col border-r border-sidebar-border">
      <div className="p-5">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-green flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-display font-bold text-accent">AI Chat</span>
        </Link>
      </div>

      <div className="px-4 mb-4">
        <p className="text-accent text-sm font-semibold">AI Chat</p>
        <p className="text-xs text-muted-foreground">ENTERPRISE HUB</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {allNavItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? "bg-accent/10 text-accent font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 space-y-1">
        <Link
          to="/help"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
            location.pathname === "/help"
              ? "bg-accent/10 text-accent font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          }`}
        >
          <HelpCircle className="w-5 h-5" />
          Help
        </Link>
        <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent w-full">
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
