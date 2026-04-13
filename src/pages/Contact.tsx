import { Link } from "react-router-dom";
import { MessageCircle, Mail, Phone, Globe, User, Send, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  COMPANY_NAME, CONTACT_EMAIL, CONTACT_PHONE, COMPANY_ADDRESS_LINES,
  BOOK_DEMO_URL, PARENT_COMPANY, PARENT_WEBSITE, CONTACT_PERSON, CONTACT_ROLE,
} from "@/lib/constants";

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill name, email and message");
      return;
    }
    setSending(true);
    const subject = encodeURIComponent(`Enquiry from ${form.name}`);
    const body = encodeURIComponent(
      `${form.message}\n\n— ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone || "—"}`
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setTimeout(() => setSending(false), 500);
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-green flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-display font-bold text-accent">{COMPANY_NAME}</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-3">Get in touch</h1>
          <p className="text-muted-foreground">We reply within one business day — or book a slot straight on the calendar.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl p-8">
            <h2 className="text-2xl font-display font-bold mb-6">Contact Information</h2>

            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Company</h3>
            <div className="mb-6 space-y-1">
              {COMPANY_ADDRESS_LINES.map((l, i) => (
                <div key={i} className={i === 0 ? "font-semibold text-foreground" : "text-sm text-muted-foreground"}>{l}</div>
              ))}
            </div>

            <div className="space-y-3 mb-6">
              <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-3 text-sm hover:text-accent">
                <span className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center"><Mail className="w-4 h-4 text-accent" /></span>
                {CONTACT_EMAIL}
              </a>
              <a href={PARENT_WEBSITE} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:text-accent">
                <span className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center"><Globe className="w-4 h-4 text-accent" /></span>
                www.nextgentechs.io
              </a>
            </div>

            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Primary Contact</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-accent" /></span>
                <div>
                  <div className="font-semibold text-sm">{CONTACT_PERSON} — {CONTACT_ROLE}</div>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-xs text-muted-foreground hover:text-accent">{CONTACT_EMAIL}</a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0"><Phone className="w-4 h-4 text-accent" /></span>
                <div>
                  <div className="text-xs text-muted-foreground">Phone</div>
                  <a href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`} className="font-semibold text-sm hover:text-accent">{CONTACT_PHONE}</a>
                </div>
              </div>
            </div>

            <a href={BOOK_DEMO_URL} target="_blank" rel="noopener noreferrer" className="mt-8 block text-center py-3 rounded-full gradient-green text-primary-foreground font-medium">
              Book a Demo instead →
            </a>
          </div>

          <form onSubmit={submit} className="bg-card rounded-2xl p-8">
            <h2 className="text-2xl font-display font-bold mb-6">Send us a message</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your full name" className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+44 7000 000000" className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Message *</label>
                <textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us about your requirements..." className="w-full bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <button type="submit" disabled={sending} className="w-full py-3 rounded-xl gradient-green text-sm font-semibold text-primary-foreground glow-green disabled:opacity-50 flex items-center justify-center gap-2">
                <Send className="w-4 h-4" /> {sending ? "Opening email..." : "Send Message"}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-16 text-center text-xs text-muted-foreground">
          Powered by <a href={PARENT_WEBSITE} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{PARENT_COMPANY}</a>
        </div>
      </section>
    </div>
  );
};

export default Contact;
