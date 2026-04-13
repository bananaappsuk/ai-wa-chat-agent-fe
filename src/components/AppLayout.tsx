import { ReactNode, useState } from "react";
import AppSidebar from "./AppSidebar";
import AppTopbar from "./AppTopbar";
import MobileSidebar from "./MobileSidebar";
import { Menu } from "lucide-react";

const AppLayout = ({ children }: { children: ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AppSidebar />
        <AppTopbar />
      </div>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-background/90 backdrop-blur-xl border-b border-border flex items-center justify-between px-4">
        <button onClick={() => setMobileOpen(true)} className="p-2">
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <span className="text-accent font-display font-bold">AI Chat</span>
        <div className="w-9" />
      </div>

      {/* Mobile sidebar */}
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className="lg:ml-60 lg:pt-16 pt-14 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
};

export default AppLayout;
