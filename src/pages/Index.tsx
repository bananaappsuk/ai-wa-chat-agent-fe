import { Link } from "react-router-dom";
import { MessageCircle, Bot, Megaphone, BarChart3, Zap, Shield, Check, Menu, X, Mail, Phone, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { BOOK_DEMO_URL, CONTACT_EMAIL, CONTACT_PHONE, COMPANY_NAME, COMPANY_ADDRESS, PARENT_COMPANY, PARENT_WEBSITE } from "@/lib/constants";

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

const plans = [
  { name: "Starter", price: "£49", period: "/mo", features: ["1,000 conversations/mo", "1 AI agent", "Basic analytics"], cta: "Book a Demo", popular: false },
  { name: "Professional", price: "£149", period: "/mo", features: ["5,000 conversations/mo", "5 AI agents", "Custom knowledge base", "CRM integration"], cta: "Book a Demo", popular: true },
  { name: "Custom", price: "Contact", period: "", features: ["Tailored for high-volume", "Dedicated support"], cta: "Contact Sales", popular: false },
];

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.6 } };

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((l) => l.path.startsWith("#") ? (
              <a key={l.path} href={l.path} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</a>
            ) : (
              <Link key={l.path} to={l.path} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign In</Link>
            <a href={BOOK_DEMO_URL} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-full gradient-green text-sm font-medium text-primary-foreground">Book a Demo</a>
          </div>
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-card border-t border-border p-4 space-y-3">
            {navLinks.map((l) => l.path.startsWith("#") ? (
              <a key={l.path} href={l.path} className="block py-2 text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>{l.label}</a>
            ) : (
              <Link key={l.path} to={l.path} className="block py-2 text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>{l.label}</Link>
            ))}
            <Link to="/login" className="block py-2 text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
            <a href={BOOK_DEMO_URL} target="_blank" rel="noopener noreferrer" className="block py-2 px-4 rounded-full gradient-green text-center text-sm font-medium text-primary-foreground" onClick={() => setMobileMenuOpen(false)}>Book a Demo</a>
          </div>
        )}
      </nav>

      <section className="pt-32 pb-20 px-4 sm:px-6 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(152_76%_50%/0.05),transparent_60%)]" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div {...fadeUp}>
            <div className="inline-block px-3 py-1 rounded-full glass glass-border text-xs text-accent mb-6">
              ✨ WHATSAPP AI FOR UK BUSINESSES
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-tight mb-6">
              Automate your<br />WhatsApp sales & support<br />with <span className="text-gradient-green">AI Agents</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Cold outbound. Inbound qualification. Customer care. Live sales. One platform — fully GDPR-compliant, Twilio-native.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href={BOOK_DEMO_URL} target="_blank" rel="noopener noreferrer" className="px-8 py-3 rounded-full gradient-green text-primary-foreground font-medium glow-green">
                Book a Demo
              </a>
              <a href="#features" className="px-8 py-3 rounded-full glass glass-border text-foreground font-medium">
                See How It Works
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="pb-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="rounded-2xl overflow-hidden glass glass-border p-1">
            <div className="rounded-xl bg-card p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[{ label: "Active Chats", value: "1,247" }, { label: "Messages Today", value: "8,432" }, { label: "Conversion", value: "12.4%" }, { label: "Avg Response", value: "1.2s" }].map((s) => (
                  <div key={s.label} className="bg-muted rounded-xl p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                    <p className="text-xl font-display font-bold text-foreground">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="h-32 bg-muted rounded-xl flex items-end px-4 pb-4 gap-2">
                {[40, 55, 45, 60, 50, 70, 65, 80, 75, 90, 85, 95].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-md gradient-green" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Built for WhatsApp, end-to-end</h2>
            <p className="text-muted-foreground">Everything you need to turn WhatsApp into your primary revenue channel.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.1, duration: 0.6 }}
                className="bg-card rounded-2xl p-6 hover:bg-surface-light transition-colors group">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4 group-hover:bg-accent/10 transition-colors">
                  <f.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-lg font-display font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 px-4 sm:px-6 bg-card">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div {...fadeUp}>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">How it Works</h2>
            <p className="text-muted-foreground mb-16">Up and running in under an hour.</p>
          </motion.div>
          <div className="space-y-8">
            {steps.map((s, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.15, duration: 0.6 }}
                className="flex items-start gap-6 text-left">
                <div className="w-10 h-10 rounded-full gradient-green flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary-foreground">{s.num}</span>
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
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Simple, Transparent Pricing</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((p, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.1, duration: 0.6 }}
                className={`rounded-2xl p-6 ${p.popular ? "gradient-green text-primary-foreground glow-green" : "bg-card"}`}>
                {p.popular && <div className="text-xs font-semibold bg-primary-foreground/20 rounded-full px-3 py-1 inline-block mb-3">MOST POPULAR</div>}
                <h3 className="text-lg font-display font-semibold">{p.name}</h3>
                <div className="mt-2 mb-6">
                  <span className="text-3xl font-display font-bold">{p.price}</span>
                  <span className="text-sm opacity-70">{p.period}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {p.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href={BOOK_DEMO_URL} target="_blank" rel="noopener noreferrer" className={`block text-center py-3 rounded-full font-medium text-sm ${
                  p.popular ? "bg-primary-foreground text-background" : "glass glass-border text-foreground"
                }`}>
                  {p.cta}
                </a>
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={BOOK_DEMO_URL} target="_blank" rel="noopener noreferrer" className="px-8 py-3 rounded-full bg-primary-foreground text-background font-medium">
              Book a Demo
            </a>
            <Link to="/contact" className="px-8 py-3 rounded-full bg-primary-foreground/20 text-primary-foreground font-medium">
              Contact Sales
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-border py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg gradient-green flex items-center justify-center">
                <MessageCircle className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-accent">{COMPANY_NAME}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">WhatsApp AI agents for UK businesses. Sales, support, outbound and inbound — done right.</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><Mail className="w-3 h-3" /> {CONTACT_EMAIL}</div>
              <div className="flex items-center gap-2"><Phone className="w-3 h-3" /> {CONTACT_PHONE}</div>
              <div className="flex items-center gap-2"><MapPin className="w-3 h-3" /> {COMPANY_ADDRESS}</div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Product</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="text-xs text-muted-foreground hover:text-foreground">Features</a></li>
              <li><a href="#how-it-works" className="text-xs text-muted-foreground hover:text-foreground">How it works</a></li>
              <li><a href="#pricing" className="text-xs text-muted-foreground hover:text-foreground">Pricing</a></li>
              <li><a href={BOOK_DEMO_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground">Book a demo</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Company</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-xs text-muted-foreground hover:text-foreground">About us</Link></li>
              <li><Link to="/contact" className="text-xs text-muted-foreground hover:text-foreground">Contact us</Link></li>
              <li><Link to="/login" className="text-xs text-muted-foreground hover:text-foreground">Sign in</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Legal</h4>
            <ul className="space-y-2">
              <li><Link to="/contact" className="text-xs text-muted-foreground hover:text-foreground">Privacy policy</Link></li>
              <li><Link to="/contact" className="text-xs text-muted-foreground hover:text-foreground">Terms of service</Link></li>
              <li><Link to="/contact" className="text-xs text-muted-foreground hover:text-foreground">GDPR</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-border text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} {PARENT_COMPANY}. All rights reserved.</span>
          <span>Powered by <a href={PARENT_WEBSITE} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{PARENT_COMPANY}</a> 🇬🇧</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
