import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { MessageCircle, Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { auth } from "@/lib/api";

const passwordHints = (pw: string) => {
  const hints: string[] = [];
  if (pw.length < 8) hints.push("At least 8 characters");
  if (!/[A-Za-z]/.test(pw)) hints.push("Include a letter");
  if (!/\d/.test(pw)) hints.push("Include a number");
  return hints;
};

const ResetPassword = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const hints = useMemo(() => passwordHints(password), [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || token.length < 20) {
      toast.error("Invalid or missing reset link. Request a new one.");
      return;
    }
    if (hints.length) {
      toast.error("Password does not meet requirements", { description: hints.join(" · ") });
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await auth.resetPassword(token, password);
      toast.success("Password updated. You can sign in now.");
      navigate("/login");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Reset failed";
      if (/invalid|expired/i.test(msg)) {
        toast.error("This reset link is invalid or has expired. Request a new one.");
      } else {
        toast.error("Could not reset password", { description: msg.slice(0, 120) });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-card rounded-2xl p-6 max-w-md w-full text-center space-y-3">
          <h1 className="text-xl font-display font-bold">Invalid reset link</h1>
          <p className="text-sm text-muted-foreground">The link is missing a token. Request a new password reset.</p>
          <Link to="/forgot-password" className="text-accent text-sm hover:underline">
            Forgot password
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-green flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-display font-bold text-accent">AI Tele Chat</span>
          </Link>
          <h1 className="text-2xl font-display font-bold mb-2">Reset password</h1>
          <p className="text-sm text-muted-foreground">Choose a new password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">New password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={128}
                className="w-full bg-muted rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {hints.length > 0 && password.length > 0 && (
              <ul className="mt-2 text-xs text-muted-foreground space-y-0.5">
                {hints.map((h) => (
                  <li key={h}>• {h}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Confirm password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              maxLength={128}
              className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="block w-full py-3 rounded-xl gradient-green text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
