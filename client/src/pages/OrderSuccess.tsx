import { Link, useLocation } from "wouter";
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

type CartItem = {
  flavor: string; // e.g. "lemon-yuzu"
  type: "onetime" | "subscribe";
  frequency?: "2" | "4" | "6";
  quantity: number;
};

// Must match Checkout.tsx itemKey() exactly
function itemKey(it: CartItem) {
  return `${it.flavor}|${it.type}|${it.frequency ?? ""}|${it.quantity}`;
}

function safeReadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function OrderSuccess() {
  const { clearCart } = useCart();
  const [location] = useLocation();

  // ---- session info (to know if we should show subscription controls) ----
  const [sessionLoading, setSessionLoading] = useState(true);
  const [session, setSession] = useState<CheckoutSessionResponse | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // ---- subscription magic link UI ----
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Get session_id from query string
  const sessionId = useMemo(() => {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get("session_id") || "";
    } catch {
      // fallback for environments where URL isn't available
      const match = location.match(/session_id=([^&]+)/);
      return match ? decodeURIComponent(match[1]) : "";
    }
  }, [location]);

  const isSubscription =
    session?.mode === "subscription" || Boolean(session?.subscription);

  /**
   * Cart clearing behavior:
   * - If this was a mixed-cart flow, keep remaining items in cart.
   * - Remove only the items that were checked out (based on kimora-last-checkout).
   * - If we can't confidently determine, fallback to clearing everything (safe).
   */
  useEffect(() => {
    const last = safeReadJson<{
      mode: "subscription" | "onetime";
      email?: string;
      items: Array<CartItem & { _k?: string }>;
      ts: number;
    }>("kimora-last-checkout");

    const now = Date.now();
    const isRecent = !!last?.ts && now - last.ts < 30 * 60 * 1000; // 30 min

    const cart = safeReadJson<CartItem[]>("kimora-cart") ?? [];

    // If we can't safely compute what to remove, do the old behavior (clear all)
    if (!last || !isRecent || !Array.isArray(last.items) || cart.length === 0) {
      clearCart();
      localStorage.removeItem("kimora-cart");
      localStorage.removeItem("kimora-last-checkout");
      return;
    }

    // Build set of purchased item keys
    const purchasedKeys = new Set(
      last.items.map((it) => it._k || itemKey(it))
    );

    // Remove purchased items, keep remaining
    const remaining = cart.filter((it) => !purchasedKeys.has(itemKey(it)));

    if (remaining.length === 0) {
      // Fully clear
      clearCart();
      localStorage.removeItem("kimora-cart");
    } else {
      // Keep remaining in localStorage for the second checkout
      localStorage.setItem("kimora-cart", JSON.stringify(remaining));
      // IMPORTANT: do NOT call clearCart() here, because that would wipe remaining items
    }

    // One-time use
    localStorage.removeItem("kimora-last-checkout");
  }, [clearCart]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      setSessionLoading(true);
      setSessionError(null);

      // If there's no session_id, we can still show a friendly page
      if (!sessionId) {
        if (!cancelled) {
          setSession(null);
          setSessionLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(
          `/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`
        );

        const data = (await res
          .json()
          .catch(() => ({}))) as Partial<CheckoutSessionResponse>;

        if (!res.ok) {
          throw new Error(
            (data as any)?.message || "Failed to load checkout session."
          );
        }

        if (!cancelled) {
          const normalizedEmail = data?.customer_email
            ? normalizeEmail(data.customer_email)
            : "";
          setSession(data as CheckoutSessionResponse);
          setEmail((prev) => (prev ? prev : normalizedEmail));
          setSessionLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setSessionError(err?.message || "Failed to load checkout session.");
          setSessionLoading(false);
        }
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function requestPortalLink() {
    const normalized = normalizeEmail(email);

    if (!normalized) {
      setSendError("Enter the email you used at checkout.");
      return;
    }
    if (!isValidEmail(normalized)) {
      setSendError("Please enter a valid email address.");
      return;
    }

    setSending(true);
    setSendError(null);

    try {
      const res = await fetch("/api/customer-portal/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error((data as any)?.message || "Unable to send link.");
      }

      setSent(true);
    } catch (err: any) {
      setSendError(err?.message || "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container mx-auto max-w-2xl px-4 text-center">
          <h1 className="text-3xl font-display font-bold text-white mb-4">
            Order Confirmed 🎉
          </h1>

          <p className="text-muted-foreground mb-2">
            Welcome to Kimora. Progress is built one decision at a time. You just
            made a good one.
          </p>

          <p className="text-xs text-white/50 mb-8">
            You’ll receive an email receipt from Stripe shortly.
          </p>

          {sessionError && (
            <div className="mx-auto mb-6 max-w-xl rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {sessionError}
            </div>
          )}

          {/* SUBSCRIPTION CONTROL */}
          {!sessionLoading && isSubscription && (
            <div className="bg-card/50 border border-white/10 rounded-xl p-6 mb-6 text-left">
              <h3 className="text-white font-semibold text-center mb-1">
                You’re in control
              </h3>
              <p className="text-xs text-white/55 text-center mb-5">
                Adjust, pause, or cancel anytime. No games.
              </p>

              {sendError && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 text-center">
                  {sendError}
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
                    disabled={sending}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {sending ? "Sending…" : "Email me a secure link"}
                  </Button>

                  <div className="mt-3 text-[11px] text-white/45 text-center">
                    Links expire after ~15 minutes. If it expires, request a new
                    one.
                  </div>

                  <div className="mt-2 text-[11px] text-white/35 text-center">
                    Or manage anytime at{" "}
                    <Link
                      href="/manage-subscription"
                      className="underline underline-offset-4 hover:text-white"
                    >
                      kimoraco.com/manage-subscription
                    </Link>
                    .
                  </div>
                </>
              ) : (
                <p className="text-sm text-white/80 text-center">
                  If that email is in our system, you’ll receive a link shortly.
                </p>
              )}
            </div>
          )}

          {/* GUIDANCE */}
          <div className="bg-card/50 border border-white/10 rounded-xl p-6 mb-6 text-left">
            <h3 className="text-white font-semibold text-center mb-4">
              Your routine starts now
            </h3>

            <div className="grid gap-5">
              <div>
                <div className="text-sm font-semibold text-white mb-2">
                  How to take Kimora
                </div>
                <ul className="text-sm text-white/75 space-y-2 list-disc pl-5">
                  <li>
                    Mix <b>1 stick</b> in <b>12–16 oz</b> of cold water.
                  </li>
                  <li>
                    Best timing: <b>pre-training</b>, <b>post-training</b>, or{" "}
                    <b>first thing</b> — <b>consistency beats timing</b>.
                  </li>
                </ul>
              </div>

              <div className="h-px w-full bg-white/10" />

              <div>
                <div className="text-sm font-semibold text-white mb-2">
                  What’s next
                </div>
                <ul className="text-sm text-white/75 space-y-2 list-disc pl-5">
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
            </div>
          </div>

          {/* COMMITMENT */}
          <div className="mx-auto max-w-2xl mb-8 rounded-xl border border-white/10 bg-black/30 px-6 py-4">
            <div className="text-xs uppercase tracking-wider text-white/45 mb-1">
              Commitment tip
            </div>
            <div className="text-sm text-white/80">
              Pick a routine — same time every day for 14 days.{" "}
              <b>Progress stacks fast when you don’t negotiate with yourself.</b>
            </div>
          </div>

          {/* CTAs */}
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
        </div>
      </main>

      <Footer />
    </div>
  );
}
