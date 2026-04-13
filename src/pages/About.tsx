import { Link } from "react-router-dom";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { COMPANY_NAME, BOOK_DEMO_URL, PARENT_COMPANY, PARENT_WEBSITE } from "@/lib/constants";

const About = () => (
  <div className="min-h-screen bg-background">
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-green flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-display font-bold text-accent">{COMPANY_NAME}</span>
        </Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Back</Link>
      </div>
    </nav>

    <section className="pt-32 pb-20 px-4 sm:px-6 max-w-3xl mx-auto">
      <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">About {COMPANY_NAME}</h1>
      <div className="space-y-6 text-muted-foreground leading-relaxed">
        <p>
          {COMPANY_NAME} is a UK-based platform that helps businesses run WhatsApp as a real sales and support
          channel — not just another inbox. We combine conversational AI, Twilio-native delivery and GDPR-first
          compliance into one tool your team can actually control.
        </p>
        <p>
          We believe WhatsApp is the highest-converting channel most businesses aren't using properly. Manual
          follow-up is slow, call centres are expensive, and generic chatbots feel robotic. Our AI agents close
          that gap — they reply within seconds, hold context across days, hand over to humans when it matters,
          and log everything so nothing falls through the cracks.
        </p>
        <h2 className="text-2xl font-display font-bold text-foreground pt-4">What we build</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Inbound agents</strong> — qualify new enquiries, referrals and warm leads the moment they message.</li>
          <li><strong>Outbound agents</strong> — run cold outreach with full opt-out compliance and a human escalation path.</li>
          <li><strong>Sales agents</strong> — consultative, pipeline-aware, price-bounded.</li>
          <li><strong>Customer care agents</strong> — empathy-first, resolution-focused, with proper escalation rules.</li>
        </ul>
        <h2 className="text-2xl font-display font-bold text-foreground pt-4">How we're different</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Full transcripts of every conversation — auditable, searchable, yours.</li>
          <li>No monthly commitment. Usage-based pricing.</li>
          <li>UK-first: +44 defaults, GBP, proper STOP / DNC handling.</li>
          <li>Direct WhatsApp support channel with a real human on the other end.</li>
        </ul>
        <div className="pt-6">
          <a href={BOOK_DEMO_URL} target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-3 rounded-full gradient-green text-primary-foreground font-medium">Book a Demo</a>
        </div>
        <div className="pt-12 text-center text-xs">
          Powered by <a href={PARENT_WEBSITE} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{PARENT_COMPANY}</a>
        </div>
      </div>
    </section>
  </div>
);

export default About;
