import { Link, useLocation } from "react-router-dom";
import { Bell, User, Plus } from "lucide-react";

const topNavItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Agents", path: "/agents" },
  { label: "Campaigns", path: "/campaigns" },
  { label: "Leads", path: "/leads" },
  { label: "Settings", path: "/settings" },
];

const AppTopbar = () => {
  const location = useLocation();

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
        <div className="px-3 py-1.5 rounded-full glass glass-border text-xs text-muted-foreground">
          Balance: $240.50
        </div>
        <Link to="/campaigns" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full gradient-green text-sm text-primary-foreground font-medium">
          <Plus className="w-3.5 h-3.5" />
          New Campaign
        </Link>
        <button className="p-2 rounded-full hover:bg-muted transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
        </button>
        <button className="p-2 rounded-full hover:bg-muted transition-colors">
          <User className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
};

export default AppTopbar;
