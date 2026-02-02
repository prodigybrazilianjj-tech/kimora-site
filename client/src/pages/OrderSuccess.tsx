import { Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";

type CheckoutSessionResponse = {
  id: string;
  mode: "payment" | "subscription" | "setup" | string;
  customer_email: string | null;
  payment_status: string | null;
  subscription: string | null;
};

function getSessionIdFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("session_id")?.trim() || "";
  } catch {
    return "";
  }
}

export default function OrderSuccess() {
  const { clearCart } = useCart();

  const sessionId = useMemo(() => getSessionIdFromUrl(), []);

  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [isSubscription, setIsSubscription] = useState(false);

  // Portal email UI
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  useEffect(() => {
    clearCart();
    localStorage.removeItem("kimora-cart");
  }, [clearCart]);

  // Load Stripe session info so we can render subscription-only UI correctly
  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    (async () => {
      setSessionLoading(true);
      setSessionError(null);

      try {
        const res = await fetch(`/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`);
        const data = (await res.json()) as CheckoutSessionResponse;

        if (!res.ok) {
          throw new Error((data as any)?.message || "Failed to load checkout session.");
        }

        if (cancelled) return;

        const sub = data.mode === "subscription" || Boolean(data.subscription);
        setIsSubscription(sub);

        // Prefill email if we have it (nice UX for subscription portal link)
        const pref = (data.customer_email || "").trim().toLowerCase();
        if (pref) setEmail(pref);
      } catch (err: any) {
        if (cancelled) return;
        setSessionError(err?.message || "Failed to load checkout session.");
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function requestPortalLink() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setPortalError("Please enter the email used at checkout.");
      return;
    }

    setSending(true);
    setPortalError(null);

    try {
      const res = await fetch("/api/customer-portal/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Unable to send link.");
      }

      setSent(true);
    } catch (err: any) {
      setPortalError(err?.message || "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container mx-auto max-w-2xl px-4 text-center">
          <h1 className="text-3xl font-display font-bold text-white mb-3">
            Order Confirmed 🎉
          </h1>

          <p className="text-muted-foreground mb-3">
            Welcome to Kimora. Progress is built one decision at a time. You just made a good one.
          </p>

          <p className="text-xs text-white/50 mb-8">
            You’ll receive an email receipt from Stripe shortly.
          </p>

          {/* Optional diagnostic feedback (safe + helpful) */}
          {sessionId ? (
            <>
              {sessionLoading && (
                <p className="text-xs text-white/40 mb-4">Loading your order details…</p>
              )}
              {sessionError && (
                <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-100 text-center">
                  {sessionError}
                </div>
              )}
            </>
          ) : (
            <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-100 text-center">
              Missing session_id in the URL. If you refreshed from an old tab, try completing checkout again.
            </div>
          )}

          {/* NEXT STEPS card (applies to both one-time and subscription) */}
          <div className="bg-card/50 border border-white/10 rounded-xl p-6 mb-6 text-left">
            <h3 className="text-white font-semibold mb-4 text-center tracking-wide">
              NEXT STEPS
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-white font-semibold mb-2">How to take Kimora</p>
                <ul className="text-sm text-white/70 list-disc pl-5 space-y-1">
                  <li>
                    Mix <span className="text-white font-semibold">1 stick</span> in{" "}
                    <span className="text-white font-semibold">12–16 oz</span> of cold water.
                  </li>
                  <li>
                    Best timing: <span className="text-white font-semibold">pre-training</span>,{" "}
                    <span className="text-white font-semibold">post-training</span>, or{" "}
                    <span className="text-white font-semibold">first thing</span> — consistency wins.
                  </li>
                </ul>
              </div>

              <div className="h-px bg-white/10" />

              <div>
                <p className="text-white font-semibold mb-2">What’s next</p>
                <ul className="text-sm text-white/70 list-disc pl-5 space-y-1">
                  <li>
                    You’ll get an order email from Stripe (check spam/promotions if you don’t see it).
                  </li>
                  <li>
                    Shipping + taxes are finalized in Stripe Checkout (your receipt reflects the final total).
                  </li>
                </ul>
              </div>

              <div className="h-px bg-white/10" />

              <p className="text-sm text-white/70">
                <span className="text-white font-semibold">Commitment tip:</span> pick a routine — same time every
                day for 14 days. Progress stacks fast when you don’t negotiate with yourself.
              </p>
            </div>
          </div>

          {/* SUBSCRIPTION-ONLY: manage subscription UI */}
          {isSubscription && (
            <div className="bg-card/50 border border-white/10 rounded-xl p-6 mb-8 text-left">
              <h3 className="text-white font-semibold mb-2 text-center">
                Manage your subscription
              </h3>

              <p className="text-xs text-white/50 mb-4 text-center">
                Enter the email you used at checkout and we’ll send a secure link. Or manage anytime at{" "}
                <Link
                  href="/manage-subscription"
                  className="underline underline-offset-4 hover:text-white"
                >
                  kimoraco.com/manage-subscription
                </Link>
                .
              </p>

              {portalError && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 text-center">
                  {portalError}
                </div>
              )}

              {!sent ? (
                <>
                  <input
                    type="email"
                    placeholder="Email used at checkout"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full mb-3 px-4 py-3 rounded-md bg-black/40 border border-white/10 text-white"
                  />

                  <Button
                    onClick={requestPortalLink}
                    disabled={sending}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {sending ? "Sending…" : "Email me a secure link"}
                  </Button>

                  <p className="text-[11px] text-white/40 mt-3 text-center">
                    Links expire after ~15 minutes for security. If it expires, just request a new one.
                  </p>
                </>
              ) : (
                <p className="text-sm text-white/80 text-center">
                  If that email is in our system, you’ll receive a link shortly.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-center gap-4">
            <Link href="/shop">
              <Button className="bg-primary hover:bg-primary/90">
                Continue Shopping
              </Button>
            </Link>

            <Link href="/">
              <Button variant="secondary">Back to Home</Button>
            </Link>
          </div>

          <p className="text-xs text-white/50 mt-6">
            If you don’t see the email within a few minutes, check spam/promotions.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
