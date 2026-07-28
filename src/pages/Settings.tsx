import AppLayout from "@/components/AppLayout";
import { User, ArrowUp, Save } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { auth, profile as profileApi, settingsApi, AiSettings } from "@/lib/api";

const isValidIntlPhone = (value: string): boolean => {
  const trimmed = value.trim().replace(/[\s\-()]/g, "");
  if (!trimmed) return true;
  return /^\+[1-9]\d{7,14}$/.test(trimmed);
};

const passwordHints = (pw: string) => {
  const hints: string[] = [];
  if (pw.length < 8) hints.push("At least 8 characters");
  if (!/[A-Za-z]/.test(pw)) hints.push("Include a letter");
  if (!/\d/.test(pw)) hints.push("Include a number");
  return hints;
};

const Settings = () => {
  const { user, refresh } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState({
    full_name: "",
    first_name: "",
    last_name: "",
    display_name: "",
    email: "",
    company_name: "",
    phone: "",
    twilio_whatsapp_to: "",
    timezone: "UTC",
    locale: "en",
    avatar_url: "",
    plan: "free",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [notifications, setNotifications] = useState({
    insights: true,
    directMsg: true,
    maintenance: false,
    campaigns: true,
    security: true,
  });
  const [waStatus, setWaStatus] = useState<{
    environment: string;
    sender_configured: boolean;
    sender_type: string;
    status_callback_configured: boolean;
    signature_validation_enabled: boolean;
    public_url_configured: boolean;
    template_capability_configured: boolean;
    production_ready: boolean;
    warnings: string[];
  } | null>(null);
  const [ai, setAi] = useState<AiSettings | null>(null);
  const [aiSaving, setAiSaving] = useState(false);
  const [testPrompt, setTestPrompt] = useState("Hello, what can you help with?");
  const [testResult, setTestResult] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfile({
      full_name: user.full_name || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      display_name: user.display_name || "",
      email: user.email || "",
      company_name: user.company_name || "",
      phone: user.phone || "",
      twilio_whatsapp_to: user.twilio_whatsapp_to || "",
      timezone: user.timezone || "UTC",
      locale: user.locale || "en",
      avatar_url: user.avatar_url || "",
      plan: user.plan || "free",
    });
    if (user.notification_preferences) {
      setNotifications((n) => ({ ...n, ...user.notification_preferences }));
    }
    setLoading(false);
    settingsApi
      .whatsappStatus()
      .then(setWaStatus)
      .catch(() => setWaStatus(null));
    settingsApi
      .ai()
      .then(setAi)
      .catch(() => setAi(null));
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const wa = profile.twilio_whatsapp_to.trim();
    if (wa && !isValidIntlPhone(wa)) {
      toast.error("Business WhatsApp number must be international format", {
        description: "Example: +447700900000",
      });
      return;
    }
    const emailChanged = profile.email.trim().toLowerCase() !== (user.email || "").toLowerCase();
    if (emailChanged && !emailPassword) {
      toast.error("Enter your current password to change email");
      return;
    }
    setSaving(true);
    try {
      await profileApi.update({
        full_name: profile.full_name.trim(),
        first_name: profile.first_name.trim() || undefined,
        last_name: profile.last_name.trim() || undefined,
        display_name: profile.display_name.trim() || undefined,
        company_name: profile.company_name.trim(),
        phone: profile.phone.trim(),
        twilio_whatsapp_to: wa || null,
        timezone: profile.timezone.trim() || "UTC",
        locale: profile.locale.trim() || "en",
        notification_preferences: notifications,
        ...(emailChanged
          ? { email: profile.email.trim(), current_password: emailPassword }
          : {}),
      });
      setEmailPassword("");
      await refresh();
      toast.success("Profile updated");
    } catch (err) {
      toast.error("Failed to save profile", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    const hints = passwordHints(newPassword);
    if (hints.length) {
      toast.error("Password does not meet requirements", { description: hints.join(" · ") });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!currentPassword) {
      toast.error("Enter your current password");
      return;
    }
    setPwSaving(true);
    try {
      await auth.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (err) {
      toast.error("Could not change password", { description: (err as Error).message });
    } finally {
      setPwSaving(false);
    }
  };

  const handleAvatar = async (file: File | null) => {
    if (!file) return;
    try {
      await profileApi.uploadAvatar(file);
      await refresh();
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error("Avatar upload failed", { description: (err as Error).message });
    }
  };

  const initials = profile.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
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
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-accent" />
                </div>
                <h2 className="font-display font-semibold">Personal Information</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Full Name</label>
                  <input
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    maxLength={100}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Display Name</label>
                  <input
                    value={profile.display_name}
                    onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                    maxLength={100}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">First Name</label>
                  <input
                    value={profile.first_name}
                    onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                    maxLength={50}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Last Name</label>
                  <input
                    value={profile.last_name}
                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                    maxLength={50}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Email Address</label>
                  <input
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Timezone</label>
                  <input
                    value={profile.timezone}
                    onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                    placeholder="UTC"
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Locale</label>
                  <input
                    value={profile.locale}
                    onChange={(e) => setProfile({ ...profile, locale: e.target.value })}
                    maxLength={16}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Phone</label>
                  <input
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    maxLength={20}
                    className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                {profile.email.trim().toLowerCase() !== (user?.email || "").toLowerCase() && (
                  <div className="md:col-span-2">
                    <label className="text-sm text-muted-foreground mb-1.5 block">
                      Current password (required to change email)
                    </label>
                    <input
                      type="password"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card rounded-2xl p-6">
              <h2 className="font-display font-semibold mb-5">Company Information</h2>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Company Name</label>
                <input
                  value={profile.company_name}
                  onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                  maxLength={100}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>

            <div className="bg-card rounded-2xl p-6">
              <h2 className="font-display font-semibold mb-5">WhatsApp Configuration</h2>
              <div className="mb-5">
                <label className="text-sm text-muted-foreground mb-1.5 block">Business WhatsApp Number</label>
                <input
                  value={profile.twilio_whatsapp_to}
                  onChange={(e) => setProfile({ ...profile, twilio_whatsapp_to: e.target.value })}
                  placeholder="+14155238886"
                  maxLength={32}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Your Twilio WhatsApp sender number (E.164). Inbound messages to this number route to your account.
                </p>
              </div>
              {waStatus ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Environment</span>
                    <span className="font-medium capitalize">{waStatus.environment}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Sender</span>
                    <span className="font-medium">
                      {waStatus.sender_configured ? "Configured" : "Not configured"} · {waStatus.sender_type}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Status callback</span>
                    <span className="font-medium">{waStatus.status_callback_configured ? "OK" : "Missing"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Signature validation</span>
                    <span className="font-medium">{waStatus.signature_validation_enabled ? "Enabled" : "Disabled"}</span>
                  </div>
                  {waStatus.warnings?.length > 0 && (
                    <div className="mt-3 rounded-xl bg-muted p-3 space-y-1">
                      {waStatus.warnings.map((w) => (
                        <p key={w} className="text-xs text-destructive">{w}</p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unable to load WhatsApp status.</p>
              )}
            </div>

            <div className="bg-card rounded-2xl p-6">
              <h2 className="font-display font-semibold mb-5">Password</h2>
              <div className="grid gap-3 max-w-md">
                <input
                  type="password"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm"
                />
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-muted rounded-xl px-4 py-3 text-sm"
                />
                <button
                  onClick={handleChangePassword}
                  disabled={pwSaving}
                  className="px-5 py-2.5 rounded-xl gradient-green text-sm text-primary-foreground font-medium disabled:opacity-50 w-fit"
                >
                  {pwSaving ? "Updating..." : "Change password"}
                </button>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-6">
              <h2 className="font-display font-semibold mb-5">Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { key: "insights", label: "AI Insights Summary", desc: "Daily digest of bot performance and lead generation." },
                  { key: "directMsg", label: "Direct Message Alerts", desc: "Instant notification when a human takeover is requested." },
                  { key: "campaigns", label: "Campaign updates", desc: "Alerts when campaigns complete or fail." },
                  { key: "security", label: "Security notices", desc: "Password and email change alerts." },
                  { key: "maintenance", label: "System Maintenance", desc: "Alerts for API downtime or maintenance windows." },
                ].map((n) => (
                  <div key={n.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{n.label}</p>
                      <p className="text-xs text-muted-foreground">{n.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setNotifications({
                          ...notifications,
                          [n.key]: !notifications[n.key as keyof typeof notifications],
                        })
                      }
                      className={`w-11 h-6 rounded-full transition-colors relative ${
                        notifications[n.key as keyof typeof notifications] ? "bg-accent" : "bg-muted"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-foreground absolute top-0.5 transition-transform ${
                          notifications[n.key as keyof typeof notifications] ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-2xl p-6">
              <h2 className="font-display font-semibold mb-5">AI Configuration</h2>
              {!ai ? (
                <p className="text-sm text-muted-foreground">Unable to load AI settings.</p>
              ) : (
                <div className="space-y-4">
                  <label className="flex items-center justify-between text-sm">
                    <span>Enable AI replies</span>
                    <input
                      type="checkbox"
                      checked={ai.enabled}
                      onChange={(e) => setAi({ ...ai, enabled: e.target.checked })}
                    />
                  </label>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Model</label>
                      <select
                        value={ai.model}
                        onChange={(e) => setAi({ ...ai, model: e.target.value })}
                        className="w-full bg-muted rounded-xl px-3 py-2 text-sm"
                      >
                        {(ai.allowed_models || [ai.model]).map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Tone</label>
                      <input
                        value={ai.ai_tone || ""}
                        onChange={(e) => setAi({ ...ai, ai_tone: e.target.value })}
                        className="w-full bg-muted rounded-xl px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Max output tokens</label>
                      <input
                        type="number"
                        value={ai.max_output_tokens}
                        onChange={(e) => setAi({ ...ai, max_output_tokens: Number(e.target.value) })}
                        className="w-full bg-muted rounded-xl px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Temperature</label>
                      <input
                        type="number"
                        step="0.1"
                        value={ai.temperature}
                        onChange={(e) => setAi({ ...ai, temperature: Number(e.target.value) })}
                        className="w-full bg-muted rounded-xl px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Custom instructions</label>
                    <textarea
                      value={ai.ai_custom_instructions || ""}
                      onChange={(e) => setAi({ ...ai, ai_custom_instructions: e.target.value })}
                      maxLength={4000}
                      rows={3}
                      className="w-full bg-muted rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {[
                      ["summaries_enabled", "Summaries"],
                      ["extraction_enabled", "Extraction"],
                      ["moderation_enabled", "Moderation"],
                      ["analytics_enabled", "Analytics"],
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!ai[key as keyof AiSettings]}
                          onChange={(e) => setAi({ ...ai, [key]: e.target.checked })}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  {ai.usage && (
                    <p className="text-xs text-muted-foreground">
                      Usage today: {ai.usage.tokens_today}/{ai.usage.daily_token_limit} tokens · Month cost: $
                      {ai.usage.cost_this_month.toFixed(2)}/{ai.usage.monthly_cost_limit}
                    </p>
                  )}
                  <button
                    disabled={aiSaving}
                    onClick={async () => {
                      setAiSaving(true);
                      try {
                        const updated = await settingsApi.updateAi({
                          enabled: ai.enabled,
                          model: ai.model,
                          temperature: ai.temperature,
                          max_output_tokens: ai.max_output_tokens,
                          summaries_enabled: ai.summaries_enabled,
                          extraction_enabled: ai.extraction_enabled,
                          moderation_enabled: ai.moderation_enabled,
                          analytics_enabled: ai.analytics_enabled,
                          ai_tone: ai.ai_tone,
                          ai_custom_instructions: ai.ai_custom_instructions,
                          ai_business_description: ai.ai_business_description,
                          ai_disallowed_topics: ai.ai_disallowed_topics,
                          ai_escalation_rules: ai.ai_escalation_rules,
                        });
                        setAi(updated);
                        toast.success("AI settings saved");
                      } catch (err) {
                        toast.error((err as Error).message);
                      } finally {
                        setAiSaving(false);
                      }
                    }}
                    className="px-4 py-2 rounded-xl gradient-green text-sm text-primary-foreground disabled:opacity-50"
                  >
                    {aiSaving ? "Saving..." : "Save AI settings"}
                  </button>
                  <div className="border-t border-border pt-4 space-y-2">
                    <p className="text-sm font-medium">Test prompt (does not send WhatsApp)</p>
                    <textarea
                      value={testPrompt}
                      onChange={(e) => setTestPrompt(e.target.value)}
                      rows={2}
                      className="w-full bg-muted rounded-xl px-3 py-2 text-sm"
                    />
                    <button
                      disabled={testLoading}
                      onClick={async () => {
                        setTestLoading(true);
                        try {
                          const res = await settingsApi.testAi(testPrompt);
                          setTestResult(res.response || res.error_category || "No response");
                          toast.success(res.success ? "Test OK" : "Test completed with issues");
                        } catch (err) {
                          toast.error((err as Error).message);
                        } finally {
                          setTestLoading(false);
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-muted text-sm disabled:opacity-50"
                    >
                      {testLoading ? "Running..." : "Run test"}
                    </button>
                    {testResult && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{testResult}</p>}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-green text-sm text-primary-foreground font-medium disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-card rounded-2xl p-6 text-center">
              <h2 className="font-display font-semibold mb-4">Profile Picture</h2>
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-semibold">{initials}</span>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleAvatar(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-sm text-accent hover:underline"
              >
                Upload photo
              </button>
              {profile.avatar_url && (
                <button
                  type="button"
                  className="block mx-auto mt-2 text-xs text-muted-foreground hover:underline"
                  onClick={async () => {
                    try {
                      await profileApi.deleteAvatar();
                      await refresh();
                      toast.success("Avatar removed");
                    } catch (err) {
                      toast.error((err as Error).message);
                    }
                  }}
                >
                  Remove
                </button>
              )}
            </div>

            <div className="gradient-purple rounded-2xl p-6 text-center glow-purple">
              <h3 className="font-display font-bold text-secondary-foreground">
                {profile.display_name || profile.full_name || "Unnamed"}
              </h3>
              <p className="text-xs text-secondary-foreground/70 mb-3">{profile.company_name || "No company"}</p>
              <div className="flex justify-center gap-2 mb-4">
                <span className="px-2.5 py-1 rounded-full bg-secondary-foreground/10 text-[10px] text-secondary-foreground capitalize">
                  {profile.plan} Plan
                </span>
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
