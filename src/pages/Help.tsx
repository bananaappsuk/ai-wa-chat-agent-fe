import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Rocket,
  Smartphone,
  Bot,
  Users,
  MessageCircle,
  Megaphone,
  Send,
  FileText,
  BarChart3,
  CreditCard,
  Settings,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BOOK_DEMO_URL,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  COMPANY_NAME,
} from "@/lib/constants";

type HelpTopic = {
  title: string;
  description: string;
  path: string;
  icon: typeof Rocket;
  keywords: string[];
};

type FaqItem = {
  question: string;
  answer: string;
  keywords: string[];
};

const TOPICS: HelpTopic[] = [
  {
    title: "Getting Started",
    description: "Sign in, explore the dashboard, and set up your workspace.",
    path: "/dashboard",
    icon: Rocket,
    keywords: ["start", "onboarding", "dashboard", "overview"],
  },
  {
    title: "Connecting WhatsApp",
    description: "Configure Twilio routing and Meta WhatsApp in Settings.",
    path: "/settings",
    icon: Smartphone,
    keywords: ["twilio", "meta", "connect", "whatsapp", "integration", "routing"],
  },
  {
    title: "Creating AI Agents",
    description: "Build agents with prompts, knowledge, and booking links.",
    path: "/agents",
    icon: Bot,
    keywords: ["agent", "ai", "prompt", "knowledge", "faq"],
  },
  {
    title: "Managing Leads",
    description: "Add, import, filter, and blacklist contacts.",
    path: "/leads",
    icon: Users,
    keywords: ["lead", "import", "csv", "consent", "blacklist", "opt-out"],
  },
  {
    title: "Live Chat",
    description: "Reply in real time, pause AI, and hand over to a human.",
    path: "/live-chat",
    icon: MessageCircle,
    keywords: ["chat", "inbox", "takeover", "human", "message", "delivery"],
  },
  {
    title: "Campaigns",
    description: "Schedule and send bulk WhatsApp campaigns to leads.",
    path: "/campaigns",
    icon: Megaphone,
    keywords: ["campaign", "bulk", "schedule", "outreach"],
  },
  {
    title: "WhatsApp Blasts",
    description: "Send one-off blasts to uploaded or selected numbers.",
    path: "/whatsapp-blast",
    icon: Send,
    keywords: ["blast", "broadcast", "recipients", "xlsx", "csv"],
  },
  {
    title: "Templates",
    description: "Manage approved Twilio Content and Meta templates.",
    path: "/templates",
    icon: FileText,
    keywords: ["template", "content sid", "approval", "hx"],
  },
  {
    title: "Analytics",
    description: "Review AI analytics and account activity history.",
    path: "/ai-analytics",
    icon: BarChart3,
    keywords: ["analytics", "activity", "metrics", "reports"],
  },
  {
    title: "Billing & Subscription",
    description: "View plans, trial status, invoices, and manage Stripe billing.",
    path: "/billing",
    icon: CreditCard,
    keywords: ["billing", "plan", "subscription", "invoice", "stripe", "trial"],
  },
  {
    title: "Account & Settings",
    description: "Profile, AI settings, notifications, and WhatsApp integrations.",
    path: "/settings",
    icon: Settings,
    keywords: ["settings", "profile", "account", "notifications", "password"],
  },
];

const FAQS: FaqItem[] = [
  {
    question: "How do I connect my WhatsApp number?",
    answer:
      "Open Settings → WhatsApp Integrations. Configure Twilio routing (inbound number routed to your account) and/or connect Meta WhatsApp. Sending still follows each conversation or campaign’s stored provider. Template approval details are also available under WhatsApp Templates in Settings.",
    keywords: ["connect", "twilio", "meta", "whatsapp", "settings"],
  },
  {
    question: "How do I create an AI Agent?",
    answer:
      "Go to Agents and create a new agent. Set its name, role, prompts, optional knowledge (paste text or upload .txt / .md / .csv / .pdf), support email, and booking link if needed. Assign agents to leads from the Leads page.",
    keywords: ["agent", "create", "prompt", "knowledge"],
  },
  {
    question: "How do I add leads?",
    answer:
      "On Leads you can add contacts manually or import a CSV. Filter by consent and blacklist status. Blacklisted numbers are treated as unsubscribed and will not receive marketing sends.",
    keywords: ["leads", "import", "csv", "add"],
  },
  {
    question: "How do I send a WhatsApp message?",
    answer:
      "Open Live Chat, select a lead, and send a free-form message when the customer-service window is open, or send an approved template when required. Delivery status updates appear on the conversation messages.",
    keywords: ["send", "message", "live chat", "window", "template"],
  },
  {
    question: "How do Campaigns work?",
    answer:
      "Campaigns let you target leads with free-form or template WhatsApp content, schedule sends, and track recipient progress. Campaigns respect consent, purpose, and provider rules configured for your account.",
    keywords: ["campaign", "schedule", "bulk"],
  },
  {
    question: "How do I create a WhatsApp Blast?",
    answer:
      "Open WA Blast, name the blast, add recipients (manual entry or spreadsheet upload), optionally choose an approved template and message purpose, then queue the send. Blast history is separate from Live Chat — blast messages do not appear in the Live Chat inbox.",
    keywords: ["blast", "broadcast", "upload"],
  },
  {
    question: "Why did a WhatsApp message fail?",
    answer:
      "Failures often come from the WhatsApp provider after accept (for example delivery errors, template rules, consent/opt-out, closed messaging window for free-form text, or account/sender restrictions). Check Live Chat message status, Campaign/Blast recipient status and error codes, Activity events, and your Twilio/Meta console for the provider error details.",
    keywords: ["fail", "failed", "error", "63112", "undelivered", "delivery"],
  },
  {
    question: "How do approved WhatsApp templates work?",
    answer:
      "Templates must be approved by Meta (via Twilio Content SIDs or Meta templates). Manage them under Templates and Settings → WhatsApp Templates. Outside the 24-hour customer window, outbound free-form text is blocked — use an approved template with a valid message purpose instead.",
    keywords: ["template", "approved", "content sid", "window"],
  },
  {
    question: "How do I hand over an AI conversation to a human?",
    answer:
      "In Live Chat, mark a lead as Needs human or take over the conversation. While takeover is active, AI replies are paused. You can clear needs-human or hand control back to AI when ready. Settings also includes Direct Message Alerts for takeover notifications.",
    keywords: ["takeover", "human", "handover", "pause", "ai"],
  },
  {
    question: "Where can I view message delivery status?",
    answer:
      "In Live Chat, each outbound message shows provider delivery status (queued, sent, delivered, read, failed, undelivered). For Campaigns and WhatsApp Blasts, open the campaign/blast history and recipient list for per-recipient status and error codes. Account-level events also appear under Activity.",
    keywords: ["delivery", "status", "sent", "delivered", "read", "failed"],
  },
];

const matchesQuery = (haystack: string[], query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystack.some((part) => part.toLowerCase().includes(q));
};

const Help = () => {
  const [query, setQuery] = useState("");

  const topics = useMemo(
    () =>
      TOPICS.filter((t) =>
        matchesQuery([t.title, t.description, ...t.keywords], query),
      ),
    [query],
  );

  const faqs = useMemo(
    () =>
      FAQS.filter((f) =>
        matchesQuery([f.question, f.answer, ...f.keywords], query),
      ),
    [query],
  );

  return (
    <AppLayout>
      <div className="max-w-5xl">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Help</h1>
        <p className="text-muted-foreground mb-6">How can we help you?</p>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help topics..."
            className="w-full bg-muted rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            aria-label="Search help topics"
          />
        </div>

        <section className="mb-10">
          <h2 className="text-xl font-display font-semibold mb-4">Getting Started</h2>
          {topics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No topics match your search.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topics.map((topic) => (
                <Link
                  key={topic.title}
                  to={topic.path}
                  className="bg-card rounded-2xl p-5 hover:bg-surface-light transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                    <topic.icon className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="font-display font-semibold mb-1 group-hover:text-accent transition-colors">
                    {topic.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{topic.description}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-display font-semibold mb-4">Quick Help / FAQ</h2>
          {faqs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No FAQs match your search.</p>
          ) : (
            <div className="bg-card rounded-2xl px-5">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, i) => (
                  <AccordionItem key={faq.question} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left text-sm md:text-base hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </section>

        <section className="bg-card rounded-2xl p-6 md:p-8">
          <h2 className="text-xl font-display font-semibold mb-2">Still need help?</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Contact the {COMPANY_NAME} team — we typically reply within one business day.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-green text-sm font-semibold text-primary-foreground"
            >
              <Mail className="w-4 h-4" />
              Contact Support
            </a>
            <a
              href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-sm font-medium hover:bg-surface-light transition-colors"
            >
              <Phone className="w-4 h-4" />
              {CONTACT_PHONE}
            </a>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-sm font-medium hover:bg-surface-light transition-colors"
            >
              Contact page
            </Link>
            <a
              href={BOOK_DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-sm font-medium hover:bg-surface-light transition-colors"
            >
              Book a Demo <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default Help;
