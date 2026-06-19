// client/src/pages/ManageSubscription.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Check, Loader2 } from "lucide-react";

type Flavor = { slug: string; name: string; desc: string; image: string };

type Subscription = {
  id: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number | null;
  frequencyWeeks: number;
  currentFlavor: { slug: string; name: string; image: string | null };
};

type View = "loading" | "manage" | "request" | "sent" | "error";

async function safeReadJson(res: Response): Promise<any> {
  const ct = res.headers.get("content-type") || "";
  if (!ct.toLowerCase().includes("application/json")) {
    const text = await res.text().catch(() => "");
    const snippet = (text || "").slice(0, 200).trim();
    throw new Error(snippet ? snippet : "Unexpected non-JSON response.");
  }
  return res.json();
}

function formatDate(unixSeconds: number | null): string | null {
  if (!unixSeconds) return null;
  try {
    return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

function frequencyLabel(weeks: number): string {
  if (!weeks) return "on your subscription";
  if (weeks === 4) return "monthly";
  if (weeks === 1) return "every week";
  return `every ${weeks} weeks`;
}

export default function ManageSubscription() {
  const [view, setView] = useState<View>("loading");
  const [message, setMessage] = useState<string>("");

  // email-request flow
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  // manage flow
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<Record<string, string>>({});
  const [portalLoading, setPortalLoading] = useState(false);

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("token");
  }, []);

  // On load: with a token, fetch the customer's subscription state.
  useEffect(() => {
    if (!token) {
      setView("request");
      return;
    }

    (async () => {
      try {
        setView("loading");
        const res = await fetch(
          `/api/subscription/state?token=${encodeURIComponent(token)}`,
          { method: "GET" },
        );
        const data = await safeReadJson(res);

        if (!res.ok || !data?.ok) {
          throw new Error(data?.message || "That secure link is invalid or expired.");
        }

        setFlavors(Array.isArray(data.flavors) ? data.flavors : []);
        const subs: Subscription[] = Array.isArray(data.subscriptions) ? data.subscriptions : [];
        setSubscriptions(subs);
        setSelected(
          Object.fromEntries(subs.map((s) => [s.id, s.currentFlavor.slug])),
        );
        setView("manage");
      } catch (err: any) {
        setView("request");
        setMessage(
          err?.message ||
            "That secure link is invalid or expired. Request a new one below.",
        );
      }
    })();
  }, [token]);

  async function requestNewLink() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setView("error");
      setMessage("Please enter the email used at checkout.");
      return;
    }

    setSending(true);
    setMessage("");

    try {
      const res = await fetch("/api/customer-portal/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await safeReadJson(res).catch(() => ({}));
      setView("sent");
      setMessage(
        data?.message ||
          "If that email is in our system, you’ll receive a link shortly.",
      );
    } catch {
      setView("error");
      setMessage("Failed to request link. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function applyFlavorChange(sub: Subscription) {
    if (!token) return;
    const nextFlavor = selected[sub.id];
    if (!nextFlavor || nextFlavor === sub.currentFlavor.slug) return;

    setSavingId(sub.id);
    setSavedNotice((prev) => ({ ...prev, [sub.id]: "" }));

    try {
      const res = await fetch("/api/subscription/change-flavor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, subscriptionId: sub.id, flavor: nextFlavor }),
      });
      const data = await safeReadJson(res);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Couldn't change your flavor. Please try again.");
      }

      // Reflect the new flavor as the current one.
      const newMeta = flavors.find((f) => f.slug === nextFlavor);
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id === sub.id
            ? {
                ...s,
                currentFlavor: {
                  slug: nextFlavor,
                  name: newMeta?.name ?? nextFlavor,
                  image: newMeta?.image ?? null,
                },
              }
            : s,
        ),
      );
      setSavedNotice((prev) => ({
        ...prev,
        [sub.id]:
          data?.message ||
          `Your next shipment will be ${newMeta?.name ?? nextFlavor}.`,
      }));
    } catch (err: any) {
      setSavedNotice((prev) => ({
        ...prev,
        [sub.id]: err?.message || "Couldn't change your flavor. Please try again.",
      }));
    } finally {
      setSavingId(null);
    }
  }

  async function openBillingPortal() {
    if (!token) return;
    setPortalLoading(true);
    try {
      const res = await fetch(
        `/api/customer-portal?token=${encodeURIComponent(token)}`,
        { method: "GET" },
      );
      const data = await safeReadJson(res);
      if (!res.ok || !data?.url) {
        throw new Error(data?.message || "Couldn't open the billing portal.");
      }
      window.location.href = data.url;
    } catch (err: any) {
      setPortalLoading(false);
      alert(err?.message || "Couldn't open the billing portal. Please try again.");
    }
  }

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-grow pt-28 md:pt-32 pb-24">
        <div className="container mx-auto px-4 md:px-6">
          {view === "loading" && (
            <div className="max-w-md mx-auto">
              <div className="bg-card/50 border border-foreground/10 rounded-2xl p-8 text-center">
                <Loader2 className="w-6 h-6 mx-auto animate-spin text-foreground/70" />
                <h2 className="text-2xl font-display font-bold text-foreground mt-4">
                  Loading your subscription…
                </h2>
                <p className="text-xs text-foreground/40 mt-3">
                  If this takes more than a few seconds, your link may be expired.
                </p>
              </div>
            </div>
          )}

          {view === "manage" && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                  Manage Subscription
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Switch your flavor anytime. Changes apply to your next shipment —
                  what’s already on the way ships as-is.
                </p>
              </div>

              {subscriptions.length === 0 ? (
                <div className="bg-card/50 border border-foreground/10 rounded-2xl p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    We couldn’t find an active subscription on your account. If you
                    think this is a mistake, open your billing portal below or email{" "}
                    <a href="mailto:support@kimoraco.com" className="text-foreground/70 underline">
                      support@kimoraco.com
                    </a>
                    .
                  </p>
                  <Button
                    onClick={openBillingPortal}
                    disabled={portalLoading}
                    variant="outline"
                    className="mt-5 border-foreground/15 text-foreground hover:bg-foreground/5"
                  >
                    {portalLoading ? "Opening…" : "Open billing portal"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {subscriptions.map((sub) => {
                    const nextDate = formatDate(sub.currentPeriodEnd);
                    const chosen = selected[sub.id] ?? sub.currentFlavor.slug;
                    const changed = chosen !== sub.currentFlavor.slug;
                    const notice = savedNotice[sub.id];

                    return (
                      <div
                        key={sub.id}
                        className="bg-card/50 border border-foreground/10 rounded-2xl p-6"
                      >
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div>
                            <p className="text-xs uppercase tracking-wider text-foreground/40">
                              Current flavor
                            </p>
                            <p className="text-lg font-display font-bold text-foreground">
                              {sub.currentFlavor.name}
                            </p>
                            <p className="text-xs text-foreground/50 mt-0.5">
                              Ships {frequencyLabel(sub.frequencyWeeks)}
                              {nextDate ? ` · next renews ${nextDate}` : ""}
                            </p>
                          </div>
                          {sub.cancelAtPeriodEnd && (
                            <span className="text-xs text-amber-400/90 border border-amber-400/30 rounded-full px-3 py-1">
                              Cancels at period end
                            </span>
                          )}
                        </div>

                        <div className="mt-5">
                          <p className="text-xs uppercase tracking-wider text-foreground/40 mb-3">
                            Choose your next flavor
                          </p>
                          <div className="grid grid-cols-3 gap-3">
                            {flavors.map((f) => {
                              const isSelected = chosen === f.slug;
                              const isCurrent = sub.currentFlavor.slug === f.slug;
                              return (
                                <button
                                  key={f.slug}
                                  type="button"
                                  onClick={() =>
                                    setSelected((prev) => ({ ...prev, [sub.id]: f.slug }))
                                  }
                                  aria-pressed={isSelected}
                                  className={`relative rounded-xl border p-3 text-center transition-all focus:outline-none focus:ring-2 focus:ring-white/30 ${
                                    isSelected
                                      ? "border-primary bg-primary/10"
                                      : "border-foreground/10 bg-muted hover:border-foreground/25"
                                  }`}
                                >
                                  {isSelected && (
                                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                      <Check className="w-3 h-3 text-foreground" />
                                    </span>
                                  )}
                                  <img
                                    src={f.image}
                                    alt={f.name}
                                    loading="lazy"
                                    className="w-full aspect-square object-contain mb-2"
                                  />
                                  <p className="text-xs font-semibold text-foreground leading-tight">
                                    {f.name}
                                  </p>
                                  {isCurrent && (
                                    <p className="text-[10px] text-foreground/40 mt-0.5">Current</p>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="mt-5">
                          <Button
                            onClick={() => applyFlavorChange(sub)}
                            disabled={!changed || savingId === sub.id}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider disabled:opacity-40"
                          >
                            {savingId === sub.id
                              ? "Saving…"
                              : changed
                                ? `Switch to ${flavors.find((f) => f.slug === chosen)?.name ?? "new flavor"}`
                                : "Select a different flavor"}
                          </Button>

                          {changed && (
                            <p className="text-xs text-foreground/40 mt-2 text-center">
                              Applies to your next shipment
                              {nextDate ? ` on ${nextDate}` : ""}. No charge now.
                            </p>
                          )}

                          {notice && (
                            <div
                              className="mt-3 flex items-start gap-2 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2"
                              role="status"
                            >
                              <Check className="w-4 h-4 mt-0.5 shrink-0" />
                              <span>{notice}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div className="bg-card/30 border border-foreground/10 rounded-2xl p-5 text-left">
                    <p className="text-sm text-foreground/70 font-semibold">
                      Need to skip, pause, change frequency, update payment, or cancel?
                    </p>
                    <p className="text-xs text-foreground/50 mt-1 mb-4">
                      Manage billing and delivery details in your secure Stripe portal.
                    </p>
                    <Button
                      onClick={openBillingPortal}
                      disabled={portalLoading}
                      variant="outline"
                      className="border-foreground/15 text-foreground hover:bg-foreground/5"
                    >
                      {portalLoading ? "Opening…" : "Open billing portal"}
                    </Button>
                  </div>

                  <p className="text-xs text-foreground/40 text-center">
                    Questions? Email{" "}
                    <a href="mailto:support@kimoraco.com" className="text-foreground/60 underline">
                      support@kimoraco.com
                    </a>{" "}
                    and we’ll handle it directly.
                  </p>
                </div>
              )}
            </div>
          )}

          {(view === "request" || view === "sent" || view === "error") && (
            <div className="max-w-md mx-auto">
              <div className="bg-card/50 border border-foreground/10 rounded-2xl p-6 text-center">
                <h2 className="text-2xl font-display font-bold text-foreground">
                  Manage Subscription
                </h2>

                {view === "sent" ? (
                  <div
                    className="mt-4 flex items-start gap-2 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-3 text-left"
                    role="status"
                  >
                    <Check className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      {message ||
                        "If that email is in our system, you’ll receive a secure link shortly."}
                    </span>
                  </div>
                ) : message ? (
                  <p
                    className={`text-sm mt-3 ${
                      view === "error" ? "text-red-400" : "text-muted-foreground"
                    }`}
                  >
                    {message}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-3">
                    Change your flavor, skip, or cancel anytime. Enter the email used
                    at checkout and we’ll send a secure link to manage your
                    subscription.
                  </p>
                )}

                <div className="mt-5 space-y-3">
                  <input
                    type="email"
                    placeholder="Email used at checkout"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") requestNewLink();
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-muted border border-foreground/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />

                  <Button
                    onClick={requestNewLink}
                    disabled={sending}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider"
                  >
                    {sending ? "Sending…" : "Email me a secure link"}
                  </Button>

                  <p className="text-xs text-foreground/40">
                    Secure links expire in 15 minutes. If it expires, just request another.
                  </p>

                  {view === "sent" && (
                    <>
                      <p className="text-xs text-foreground/40">
                        Tip: check Spam or Promotions if you don’t see it right away.
                      </p>
                      <p className="text-xs text-foreground/30">
                        This secure link is unique to your email and expires automatically.
                      </p>
                    </>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-foreground/10 space-y-3 text-left">
                  <p className="text-xs text-foreground/50 leading-relaxed">
                    <strong className="text-foreground/70">Switching flavors:</strong>{" "}
                    Changes apply to your next shipment. Anything already charged or
                    shipped goes out as-is.
                  </p>

                  <p className="text-xs text-foreground/50 leading-relaxed">
                    <strong className="text-foreground/70">Faster path:</strong>{" "}
                    Every subscription email we send includes a direct manage link
                    that skips this step.
                  </p>

                  <p className="text-xs text-foreground/50 leading-relaxed">
                    <strong className="text-foreground/70">Need help?</strong>{" "}
                    Email{" "}
                    <a href="mailto:support@kimoraco.com" className="text-foreground/70 underline">
                      support@kimoraco.com
                    </a>{" "}
                    and we’ll handle it directly.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
