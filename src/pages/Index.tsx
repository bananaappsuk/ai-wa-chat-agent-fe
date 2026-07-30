import { Link, useNavigate } from "react-router-dom";
import { MessageCircle, Bot, Megaphone, BarChart3, Zap, Shield, Check, Menu, X, Mail, Phone, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BOOK_DEMO_URL, CONTACT_EMAIL, CONTACT_PHONE, COMPANY_NAME, COMPANY_ADDRESS, PARENT_COMPANY, PARENT_WEBSITE } from "@/lib/constants";
import { billing, tokenStore, type BillingPlan } from "@/lib/api";

const navLinks = [
  { label: "Features", path: "#features" },
  { label: "How it Works", path: "#how-it-works" },
  { label: "Pricing", path: "#pricing" },
  { label: "About", path: "/about" },
  { label: "Contact", path: "/contact" },
];

const features = [
  { icon: Bot, title: "Autonomous Agents", desc: "AI agents trained on your business — sales, support, inbound, outbound. Reply like a human, 24/7." },
  { icon: Megaphone, title: "WhatsApp Blasts", desc: "Upload a list, pick an agent, send. Opt-out (STOP) handled automatically for GDPR compliance." },
  { icon: BarChart3, title: "Lead Scoring", desc: "Every inbound is captured, scored, tagged and routed to the right agent flow." },
  { icon: Shield, title: "UK & GDPR Ready", desc: "E.164 +44 defaults, STOP/START keywords, welcome + T&C on first contact, DNC logging." },
  { icon: Zap, title: "Live Chat + Handoff", desc: "Watch conversations in real time. Step in any time — the AI hands over cleanly." },
  { icon: MessageCircle, title: "Twilio Native", desc: "Plug your Twilio WhatsApp number in. We handle signature validation, inbound routing, and delivery." },
];

const steps = [
  { num: "1", title: "Connect Twilio", desc: "Plug in your Twilio WhatsApp credentials and pick your sender number." },
  { num: "2", title: "Build your agent", desc: "Pick a tone, add your knowledge, welcome message and T&C. Tweak the prompt." },
  { num: "3", title: "Go live", desc: "Point Twilio's webhook at us. Inbound messages get AI replies instantly." },
];

const FALLBACK_PLANS: BillingPlan[] = [
  {
    key: "starter",
    name: "Starter",
    price_gbp: 39,
    price_display: "£39",
    period: "/mo",
    popular: false,
    stripe_checkout: true,
    contact_sales: false,
    features: ["1 WhatsApp Number", "2 Team Members", "500 AI Conversations/month", "Live Chat + AI Auto Replies"],
    entitlements: {},
    cta: "Start free trial",
  },
  {
    key: "professional",
    name: "Professional",
    price_gbp: 79,
    price_display: "£79",
    period: "/mo",
    popular: true,
    stripe_checkout: true,
    contact_sales: false,
    features: ["Everything in Starter", "5 Team Members", "Campaigns & WA Broadcast", "5,000 AI Conversations/month"],
    entitlements: {},
    cta: "Start free trial",
  },
  {
    key: "business",
    name: "Business",
    price_gbp: 149,
    price_display: "£149",
    period: "/mo",
    popular: false,
    stripe_checkout: true,
    contact_sales: false,
    features: ["Everything in Professional", "15 Team Members", "API Access & Webhooks", "25,000 AI Conversations/month"],
    entitlements: {},
    cta: "Start free trial",
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price_gbp: null,
    price_display: "Custom",
    period: "",
    popular: false,
    stripe_checkout: false,
    contact_sales: true,
    features: ["Unlimited users & numbers", "White label + SSO", "Dedicated support & SLA"],
    entitlements: {},
    cta: "Contact Sales",
  },
];

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.6 } };

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [plans, setPlans] = useState<BillingPlan[]>(FALLBACK_PLANS);
  const [disclaimer, setDisclaimer] = useState(
    "Twilio/Meta WhatsApp conversation charges are billed separately from your subscription."
  );
  const [trialDays, setTrialDays] = useState(14);
  const [contactSalesUrl, setContactSalesUrl] = useState(BOOK_DEMO_URL);
  const navigate = useNavigate();

  useEffect(() => {
    billing
      .plans()
      .then((res) => {
        setPlans(res.plans);
        setDisclaimer(res.disclaimer);
        setTrialDays(res.trial_days);
        setContactSalesUrl(res.contact_sales_url || BOOK_DEMO_URL);
      })
      .catch(() => undefined);
  }, []);

  const onPlanCta = (p: BillingPlan) => {
    if (p.contact_sales) {
      window.open(contactSalesUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (tokenStore.get()) {
      navigate(`/billing?plan=${encodeURIComponent(p.key)}`);
    } else {
      navigate(`/signup?plan=${encodeURIComponent(p.key)}`);
    }
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
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) =>
              l.path.startsWith("#") ? (
                <a key={l.label} href={l.path} className="text-sm text-muted-foreground hover:text-foreground">{l.label}</a>
              ) : (
                <Link key={l.label} to={l.path} className="text-sm text-muted-foreground hover:text-foreground">{l.label}</Link>
              )
            )}
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
            <a href={BOOK_DEMO_URL} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-full gradient-green text-sm font-medium text-primary-foreground">Book a Demo</a>
          </div>
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 py-4 space-y-3">
            {navLinks.map((l) =>
              l.path.startsWith("#") ? (
                <a key={l.label} href={l.path} className="block text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>{l.label}</a>
              ) : (
                <Link key={l.label} to={l.path} className="block text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>{l.label}</Link>
              )
            )}
            <Link to="/login" className="block text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Sign in</Link>
            <a href={BOOK_DEMO_URL} target="_blank" rel="noopener noreferrer" className="block py-2 px-4 rounded-full gradient-green text-center text-sm font-medium text-primary-foreground" onClick={() => setMobileMenuOpen(false)}>Book a Demo</a>
          </div>
        )}
      </nav>

      <section className="pt-28 pb-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.h1 {...fadeUp} className="text-4xl md:text-6xl font-display font-bold mb-6">
            AI WhatsApp agents that sell and support while you sleep
          </motion.h1>
          <motion.p {...fadeUp} transition={{ delay: 0.1, duration: 0.6 }} className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Connect Twilio, train an agent on your business, and go live — with GDPR-ready consent, blasts, and live handoff built in.
          </motion.p>
          <motion.div {...fadeUp} transition={{ delay: 0.2, duration: 0.6 }} className="flex flex-wrap justify-center gap-3">
            <a href={BOOK_DEMO_URL} target="_blank" rel="noopener noreferrer" className="px-8 py-3 rounded-full gradient-green text-primary-foreground font-medium glow-green">
              Book a Demo
            </a>
            <a href="#pricing" className="px-8 py-3 rounded-full glass glass-border font-medium">
              View pricing
            </a>
          </motion.div>
        </div>
      </section>

      <section id="features" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Everything you need to run WhatsApp</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} {...fadeUp} transition={{ delay: i * 0.05, duration: 0.6 }} className="rounded-2xl bg-card p-6">
                <div className="w-10 h-10 rounded-xl gradient-green flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-display font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 px-4 sm:px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">How it Works</h2>
          </motion.div>
          <div className="space-y-8">
            {steps.map((s, i) => (
              <motion.div key={s.num} {...fadeUp} transition={{ delay: i * 0.1, duration: 0.6 }} className="flex gap-6 items-start">
                <div className="w-12 h-12 rounded-full gradient-green flex items-center justify-center text-primary-foreground font-display font-bold flex-shrink-0">
                  {s.num}
                </div>
                <div>
                  <h3 className="text-lg font-display font-semibold mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-6">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              {trialDays}-day free trial on paid plans. {disclaimer}
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 mt-10">
            {plans.map((p, i) => (
              <motion.div
                key={p.key}
                {...fadeUp}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className={`rounded-2xl p-6 ${p.popular ? "gradient-green text-primary-foreground glow-green" : "bg-card"}`}
              >
                {p.popular && (
                  <div className="text-xs font-semibold bg-primary-foreground/20 rounded-full px-3 py-1 inline-block mb-3">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-lg font-display font-semibold">{p.name}</h3>
                <div className="mt-2 mb-6">
                  <span className="text-3xl font-display font-bold">{p.price_display}</span>
                  <span className="text-sm opacity-70">{p.period}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {p.features.slice(0, 8).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => onPlanCta(p)}
                  className={`w-full text-center py-3 rounded-full font-medium text-sm ${
                    p.popular ? "bg-primary-foreground text-background" : "glass glass-border text-foreground"
                  }`}
                >
                  {p.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6">
        <motion.div {...fadeUp} className="max-w-4xl mx-auto rounded-3xl gradient-green p-10 md:p-16 text-center glow-green">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
            Ready to supercharge your WhatsApp?
          </h2>
          <p className="text-primary-foreground/80 mb-8">Book a 20-minute demo and see it running on your own number.</p>
          <a href={BOOK_DEMO_URL} target="_blank" rel="noopener noreferrer" className="px-8 py-3 rounded-full bg-primary-foreground text-background font-medium">
            Book a Demo
          </a>
        </motion.div>
      </section>

      <footer className="border-t border-border py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg gradient-green flex items-center justify-center">
                <MessageCircle className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-accent">{COMPANY_NAME}</span>
            </div>
            <p className="text-xs text-muted-foreground">Part of {PARENT_COMPANY}</p>
            <a href={PARENT_WEBSITE} className="text-xs text-accent hover:underline" target="_blank" rel="noopener noreferrer">
              {PARENT_WEBSITE}
            </a>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Product</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="text-xs text-muted-foreground hover:text-foreground">Features</a></li>
              <li><a href="#pricing" className="text-xs text-muted-foreground hover:text-foreground">Pricing</a></li>
              <li><a href={BOOK_DEMO_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground">Book a demo</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Company</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-xs text-muted-foreground hover:text-foreground">About</Link></li>
              <li><Link to="/contact" className="text-xs text-muted-foreground hover:text-foreground">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Contact</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {CONTACT_EMAIL}</li>
              <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {CONTACT_PHONE}</li>
              <li className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 mt-0.5" /> {COMPANY_ADDRESS}</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
