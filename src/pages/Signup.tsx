import { Link, useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type FormErrors = { name?: string; email?: string; company?: string; phone?: string; password?: string };

const Signup = () => {
  const { signUp } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "+44 ", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (k === "phone" && !value.startsWith("+44")) {
      value = "+44 ";
    }
    setForm({ ...form, [k]: value });
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validate = (): boolean => {
    const errs: FormErrors = {};
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();
    const trimmedCompany = form.company.trim();

    if (!trimmedName) {
      errs.name = "Full name is required";
    } else if (trimmedName.length < 2) {
      errs.name = "Name must be at least 2 characters";
    } else if (trimmedName.length > 100) {
      errs.name = "Name must be less than 100 characters";
    }

    if (!trimmedEmail) {
      errs.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errs.email = "Enter a valid email address";
    } else if (trimmedEmail.length > 255) {
      errs.email = "Email must be less than 255 characters";
    }

    if (!trimmedCompany) {
      errs.company = "Company name is required";
    } else if (trimmedCompany.length > 100) {
      errs.company = "Company name must be less than 100 characters";
    }

    const phoneDigits = form.phone.replace(/\D/g, "");
    if (!form.phone.trim() || form.phone.trim() === "+44") {
      errs.phone = "Phone number is required";
    } else if (!phoneDigits.startsWith("44") || phoneDigits.length < 12 || phoneDigits.length > 13) {
      errs.phone = "Enter a valid UK number (e.g. +44 7700 900000)";
    }

    if (!form.password) {
      errs.password = "Password is required";
    } else if (form.password.length < 8) {
      errs.password = "Password must be at least 8 characters";
    } else if (!/[A-Z]/.test(form.password)) {
      errs.password = "Password must contain an uppercase letter";
    } else if (!/[a-z]/.test(form.password)) {
      errs.password = "Password must contain a lowercase letter";
    } else if (!/[0-9]/.test(form.password)) {
      errs.password = "Password must contain a number";
    } else if (!/[^A-Za-z0-9]/.test(form.password)) {
      errs.password = "Password must contain a special character";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await signUp({
        email: form.email.trim(),
        password: form.password,
        full_name: form.name.trim(),
        company_name: form.company.trim(),
        phone: form.phone.trim(),
      });
      toast.success("Account created!", { description: "You're now logged in." });
      navigate("/dashboard");
    } catch (err) {
      toast.error("Signup failed", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: "name", label: "Full Name", type: "text", placeholder: "John Doe", maxLength: 100 },
    { key: "email", label: "Email", type: "email", placeholder: "you@company.com", maxLength: 255 },
    { key: "company", label: "Company Name", type: "text", placeholder: "Acme Inc.", maxLength: 100 },
    { key: "phone", label: "Phone Number (UK)", type: "tel", placeholder: "+44 7700 900000", maxLength: 20 },
    { key: "password", label: "Password", type: "password", placeholder: "Min 8 chars, upper, lower, number, special", maxLength: 128 },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-green flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-display font-bold text-accent">AI Chat</span>
          </Link>
          <h1 className="text-2xl font-display font-bold mb-2">Create your account</h1>
          <p className="text-sm text-muted-foreground">Start automating your WhatsApp today</p>
        </div>

        <form onSubmit={handleSignup} className="bg-card rounded-2xl p-6 space-y-4">
          {fields.map((f) => {
            const fieldError = errors[f.key as keyof FormErrors];
            return (
              <div key={f.key}>
                <label className="text-sm text-muted-foreground mb-1.5 block">{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key as keyof typeof form]}
                  onChange={update(f.key)}
                  placeholder={f.placeholder}
                  maxLength={f.maxLength}
                  className={`w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
                    fieldError ? "ring-2 ring-red-500/50" : "focus:ring-accent/30"
                  }`}
                />
                {fieldError && <p className="text-xs text-red-400 mt-1">{fieldError}</p>}
              </div>
            );
          })}
          <button type="submit" disabled={loading} className="block w-full py-3 rounded-xl gradient-green text-center text-sm font-medium text-primary-foreground glow-green disabled:opacity-50">
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account? <Link to="/login" className="text-accent hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
