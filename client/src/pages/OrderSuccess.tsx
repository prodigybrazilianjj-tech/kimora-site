import { Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type CheckoutSessionMode = "payment" | "subscription" | "unknown";

export default function OrderSuccess() {
  const { clearCart } = useCart();

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const sessionId = params.get("session_id") || "";

  const [mode, setMode] = useState<CheckoutSessionMode>("unknown");
  const isSubscription = mode === "subscription";

  const [email, setEmail] = useState("");
  const [loadingLink, setLoadingLink] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear cart on mount
  useEffect(() => {
    clearCart();
    localStorage.removeItem("kimora-cart");
  }, [clearCart]);

  // Option 2: ask backend what kind of checkout this was
  useEffect(() => {
    let cancelled = false;

    async function fetchMode() {
      if (!sessionId) {
        setMode("unknown");
        return;
      }

      try {
        const res = await fetch(
          `/api/checkout-session?session_id=${encodeURIComponent(sessionId)}`,
          { method: "GET" },
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(data?.message || "Unable to load session.");

        const m = String(data?.mode || "").toLowerCase();
        if (m === "subscription" || m === "payment") {
          if (!cancelled) setMode(m);
        } else {
          if (!cancelled) setMode("unknown");
        }

        // Optional: if your endpoint returns email, you can prefill:
        // const returnedEmail = String(data?.email || "");
        // if (returnedEmail && !cancelled) setEmail(returnedEmail);

      } catch {
        // Don’t hard-fail the page; just hide subscription-only UI.
        if (!cancelled) setMode("unknown");
      }
    }

    fetchMode();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function requestPortalLink() {
    const normalized = normalizeEmail(email);

    if (!normalized || !isValidEmail(normalized)) {
      setError("Enter the email you used at checkout.");
      return;
    }

    setLoadingLink(true);
    setError(null);

    try {
      const res = await fetch("/api/customer-portal/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Unable to send link.");

      setSent(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoadingLink(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container mx-auto max-w-xl px-4 text-center">
          <h1 className="text-3xl font-display font-bold text-white mb-4">
            Order Confirmed 🎉
          </h1>

          {/* On-brand (Option B refined) */}
          <p className="text-muted-foreground mb-6">
            Welcome to Kimora. Progress is built one decision at a time. You just
            made a good one.
          </p>

          <p className="text-xs text-white/50 mb-10">
            You’ll receive an email receipt from Stripe shortly.
          </p>

          {/* Works for both one-time + subscription */}
          <div className="bg-card/50 border border-white/10 rounded-xl p-5 mb-8 text-left">
            <h3 className="text-white font-semibold mb-3 text-center">
              Next steps
            </h3>

            <div className="space-y-4 text-sm text-white/80">
              <div>
                <div className="text-white font-semibold mb-1">
                  How to take Kimora
                </div>
                <ul className="list-disc pl-5 space-y-1 text-white/70">
                  <li>
                    Mix <span className="text-white font-medium">1 stick</span>{" "}
                    in 12–16 oz of cold water.
                  </li>
                  <li>
                    Best timing:{" "}
                    <span className="text-white font-medium">
                      pre-training, post-training, or first thing
                    </span>{" "}
                    — consistency wins.
                  </li>
                </ul>
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="text-white font-semibold mb-1">What’s next</div>
                <ul className="list-disc pl-5 space-y-1 text-white/70">
                  <li>
                    You’ll get an order email from Stripe (check spam/promotions
                    if you don’t see it).
                  </li>
                  <li>
                    Shipping + taxes are finalized in Stripe Checkout (your
                    receipt reflects the final total).
                  </li>
                </ul>
              </div>

              <div className="border-t border-white/10 pt-4 text-white/70">
                <span className="text-white font-semibold">Commitment tip:</span>{" "}
                pick a routine — same time every day for 14 days. Progress stacks
                fast when you don’t negotiate with yourself.
              </div>
            </div>
          </div>

          {/* Subscription-only block (now accurate) */}
          {isSubscription ? (
            <div className="bg-card/50 border border-white/10 rounded-xl p-5 mb-8 text-left">
              <h3 className="text-white font-semibold mb-2 text-center">
                Manage your subscription
              </h3>

              <p className="text-xs text-white/50 mb-4 text-center">
                Enter the email you used at checkout and we’ll send a secure
                link. You can also manage your subscription anytime at{" "}
                <Link
                  href="/manage-subscription"
                  className="underline underline-offset-4 hover:text-white"
                >
                  kimoraco.com/manage-subscription
                </Link>{" "}
                (also linked in the footer).
              </p>

              {error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 text-center">
                  {error}
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
                    disabled={loadingLink}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {loadingLink ? "Sending…" : "Email me a secure link"}
                  </Button>

                  <p className="text-[11px] text-white/40 mt-3 text-center">
                    Links expire after ~15 minutes for security. If it expires,
                    just request a new one.
                  </p>
                </>
              ) : (
                <p className="text-sm text-white/80 text-center">
                  If that email is in our system, you’ll receive a link shortly.
                </p>
              )}
            </div>
          ) : (
            // Subtle fallback link for anyone who subscribed but mode couldn't be detected
            <p className="text-xs text-white/40 mb-8">
              Subscribed? Manage anytime at{" "}
              <Link
                href="/manage-subscription"
                className="underline underline-offset-4 hover:text-white"
              >
                Manage Subscription
              </Link>
              .
            </p>
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
            If you don’t see the email within a few minutes, check
            spam/promotions.
          </p>

          {/* Optional tiny dev debug */}
          {process.env.NODE_ENV !== "production" && sessionId ? (
            <p className="text-[10px] text-white/30 mt-4">
              session_id: {sessionId} • mode: {mode}
            </p>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}
