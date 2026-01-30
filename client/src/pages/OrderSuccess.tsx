import { Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";

type CheckoutSessionInfo = {
  id: string;
  mode: "payment" | "subscription" | "setup" | string;
  customer_email: string | null;
  payment_status: string | null;
  subscription: string | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function OrderSuccess() {
  const { clearCart } = useCart();

  const [sessionInfo, setSessionInfo] = useState<CheckoutSessionInfo | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read Stripe Checkout Session ID from URL: /order-success?session_id=cs_...
  const sessionId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("session_id") || "";
  }, []);

  const isSubscription = sessionInfo?.mode === "subscription";

  useEffect(() => {
    // Clear cart on success page load
    clearCart();
    localStorage.removeItem("kimora-cart");
  }, [clearCart]);

  // Fetch session info so we can conditionally show subscription controls
  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        setSessionLoading(true);

        if (!sessionId) {
          // If someone navigates here directly, we can’t know what they bought.
          // Default to non-subscription UI.
          if (!cancelled) setSessionInfo(null);
          return;
        }

        const res = await fetch(`/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`);
        const data = (await res.json().catch(() => ({}))) as Partial<CheckoutSessionInfo>;

        if (!res.ok) {
          throw new Error((data as any)?.message || "Failed to load checkout session.");
        }

        if (!cancelled) {
          const normalizedPrefill = data.customer_email ? normalizeEmail(data.customer_email) : "";
          setSessionInfo(data as CheckoutSessionInfo);

          // Helpful: prefill the email input (subscription only) if we have it
          if (normalizedPrefill) setEmail(normalizedPrefill);
        }
      } catch (e) {
        // Don’t block the page if this fails — just hide the subscription UI
        if (!cancelled) setSessionInfo(null);
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function requestPortalLink() {
    const normalized = normalizeEmail(email);

    setError(null);

    if (!normalized || !isValidEmail(normalized)) {
      setError("Please enter the email used at checkout.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/customer-portal/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Unable to send link.");
      }

      setSent(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
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

          {/* Option B (brand copy) */}
          <p className="text-muted-foreground mb-6">
            Welcome to Kimora. Progress is built one decision at a time. This is one of them.
          </p>

          {/* One-time vs subscription helper line */}
          <p className="text-xs text-white/50 mb-8">
            {sessionLoading ? (
              "Finalizing your order details…"
            ) : isSubscription ? (
              "You’re set up on a subscription. You’ll receive email confirmations and renewal updates."
            ) : (
              "You’ll receive an email receipt from Stripe shortly."
            )}
          </p>

          {/* Subscription-only: Manage subscription block */}
          {isSubscription ? (
            <div className="bg-card/50 border border-white/10 rounded-xl p-5 mb-8 text-left">
              <h3 className="text-white font-semibold mb-2 text-center">
                Manage your subscription
              </h3>

              <p className="text-xs text-white/50 mb-4 text-center">
                Enter the email you used at checkout and we’ll send a secure link.
                You can also manage your subscription anytime at{" "}
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
                    autoComplete="email"
                    inputMode="email"
                  />

                  <Button
                    onClick={requestPortalLink}
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {loading ? "Sending…" : "Email me a secure link"}
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
          ) : null}

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
