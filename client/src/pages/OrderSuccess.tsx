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

function prettyFlavor(slug: string) {
  return String(slug || "")
    .trim()
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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

type LastCheckout = {
  mode: "subscription" | "onetime";
  email?: string;
  items: Array<CartItem & { _k?: string }>;
  ts: number;
};

type RemainingMode = "subscription" | "onetime" | "mixed";

type RemainingInfo =
  | null
  | {
      items: CartItem[];
      mode: RemainingMode;
    };

function inferRemainingMode(items: CartItem[]): RemainingMode {
  const hasSub = items.some((i) => i.type === "subscribe");
  const hasOne = items.some((i) => i.type === "onetime");
  if (hasSub && hasOne) return "mixed";
  if (hasSub) return "subscription";
  return "onetime";
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

  // ---- remaining items (mixed cart continuation) ----
  const [remaining, setRemaining] = useState<RemainingInfo>(null);
  const [continueLoading, setContinueLoading] = useState(false);
  const [continueError, setContinueError] = useState<string | null>(null);

  // Get session_id from query string
  const sessionId = useMemo(() => {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get("session_id") || "";
    } catch {
      const match = location.match(/session_id=([^&]+)/);
      return match ? decodeURIComponent(match[1]) : "";
    }
  }, [location]);

  const isSubscription =
    session?.mode === "subscription" || Boolean(session?.subscription);

  /**
   * Cart success behavior:
   * - If this was a mixed-cart flow, keep remaining items in localStorage cart.
   * - Remove ONLY the items that were checked out (based on kimora-last-checkout).
   * - If we can't confidently determine, fallback to clearing everything (safe).
   *
   * Also: populate `remaining` state so the success page can offer “Checkout remaining items”.
   */
  useEffect(() => {
    const last = safeReadJson<LastCheckout>("kimora-last-checkout");
    const now = Date.now();
    const isRecent = !!last?.ts && now - last.ts < 30 * 60 * 1000; // 30 min

    const cart = safeReadJson<CartItem[]>("kimora-cart") ?? [];

    // If we can't safely compute what to remove, do the old behavior (clear all)
    if (!last || !isRecent || !Array.isArray(last.items)) {
      // If there IS a cart, leave it alone (better UX than nuking it)
      // But we still clear cart state to avoid UI mismatch with localStorage if useCart reads from memory.
      // Your cart store likely rehydrates from localStorage; keeping localStorage intact is the key.
      localStorage.removeItem("kimora-last-checkout");
      setRemaining(
        cart.length
          ? { items: cart, mode: inferRemainingMode(cart) }
          : null
      );
      setContinueError(null);
      return;
    }

    if (cart.length === 0) {
      // Nothing to subtract from — just clear last checkout marker
      localStorage.removeItem("kimora-last-checkout");
      setRemaining(null);
      return;
    }

    // Build set of purchased item keys
    const purchasedKeys = new Set(last.items.map((it) => it._k || itemKey(it)));

    // Remove purchased items, keep remaining
    const remainingItems = cart.filter((it) => !purchasedKeys.has(itemKey(it)));

    if (remainingItems.length === 0) {
      // Fully clear
      clearCart();
      localStorage.removeItem("kimora-cart");
      setRemaining(null);
    } else {
      // Keep remaining in localStorage for the second checkout
      localStorage.setItem("kimora-cart", JSON.stringify(remainingItems));
      setRemaining({
        items: remainingItems,
        mode: inferRemainingMode(remainingItems),
      });
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

  async function checkoutRemainingNow() {
    setContinueError(null);

    if (!remaining || remaining.items.length === 0) return;

    // If remaining is mixed, send them to checkout to choose (since /api/checkout can't mix modes)
    if (remaining.mode === "mixed") {
      window.location.href = "/checkout";
      return;
    }

    const normalized = normalizeEmail(email);
    if (!normalized || !isValidEmail(normalized)) {
      setContinueError("Enter a valid email so Stripe can send your receipt.");
      return;
    }

    setContinueLoading(true);

    try {
      // Store which items we're about to checkout (so OrderSuccess can subtract next time)
      localStorage.setItem(
        "kimora-last-checkout",
        JSON.stringify({
          mode: remaining.mode === "subscription" ? "subscription" : "onetime",
          email: normalized,
          items: remaining.items.map((it) => ({ ...it, _k: itemKey(it) })),
          ts: Date.now(),
        } satisfies LastCheckout)
      );

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalized,
          items: remaining.items,
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const data: any = isJson ? await res.json().catch(() => ({})) : null;
      const text: string = !isJson ? await res.text().catch(() => "") : "";

      if (!res.ok) {
        const msg =
          (data && (data.message || data.error)) ||
          text ||
          `Checkout failed (${res.status}).`;
        throw new Error(msg);
      }

      const url = data?.url;
      if (!url) throw new Error("Stripe session created, but no URL returned.");

      window.location.href = url;
    } catch (e: any) {
      setContinueError(
        e?.message || "Could not start checkout for remaining items."
      );
      setContinueLoading(false);
    }
  }

  const remainingCount = remaining?.items?.length ?? 0;

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

          {/* MIXED CART CONTINUATION (top priority) */}
          {remaining && remainingCount > 0 && (
            <div className="bg-card/50 border border-white/10 rounded-xl p-6 mb-6 text-left">
              <h3 className="text-white font-semibold text-center mb-1">
                You still have items in your cart
              </h3>
              <p className="text-xs text-white/55 text-center mb-5">
                You checked out one part of a mixed cart. Finish the rest whenever
                you’re ready.
              </p>

              {continueError && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 text-center">
                  {continueError}
                </div>
              )}

              <div className="mb-4 rounded-lg border border-white/10 bg-black/30 p-4">
                <div className="text-xs uppercase tracking-wider text-white/45 mb-2">
                  Remaining ({remaining.items.length}) •{" "}
                  {remaining.mode === "subscription"
                    ? "Subscription"
                    : remaining.mode === "onetime"
                      ? "One-time"
                      : "Mixed"}
                </div>

                <div className="space-y-2">
                  {remaining.items.slice(0, 6).map((it, idx) => (
                    <div
                      key={`${it.flavor}-${it.type}-${it.frequency ?? "n"}-${idx}`}
                      className="flex justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="text-white/90 font-medium truncate">
                          {prettyFlavor(it.flavor)}
                        </div>
                        <div className="text-xs text-white/55">
                          {it.type === "subscribe"
                            ? `Subscription • every ${it.frequency} weeks`
                            : "One-time purchase"}
                          {` • qty ${it.quantity}`}
                        </div>
                      </div>
                    </div>
                  ))}

                  {remaining.items.length > 6 && (
                    <div className="text-xs text-white/45">
                      + {remaining.items.length - 6} more item(s)
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs text-white/45 mb-2 text-center">
                  We’ll use your email for the receipt on Stripe:
                </div>

                <input
                  type="email"
                  placeholder="Email used at checkout"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mb-3 px-4 py-3 rounded-md bg-black/40 border border-white/10 text-white"
                  autoComplete="email"
                  inputMode="email"
                />

                <div className="flex flex-col gap-3">
                  <Button
                    onClick={checkoutRemainingNow}
                    disabled={continueLoading}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    {continueLoading
                      ? "Redirecting to Stripe…"
                      : remaining.mode === "mixed"
                        ? "Review remaining in Checkout"
                        : "Checkout remaining items"}
                  </Button>

                  <Link href="/checkout">
                    <Button
                      variant="secondary"
                      className="w-full bg-white/10 hover:bg-white/20 text-white"
                    >
                      Review in Checkout
                    </Button>
                  </Link>

                  <Link
                    href="/cart"
                    className="text-center text-xs text-white/50 underline underline-offset-4 hover:text-white"
                  >
                    Or view cart
                  </Link>
                </div>
              </div>
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
                    Links expire after ~15 minutes. If it expires, request a new one.
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
                    You’ll get an order email from Stripe (check spam/promotions if
                    you don’t see it).
                  </li>
                  <li>
                    Shipping + taxes are finalized in Stripe Checkout (your receipt
                    reflects the final total).
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
            If you don’t see the email within a few minutes, check spam/promotions.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
