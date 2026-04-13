import AppLayout from "@/components/AppLayout";
import { User, ArrowUp, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { profile as profileApi } from "@/lib/api";

const Settings = () => {
  const { user, refresh } = useAuth();
  const [profile, setProfile] = useState({ full_name: "", email: "", company_name: "", phone: "", plan: "free" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState({ insights: true, directMsg: true, maintenance: false });

  useEffect(() => {
    if (!user) return;
    setProfile({
      full_name: user.full_name || "",
      email: user.email || "",
      company_name: user.company_name || "",
      phone: user.phone || "",
      plan: user.plan || "free",
    });
    setLoading(false);
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await profileApi.update({
        full_name: profile.full_name.trim(),
        company_name: profile.company_name.trim(),
        phone: profile.phone.trim(),
      });
      await refresh();
      toast.success("Profile updated");
    } catch (err) {
      toast.error("Failed to save profile", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const initials = profile.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading profile...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Account Settings</h1>
        <p className="text-muted-foreground mb-8">Manage your workspace preferences and personal details.</p>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center"><User className="w-4 h-4 text-accent" /></div>
                <h2 className="font-display font-semibold">Personal Information</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Full Name</label>
                  <input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} maxLength={100}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Email Address</label>
                  <input value={profile.email} disabled
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-muted-foreground cursor-not-allowed" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Company Name</label>
                  <input value={profile.company_name} onChange={(e) => setProfile({ ...profile, company_name: e.target.value })} maxLength={100}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Phone</label>
                  <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} maxLength={20}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                </div>
              </div>
              <button onClick={handleSave} disabled={saving} className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-green text-sm text-primary-foreground font-medium disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            <div className="bg-card rounded-2xl p-6">
              <h2 className="font-display font-semibold mb-5">Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { key: "insights", label: "AI Insights Summary", desc: "Daily digest of bot performance and lead generation." },
                  { key: "directMsg", label: "Direct Message Alerts", desc: "Instant notification when a human takeover is requested." },
                  { key: "maintenance", label: "System Maintenance", desc: "Alerts for API downtime or maintenance windows." },
                ].map((n) => (
                  <div key={n.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{n.label}</p>
                      <p className="text-xs text-muted-foreground">{n.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifications({ ...notifications, [n.key]: !notifications[n.key as keyof typeof notifications] })}
                      className={`w-11 h-6 rounded-full transition-colors relative ${
                        notifications[n.key as keyof typeof notifications] ? "bg-accent" : "bg-muted"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-foreground absolute top-0.5 transition-transform ${
                        notifications[n.key as keyof typeof notifications] ? "translate-x-5" : "translate-x-0.5"
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="gradient-purple rounded-2xl p-6 text-center glow-purple">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-semibold">{initials}</span>
              </div>
              <h3 className="font-display font-bold text-secondary-foreground">{profile.full_name || "Unnamed"}</h3>
              <p className="text-xs text-secondary-foreground/70 mb-3">{profile.company_name || "No company"}</p>
              <div className="flex justify-center gap-2 mb-4">
                <span className="px-2.5 py-1 rounded-full bg-secondary-foreground/10 text-[10px] text-secondary-foreground capitalize">{profile.plan} Plan</span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-xs text-secondary-foreground/80">
                  <span>Subscription</span>
                  <span className="text-accent font-medium capitalize">{profile.plan}</span>
                </div>
                <div className="flex justify-between text-xs text-secondary-foreground/80">
                  <span>Email</span>
                  <span className="truncate ml-2">{profile.email}</span>
                </div>
              </div>
              <button className="w-full py-2.5 rounded-xl gradient-green text-sm font-medium text-primary-foreground flex items-center justify-center gap-1.5">
                <ArrowUp className="w-3.5 h-3.5" /> Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
