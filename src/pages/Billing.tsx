import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, CreditCard, ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import {
  ApiError,
  billing,
  type BillingInvoice,
  type BillingPlan,
  type BillingSubscription,
} from "@/lib/api";
import { BOOK_DEMO_URL } from "@/lib/constants";

function formatMoney(amount: number | null | undefined, currency?: string | null) {
  if (amount == null) return "—";
  const cur = (currency || "gbp").toUpperCase();
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: cur }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${cur}`;
  }
}

function formatTs(ts?: number | null) {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatIso(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const Billing = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [sub, setSub] = useState<BillingSubscription | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [disclaimer, setDisclaimer] = useState("");
  const [addonsNote, setAddonsNote] = useState("");
  const [trialDays, setTrialDays] = useState(14);
  const [contactSalesUrl, setContactSalesUrl] = useState(BOOK_DEMO_URL);
  const [stripeMode, setStripeMode] = useState<"test" | "live" | string>("test");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [plansRes, subRes, invRes] = await Promise.all([
      billing.plans(),
      billing.subscription(),
      billing.invoices().catch(() => ({ items: [] as BillingInvoice[], has_more: false })),
    ]);
    setPlans(plansRes.plans);
    setDisclaimer(plansRes.disclaimer);
    setAddonsNote(plansRes.addons_note);
    setTrialDays(plansRes.trial_days);
    setContactSalesUrl(plansRes.contact_sales_url || BOOK_DEMO_URL);
    setStripeMode(plansRes.stripe_mode || "test");
    setSub(subRes);
    setInvoices(invRes.items || []);
    setLoadError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch (err) {
        if (!cancelled) {
          setLoadError((err as Error).message || "Failed to load billing");
          toast.error((err as Error).message || "Failed to load billing");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (!checkout) return;
    if (checkout === "success") {
      toast.success("Checkout complete — subscription will update when Stripe confirms");
      refresh().catch(() => undefined);
    } else if (checkout === "canceled" || checkout === "cancelled") {
      toast.message("Checkout cancelled");
    }
    searchParams.delete("checkout");
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams, refresh]);

  useEffect(() => {
    const plan = searchParams.get("plan");
    if (!plan || !sub?.can_checkout || loading) return;
    searchParams.delete("plan");
    setSearchParams(searchParams, { replace: true });
    startCheckout(plan).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, sub?.can_checkout]);

  async function startCheckout(planKey: string) {
    setBusyPlan(planKey);
    try {
      const { url } = await billing.checkout(planKey);
      window.location.href = url;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.message("Open Manage Subscription to change your plan");
        await openPortal();
      } else {
        toast.error((err as Error).message || "Unable to start checkout");
      }
      setBusyPlan(null);
    }
  }

  async function openPortal() {
    setPortalBusy(true);
    try {
      const { url } = await billing.portal();
      window.location.href = url;
    } catch (err) {
      toast.error((err as Error).message || "Unable to open billing portal");
      setPortalBusy(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading billing…
        </div>
      </AppLayout>
    );
  }

  if (loadError && !sub) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto py-16 text-center space-y-4">
          <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              refresh().finally(() => setLoading(false));
            }}
            className="px-4 py-2 rounded-xl gradient-green text-sm text-primary-foreground"
          >
            Retry
          </button>
        </div>
      </AppLayout>
    );
  }

  const paymentWarn =
    sub?.last_payment_status === "failed" ||
    sub?.subscription_status === "past_due" ||
    sub?.last_payment_status === "action_required";

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {stripeMode === "test" && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Stripe test mode — no live charges. Use Stripe test cards only.
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">Billing</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your subscription, invoices, and plan.
            </p>
          </div>
          {sub?.can_manage && (
            <button
              onClick={openPortal}
              disabled={portalBusy}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-green text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {portalBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Manage Subscription
            </button>
          )}
        </div>

        {paymentWarn && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm flex gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              {sub?.last_payment_status === "action_required"
                ? "Payment action required — open Manage Subscription to complete authentication."
                : "Payment failed or past due — update your payment method via Manage Subscription."}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-card border border-border p-6 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Current plan</p>
              <h2 className="text-xl font-display font-semibold mt-1">{sub?.plan_name || sub?.plan}</h2>
              {sub?.price_display && (
                <p className="text-sm mt-1">
                  {sub.price_display}
                  <span className="text-muted-foreground"> · {sub.billing_cycle || "Monthly"}</span>
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Status:{" "}
                <span className="capitalize text-foreground">
                  {(sub?.subscription_status || "none").replace(/_/g, " ")}
                </span>
              </p>
              {sub?.current_period_start && (
                <p className="text-sm text-muted-foreground">Period start {formatIso(sub.current_period_start)}</p>
              )}
              {sub?.current_period_end && (
                <p className="text-sm text-muted-foreground">
                  Renews / period ends {formatIso(sub.current_period_end)}
                  {sub.cancel_at_period_end ? " · Cancels at period end" : ""}
                </p>
              )}
              {(sub?.trial_ends_at || sub?.subscription_status === "trialing") && (
                <p className="text-sm text-muted-foreground">
                  Trial{sub?.trial_start ? ` ${formatIso(sub.trial_start)} →` : ""} ends{" "}
                  {formatIso(sub.trial_ends_at)}
                  {typeof sub.trial_days_remaining === "number"
                    ? ` (${sub.trial_days_remaining} day${sub.trial_days_remaining === 1 ? "" : "s"} left)`
                    : ""}
                </p>
              )}
              {sub?.last_payment_status && (
                <p className="text-sm text-muted-foreground">
                  Last payment: <span className="capitalize text-foreground">{sub.last_payment_status}</span>
                  {sub.last_payment_at ? ` · ${formatIso(sub.last_payment_at)}` : ""}
                </p>
              )}
            </div>
            <Link to="/settings" className="text-sm text-accent hover:underline">
              Back to settings
            </Link>
          </div>
          {disclaimer && <p className="text-xs text-muted-foreground border-t border-border pt-4">{disclaimer}</p>}
          {trialDays > 0 && (
            <p className="text-xs text-muted-foreground">{trialDays}-day free trial on new paid subscriptions.</p>
          )}
        </div>

        <div>
          <h3 className="text-lg font-display font-semibold mb-4">Plans</h3>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {plans.map((p) => {
              const isCurrent = sub?.plan === p.key;
              const chooseLabel =
                p.key === "starter"
                  ? "Choose Starter"
                  : p.key === "professional"
                    ? "Choose Professional"
                    : p.key === "business"
                      ? "Choose Business"
                      : p.cta;
              return (
                <div
                  key={p.key}
                  className={`rounded-2xl p-5 border ${
                    p.popular ? "gradient-green text-primary-foreground border-transparent" : "bg-card border-border"
                  }`}
                >
                  {p.popular && (
                    <div className="text-[10px] font-semibold bg-primary-foreground/20 rounded-full px-2 py-0.5 inline-block mb-2">
                      MOST POPULAR
                    </div>
                  )}
                  <h4 className="font-display font-semibold">{p.name}</h4>
                  <div className="mt-1 mb-4">
                    <span className="text-2xl font-display font-bold">{p.price_display}</span>
                    <span className={`text-sm ${p.popular ? "opacity-80" : "text-muted-foreground"}`}>{p.period}</span>
                  </div>
                  <ul className="space-y-2 mb-5">
                    {p.features.slice(0, 6).map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {p.contact_sales ? (
                    <a
                      href={contactSalesUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block text-center py-2.5 rounded-full text-sm font-medium ${
                        p.popular ? "bg-primary-foreground text-background" : "glass glass-border"
                      }`}
                    >
                      Contact Sales
                    </a>
                  ) : isCurrent ? (
                    <button
                      disabled
                      className={`w-full py-2.5 rounded-full text-sm font-medium opacity-70 ${
                        p.popular ? "bg-primary-foreground/40 text-background" : "bg-muted"
                      }`}
                    >
                      Current plan
                    </button>
                  ) : sub?.use_portal_for_changes || sub?.has_active_subscription ? (
                    <button
                      onClick={openPortal}
                      disabled={portalBusy}
                      className={`w-full py-2.5 rounded-full text-sm font-medium ${
                        p.popular ? "bg-primary-foreground text-background" : "glass glass-border"
                      }`}
                    >
                      Manage Subscription
                    </button>
                  ) : (
                    <button
                      onClick={() => startCheckout(p.key)}
                      disabled={busyPlan === p.key}
                      className={`w-full py-2.5 rounded-full text-sm font-medium disabled:opacity-50 ${
                        p.popular ? "bg-primary-foreground text-background" : "glass glass-border"
                      }`}
                    >
                      {busyPlan === p.key ? "Redirecting…" : chooseLabel}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {addonsNote && <p className="text-xs text-muted-foreground mt-4">{addonsNote}</p>}
        </div>

        <div>
          <h3 className="text-lg font-display font-semibold mb-4">Payment history</h3>
          <div className="rounded-2xl bg-card border border-border overflow-hidden">
            {invoices.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Invoice</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-3">{formatTs(inv.created)}</td>
                        <td className="px-4 py-3">{inv.number || inv.id}</td>
                        <td className="px-4 py-3">{formatMoney(inv.amount_paid ?? inv.amount_due, inv.currency)}</td>
                        <td className="px-4 py-3 capitalize">{inv.status || "—"}</td>
                        <td className="px-4 py-3 text-right space-x-3">
                          {inv.hosted_invoice_url && (
                            <a
                              href={inv.hosted_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-accent hover:underline"
                            >
                              View <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {inv.invoice_pdf && (
                            <a
                              href={inv.invoice_pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-accent hover:underline"
                            >
                              PDF
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <button onClick={() => navigate("/dashboard")} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to dashboard
        </button>
      </div>
    </AppLayout>
  );
};

export default Billing;
