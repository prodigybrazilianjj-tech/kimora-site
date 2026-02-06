import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/lib/cart";

type CheckoutItem = {
  flavor: string; // e.g. "lemon-yuzu"
  type: "onetime" | "subscribe";
  frequency?: "2" | "4" | "6";
  quantity: number;
};

function prettyFlavor(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function itemKey(it: CheckoutItem) {
  return `${it.flavor}|${it.type}|${it.frequency ?? ""}|${it.quantity}`;
}

function isFrequency(v: unknown): v is CheckoutItem["frequency"] {
  return v === "2" || v === "4" || v === "6";
}

function isCheckoutType(v: unknown): v is CheckoutItem["type"] {
  return v === "onetime" || v === "subscribe";
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

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { items, subtotal } = useCart() as any;

  // Email UX
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);

  // Request UX
  const [loading, setLoading] = useState<null | "subscription" | "onetime">(null);
  const [error, setError] = useState<string | null>(null);

  // Prevent double-autostart (React StrictMode/dev can run effects twice)
  const didAutoStart = useRef(false);

  // --- Parse resume mode from query string ---
  const resumeInfo = useMemo(() => {
    try {
      const url = new URL(window.location.href);
      const resume = url.searchParams.get("resume");
      const mode = url.searchParams.get("mode");

      const resumeOn = resume === "1" || resume === "true";

      const parsedMode: "subscription" | "onetime" | null =
        mode === "subscription" ? "subscription" : mode === "onetime" ? "onetime" : null;

      return { resumeOn, parsedMode };
    } catch {
      // fallback for odd environments
      return { resumeOn: false, parsedMode: null as "subscription" | "onetime" | null };
    }
  }, []);

  const payloadItems: CheckoutItem[] = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];

    return safeItems
      .map((it: any) => {
        const flavor = String(it?.flavor ?? "").trim();

        const type: CheckoutItem["type"] =
          it?.type === "subscribe" ? "subscribe" : "onetime";

        const frequency: CheckoutItem["frequency"] | undefined =
          type === "subscribe" && isFrequency(it?.frequency) ? it.frequency : undefined;

        const qRaw = Number(it?.quantity);
        const quantity = Number.isFinite(qRaw) ? Math.max(1, Math.floor(qRaw)) : 1;

        return { flavor, type, frequency, quantity } satisfies CheckoutItem;
      })
      .filter((it) => {
        if (!it.flavor) return false;
        if (!isCheckoutType(it.type)) return false;
        if (it.type === "subscribe" && !it.frequency) return false;
        if (!Number.isInteger(it.quantity) || it.quantity < 1) return false;
        return true;
      });
  }, [items]);

  const isEmpty = payloadItems.length === 0;

  const subscriptionItems = useMemo(
    () => payloadItems.filter((it) => it.type === "subscribe"),
    [payloadItems],
  );
  const onetimeItems = useMemo(
    () => payloadItems.filter((it) => it.type === "onetime"),
    [payloadItems],
  );

  const hasSub = subscriptionItems.length > 0;
  const hasOne = onetimeItems.length > 0;
  const isMixed = hasSub && hasOne;

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const emailOk = useMemo(
    () => Boolean(normalizedEmail) && isValidEmail(normalizedEmail),
    [normalizedEmail],
  );

  // Load a remembered email (so the “resume checkout” can be 1-click)
  useEffect(() => {
    if (email) return;
    const remembered = localStorage.getItem("kimora-checkout-email") || "";
    if (remembered) setEmail(remembered);
  }, [email]);

  // Clear server error once user starts fixing email
  useEffect(() => {
    if (error && emailTouched) setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  async function startCheckout(mode: "subscription" | "onetime") {
    if (isEmpty || loading) return;

    setError(null);
    setEmailTouched(true);

    if (!emailOk) {
      setError("Please enter a valid email for your receipt and order updates.");
      return;
    }

    // Persist email so the next leg (resume) can auto-run
    localStorage.setItem("kimora-checkout-email", normalizedEmail);

    const itemsToCheckout = mode === "subscription" ? subscriptionItems : onetimeItems;

    if (!itemsToCheckout.length) {
      setError("Nothing to checkout for that selection.");
      return;
    }

    setLoading(mode);

    try {
      // Store which items we are checking out (helps OrderSuccess remove only purchased ones)
      localStorage.setItem(
        "kimora-last-checkout",
        JSON.stringify({
          mode,
          email: normalizedEmail,
          items: itemsToCheckout.map((it) => ({
            flavor: it.flavor,
            type: it.type,
            frequency: it.frequency,
            quantity: it.quantity,
            _k: itemKey(it),
          })),
          ts: Date.now(),
        }),
      );

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          items: itemsToCheckout,
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
      setError(e?.message || "Checkout failed.");
      setLoading(null);
    }
  }

  // ✅ AUTO-START when coming from OrderSuccess “Finish checkout”
  useEffect(() => {
    if (!resumeInfo.resumeOn) return;
    if (!resumeInfo.parsedMode) return;
    if (didAutoStart.current) return;
    if (loading) return;

    const mode = resumeInfo.parsedMode;

    // Only auto-start if the cart actually has items of that mode
    const hasModeItems = mode === "subscription" ? hasSub : hasOne;
    if (!hasModeItems) return;

    // We need a valid email to auto-run
    const remembered = localStorage.getItem("kimora-checkout-email") || "";
    const effectiveEmail = normalizeEmail(email || remembered);

    if (!effectiveEmail || !isValidEmail(effectiveEmail)) {
      // Let the page render and ask for email; don't auto-run
      return;
    }

    // Ensure state has the email (so UI matches reality)
    if (!email) setEmail(effectiveEmail);

    didAutoStart.current = true;
    // slight delay so UI can paint "Redirecting..." and avoid React timing weirdness
    setTimeout(() => startCheckout(mode), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeInfo, email, hasSub, hasOne, loading]);

  const showEmailInlineError = emailTouched && !emailOk && !!email;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left: CTA */}
            <div>
              <h1 className="text-3xl font-display font-bold text-white mb-6">
                Checkout
              </h1>

              <p className="text-muted-foreground mb-8">
                You’ll enter shipping and payment details on Stripe (secure). We use
                your email for your receipt and order updates.
              </p>

              <div className="mb-6">
                <Label className="text-sm text-white mb-2 block" htmlFor="email">
                  Email for receipt
                </Label>

                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  placeholder="you@example.com"
                  inputMode="email"
                  autoComplete="email"
                  className="h-12 bg-background border-white/10 text-white placeholder:text-white/40"
                />

                {showEmailInlineError ? (
                  <p className="text-xs text-red-200 mt-2">
                    Please enter a valid email address.
                  </p>
                ) : (
                  <p className="text-xs text-white/50 mt-2">
                    Stripe will pre-fill this on the next screen and send your receipt
                    automatically.
                  </p>
                )}
              </div>

              {isMixed ? (
                <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-white font-semibold mb-1">
                    Two-part checkout
                  </div>
                  <p className="text-sm text-white/70">
                    Subscriptions and one-time orders must be checked out separately.
                    Choose what you want to checkout first — we’ll keep it simple.
                  </p>
                </div>
              ) : null}

              {error ? (
                <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                  {error}
                </div>
              ) : null}

              {/* Buttons */}
              <div className="flex flex-col gap-3">
                {!isMixed ? (
                  <Button
                    type="button"
                    onClick={() => startCheckout(hasSub ? "subscription" : "onetime")}
                    disabled={isEmpty || !emailOk || !!loading}
                    className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider text-lg"
                  >
                    {loading ? "Redirecting to Stripe..." : "Continue to Payment"}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      onClick={() => startCheckout("subscription")}
                      disabled={!hasSub || !emailOk || !!loading}
                      className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider text-lg"
                    >
                      {loading === "subscription"
                        ? "Redirecting to Stripe..."
                        : "Checkout Subscription"}
                    </Button>

                    <Button
                      type="button"
                      onClick={() => startCheckout("onetime")}
                      disabled={!hasOne || !emailOk || !!loading}
                      className="w-full h-14 bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-wider text-lg"
                    >
                      {loading === "onetime"
                        ? "Redirecting to Stripe..."
                        : "Checkout One-Time Items"}
                    </Button>

                    <p className="text-xs text-white/50">
                      After the first checkout, you can come back and complete the
                      other one.
                    </p>
                  </>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  className="w-full h-12 bg-white/10 hover:bg-white/20 text-white"
                  onClick={() => setLocation("/cart")}
                  disabled={!!loading}
                >
                  Back to Cart
                </Button>

                <p className="text-xs text-white/50 mt-2">
                  Powered by Stripe. We never see your card details.
                </p>
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="lg:pl-12 lg:border-l border-white/10">
              <div className="bg-card/50 p-6 rounded-xl border border-white/5 sticky top-32">
                <h3 className="text-lg font-bold text-white mb-6">Order Summary</h3>

                {payloadItems.length ? (
                  <div className="space-y-6 mb-6">
                    {isMixed ? (
                      <>
                        <div>
                          <div className="text-sm font-semibold text-white mb-2">
                            Subscription
                          </div>
                          <div className="space-y-3">
                            {subscriptionItems.map((it, idx) => (
                              <div
                                key={`sub-${it.flavor}-${it.frequency}-${idx}`}
                                className="flex justify-between gap-4"
                              >
                                <div className="min-w-0">
                                  <div className="text-white font-medium truncate">
                                    {prettyFlavor(it.flavor)}
                                  </div>
                                  <div className="text-xs text-white/60">
                                    {`Subscription • every ${it.frequency} weeks • qty ${it.quantity}`}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="border-t border-white/10 pt-5">
                          <div className="text-sm font-semibold text-white mb-2">
                            One-time items
                          </div>
                          <div className="space-y-3">
                            {onetimeItems.map((it, idx) => (
                              <div
                                key={`one-${it.flavor}-${idx}`}
                                className="flex justify-between gap-4"
                              >
                                <div className="min-w-0">
                                  <div className="text-white font-medium truncate">
                                    {prettyFlavor(it.flavor)}
                                  </div>
                                  <div className="text-xs text-white/60">
                                    {`One-time purchase • qty ${it.quantity}`}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3">
                        {payloadItems.map((it, idx) => (
                          <div
                            key={`${it.flavor}-${it.type}-${it.frequency ?? "n"}-${idx}`}
                            className="flex justify-between gap-4"
                          >
                            <div className="min-w-0">
                              <div className="text-white font-medium truncate">
                                {prettyFlavor(it.flavor)}
                              </div>
                              <div className="text-xs text-white/60">
                                {it.type === "subscribe"
                                  ? `Subscription • every ${it.frequency} weeks`
                                  : "One-time purchase"}
                                {` • qty ${it.quantity}`}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-white/60 mb-6">
                    Your cart is empty.{" "}
                    <Link href="/shop" className="underline text-white">
                      Go shop
                    </Link>
                    .
                  </div>
                )}

                <div className="flex justify-between mb-4">
                  <span className="text-muted-foreground">Cart subtotal</span>
                  <span className="text-white font-medium">
                    ${Number(subtotal || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between mb-4">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-white font-medium">Calculated on Stripe</span>
                </div>

                <div className="border-t border-white/10 pt-4 flex justify-between">
                  <span className="text-xl font-bold text-white">Total</span>
                  <span className="text-xl font-bold text-primary">
                    Finalized in Stripe
                  </span>
                </div>

                <p className="text-xs text-white/50 mt-4">
                  Taxes/shipping (if any) are finalized in Stripe Checkout.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
