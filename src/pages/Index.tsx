import { Link } from "react-router-dom";
import { MessageCircle, Bot, Megaphone, BarChart3, Zap, Shield, ArrowRight, Check, Menu, X } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const navLinks = [
  { label: "Features", path: "#features" },
  { label: "How it Works", path: "#how-it-works" },
  { label: "Pricing", path: "#pricing" },
];

const features = [
  { icon: Bot, title: "Autonomous Agents", desc: "Our AI agents don't just reply, they solve. Trained on your specific business data to provide accurate, human-like assistance 24/7." },
  { icon: Megaphone, title: "Bulk Campaigns", desc: "Send personalized broadcast messages that actually get opened. 98% open rates guaranteed." },
  { icon: BarChart3, title: "Lead Scoring", desc: "Automatically qualify leads based on conversation intent and sync directly to your CRM." },
  { icon: Shield, title: "End-to-End Secure", desc: "Enterprise-grade encryption and GDPR compliance for all your customer interactions." },
  { icon: Zap, title: "Real-time Analytics", desc: "Track sentiment, conversion rates, and response times in a single, unified dashboard." },
];

const steps = [
  { num: "1", title: "Connect WhatsApp", desc: "Link your official WhatsApp Business API account with a single QR scan." },
  { num: "2", title: "Ingest Knowledge", desc: "Upload PDFs, URLs, or sync your help desk. Our AI learns your brand voice instantly." },
  { num: "3", title: "Deploy & Scale", desc: "Launch your AI agent and watch it handle thousands of simultaneous chats flawlessly." },
];

const plans = [
  { name: "Starter", price: "$49", period: "/mo", features: ["1,000 Conversations/mo", "1 AI Agent", "Basic Analytics"], cta: "Choose Plan", popular: false },
  { name: "Professional", price: "$149", period: "/mo", features: ["5,000 Conversations/mo", "5 AI Agents", "Custom Knowledge Base", "CRM Integration"], cta: "Get Started Now", popular: true },
  { name: "Custom", price: "Contact", period: "", features: ["Tailored solutions for high-volume enterprises", "Dedicated support"], cta: "Contact Sales", popular: false },
];

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.6 } };

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-green flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-display font-bold text-accent">AI Chat</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((l) => (
              <a key={l.path} href={l.path} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l.label}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Log In</Link>
            <Link to="/signup" className="px-4 py-2 rounded-full gradient-green text-sm font-medium text-primary-foreground">Get Started</Link>
          </div>
          <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-card border-t border-border p-4 space-y-3">
            {navLinks.map((l) => (
              <a key={l.path} href={l.path} className="block py-2 text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>{l.label}</a>
            ))}
            <Link to="/login" className="block py-2 text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Log In</Link>
            <Link to="/signup" className="block py-2 px-4 rounded-full gradient-green text-center text-sm font-medium text-primary-foreground" onClick={() => setMobileMenuOpen(false)}>Get Started</Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(152_76%_50%/0.05),transparent_60%)]" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div {...fadeUp}>
            <div className="inline-block px-3 py-1 rounded-full glass glass-border text-xs text-accent mb-6">
              ✨ NOW ACCEPTING EARLY ACCESS
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-tight mb-6">
              Automate your<br />customer interactions<br />with <span className="text-gradient-green">AI Chat</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              The world's most popular messaging app, now with supercharged AI agents. Scale your support and sales without increasing headcount.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup" className="px-8 py-3 rounded-full gradient-green text-primary-foreground font-medium glow-green">
                Start Your Free Trial
              </Link>
              <a href="#features" className="px-8 py-3 rounded-full glass glass-border text-foreground font-medium">
                Watch Demo
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Dashboard Preview */}
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

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Enterprise-Grade Intelligence</h2>
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

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 bg-card">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div {...fadeUp}>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">How it Works</h2>
            <p className="text-muted-foreground mb-16">Get up and running in minutes, not weeks.</p>
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

      {/* Pricing */}
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
                <Link to="/signup" className={`block text-center py-3 rounded-full font-medium text-sm ${
                  p.popular ? "bg-primary-foreground text-background" : "glass glass-border text-foreground"
                }`}>
                  {p.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6">
        <motion.div {...fadeUp} className="max-w-4xl mx-auto rounded-3xl gradient-green p-10 md:p-16 text-center glow-green">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
            Ready to supercharge your WhatsApp?
          </h2>
          <p className="text-primary-foreground/80 mb-8">Join 500+ businesses automating their growth with AI Chat.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup" className="px-8 py-3 rounded-full bg-primary-foreground text-background font-medium">
              Create Free Account
            </Link>
            <a href="#pricing" className="px-8 py-3 rounded-full bg-primary-foreground/20 text-primary-foreground font-medium">
              Book a Strategy Call
            </a>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg gradient-green flex items-center justify-center">
                <MessageCircle className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-accent">AI Chat</span>
            </div>
            <p className="text-xs text-muted-foreground">Next-generation WhatsApp automation powered by state-of-the-art Large Language Models.</p>
          </div>
          {[
            { title: "Product", links: ["Features", "Integrations", "Pricing", "Security"] },
            { title: "Company", links: ["About Us", "Blog", "Careers", "Contact"] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l}><a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-border text-xs text-muted-foreground">
          © 2026 AI Chat Platform. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
