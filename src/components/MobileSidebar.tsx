import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Bot, Megaphone, Users, MessageCircle, Settings, X, LogOut, Shield, Send, History, CreditCard, HelpCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Bot, label: "Agents", path: "/agents" },
  { icon: Megaphone, label: "Campaigns", path: "/campaigns" },
  { icon: Send, label: "WA Blast", path: "/whatsapp-blast" },
  { icon: Users, label: "Leads", path: "/leads" },
  { icon: MessageCircle, label: "Live Chat", path: "/live-chat" },
  { icon: History, label: "Activity", path: "/activity" },
  { icon: CreditCard, label: "Billing", path: "/billing" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const MobileSidebar = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const isAdmin = user?.role === "admin";

  const handleSignOut = async () => {
    onClose();
    await signOut();
    navigate("/login");
  };

  const allNavItems = isAdmin ? [...navItems, { icon: Shield, label: "Admin", path: "/admin" }] : navItems;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full w-64 bg-sidebar p-4">
        <div className="flex items-center justify-between mb-6">
          <span className="text-accent font-display font-bold text-lg">AI Chat</span>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <nav className="space-y-1">
          {allNavItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active ? "bg-accent/10 text-accent font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 pt-4 border-t border-sidebar-border space-y-1">
          <Link
            to="/help"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              location.pathname === "/help"
                ? "bg-accent/10 text-accent font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
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
      </div>
    </div>
  );
};

export default MobileSidebar;
