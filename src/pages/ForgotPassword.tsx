import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { auth } from "@/lib/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const res = await auth.forgotPassword(trimmed);
      setSent(true);
      toast.success(res.message || "If an account exists, a reset link has been sent.");
    } catch {
      // Still show generic success to avoid enumeration via error timing/messages
      setSent(true);
      toast.success("If an account exists for that email, a reset link has been sent.");
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-2xl font-display font-bold mb-2">Forgot password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send a reset link if an account exists.
          </p>
        </div>

        {sent ? (
          <div className="bg-card rounded-2xl p-6 space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              If an account exists for that email, a reset link has been sent. Check your inbox and spam folder.
            </p>
            <Link to="/login" className="inline-block text-sm text-accent hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-6 space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Email</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                maxLength={255}
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="block w-full py-3 rounded-xl gradient-green text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="text-accent hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
