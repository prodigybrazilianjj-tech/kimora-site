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

type ResumeMode = "subscription" | "onetime";

type CheckoutApiError = {
  message: string;
  restockAlertSaved?: boolean;
  restockAlertCount?: number;
};

function safeGetString(key: string): string {
  try {
    return String(localStorage.getItem(key) || "");
  } catch {
    return "";
  }
}

function safeSetString(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
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

function isResumeMode(v: unknown): v is ResumeMode {
  return v === "subscription" || v === "onetime";
}

function looksLikeInventoryError(message: string | null | undefined) {
  const msg = String(message || "").toLowerCase();
  if (!msg) return false;

  return (
    msg.includes("left in stock") ||
    msg.includes("out of stock") ||
    msg.includes("not currently available") ||
    msg.includes("not currently active")
  );
}

function buildCheckoutErrorMessage(err: CheckoutApiError) {
  const base = String(err.message || "Checkout failed.").trim();
  if (!err.restockAlertSaved) return base;

  const count = Number(err.restockAlertCount ?? 0) || 0;
  const suffix =
    count > 1
      ? "You’ve been added to the restock list for the unavailable items. We’ll notify you as soon as they’re available."
      : "You’ve been added to the restock list. We’ll notify you as soon as it’s available.";

  return `${base}\n\n${suffix}`;
}

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { items, subtotal } = useCart() as any;

  // ---- resume params ----
  const [resumeMode, setResumeMode] = useState<ResumeMode | null>(null);
  const didAutoStart = useRef(false);

  // Email UX (hydrate synchronously so emailOk is true immediately on resume)
  const [email, setEmail] = useState(() => {
    const stored = normalizeEmail(safeGetString("kimora-checkout-email"));
    if (stored && isValidEmail(stored)) return stored;

    // Optional fallback (in case you store it elsewhere)
    const last = safeReadJson<{ email?: string }>("kimora-last-checkout");
    const lastEmail = normalizeEmail(String(last?.email || ""));
    if (lastEmail && isValidEmail(lastEmail)) return lastEmail;

    return "";
  });
  const [emailTouched, setEmailTouched] = useState(false);

  // Request UX
  const [loading, setLoading] = useState<null | "subscription" | "onetime">(null);
  const [error, setError] = useState<string | null>(null);

  // Parse resume query params
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const resume = url.searchParams.get("resume");
      const mode = url.searchParams.get("mode");

      if (resume && resume !== "0") {
        const m = isResumeMode(mode) ? mode : null;
        setResumeMode(m);
      } else {
        setResumeMode(null);
      }
    } catch {
      setResumeMode(null);
    }
  }, []);

  // Persist email (so it survives back/forward and success->resume flow)
  useEffect(() => {
    const normalized = normalizeEmail(email);
    if (normalized && isValidEmail(normalized)) {
      safeSetString("kimora-checkout-email", normalized);
    }
  }, [email]);

  const payloadItems: CheckoutItem[] = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];

    return safeItems
      .map((it: any) => {
        const flavor = String(it?.flavor ?? "").trim();

        const type: CheckoutItem["type"] =
          it?.type === "subscribe" ? "subscribe" : "onetime";

        const frequency: CheckoutItem["frequency"] | undefined =
          type === "subscribe" && isFrequency(it?.frequency)
            ? it.frequency
            : undefined;

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

  const cartSignature = useMemo(() => {
    return payloadItems
      .map((it) => itemKey(it))
      .sort()
      .join("||");
  }, [payloadItems]);

  const previousCartSignatureRef = useRef(cartSignature);

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

  const hasInventoryError = useMemo(() => looksLikeInventoryError(error), [error]);

  // Clear email-only error once the email is valid
  useEffect(() => {
    if (error && !hasInventoryError && emailOk) setError(null);
  }, [emailOk, error, hasInventoryError]);

  // Clear prior stock error only when cart contents actually change
  useEffect(() => {
    if (previousCartSignatureRef.current !== cartSignature) {
      previousCartSignatureRef.current = cartSignature;

      if (hasInventoryError) {
        setError(null);
      }
    }
  }, [cartSignature, hasInventoryError]);

  async function startCheckout(mode: ResumeMode) {
    if (loading) return;
    if (hasInventoryError) return;

    setError(null);
    setEmailTouched(true);

    if (!emailOk) {
      setError("Please enter a valid email for your receipt and order updates.");
      setLoading(null);
      return;
    }

    const itemsToCheckout = mode === "subscription" ? subscriptionItems : onetimeItems;

    if (!itemsToCheckout.length) {
      setError("Nothing to checkout for that selection.");
      setLoading(null);
      return;
    }

    setLoading(mode);

    try {
      // Store which items we are checking out (helps OrderSuccess remove only purchased items)
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
        const apiError: CheckoutApiError = {
          message:
            (data && (data.message || data.error)) ||
            text ||
            `Checkout failed (${res.status}).`,
          restockAlertSaved: Boolean(data?.restockAlertSaved),
          restockAlertCount:
            typeof data?.restockAlertCount === "number" ? data.restockAlertCount : undefined,
        };

        throw apiError;
      }

      const url = data?.url;
      if (!url) {
        throw {
          message: "Stripe session created, but no URL returned.",
        } satisfies CheckoutApiError;
      }

      window.location.href = url;
    } catch (e: any) {
      const apiError: CheckoutApiError = {
        message: String(e?.message || "Checkout failed."),
        restockAlertSaved: Boolean(e?.restockAlertSaved),
        restockAlertCount:
          typeof e?.restockAlertCount === "number" ? e.restockAlertCount : undefined,
      };

      setError(buildCheckoutErrorMessage(apiError));
      setLoading(null);
    }
  }

  // ✅ AUTO-START RESUME FLOW
  useEffect(() => {
    if (!resumeMode) return;
    if (didAutoStart.current) return;
    if (isEmpty) return;
    if (hasInventoryError) return;

    // Must be ready to proceed
    if (!emailOk) return;

    // If resumeMode says "onetime" but there are no one-time items, don't auto-start
    if (resumeMode === "onetime" && !hasOne) return;
    if (resumeMode === "subscription" && !hasSub) return;

    didAutoStart.current = true;
    startCheckout(resumeMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeMode, isEmpty, emailOk, hasOne, hasSub, hasInventoryError]);

  const showEmailInlineError = emailTouched && !emailOk && !!email;

  const singleCheckoutDisabled = isEmpty || !emailOk || !!loading || hasInventoryError;
  const subscriptionCheckoutDisabled = !hasSub || !emailOk || !!loading || hasInventoryError;
  const onetimeCheckoutDisabled = !hasOne || !emailOk || !!loading || hasInventoryError;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left */}
            <div>
              <h1 className="text-3xl font-display font-bold text-white mb-6">
                Checkout
              </h1>

              <p className="text-muted-foreground mb-8">
                You’ll enter shipping and payment details on Stripe (secure). We use
                your email for your receipt and order updates.
              </p>

              {/* If resuming, show a small banner */}
              {resumeMode ? (
                <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-white font-semibold mb-1">
                    Resuming checkout
                  </div>
                  <p className="text-sm text-white/70">
                    We’re sending you to Stripe for your{" "}
                    <b>{resumeMode === "onetime" ? "one-time items" : "subscription"}</b>.
                    {loading ? " Redirecting now…" : ""}
                  </p>
                </div>
              ) : null}

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
                  disabled={!!loading}
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
                  </p>
                </div>
              ) : null}

              {error ? (
                <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 whitespace-pre-line">
                  <div>{error}</div>

                  {hasInventoryError ? (
                    <div className="mt-4">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-10 bg-white/10 hover:bg-white/20 text-white"
                        onClick={() => setLocation("/cart")}
                        disabled={!!loading}
                      >
                        Adjust Cart
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Buttons */}
              <div className="flex flex-col gap-3">
                {!isMixed ? (
                  <Button
                    type="button"
                    onClick={() => startCheckout(hasSub ? "subscription" : "onetime")}
                    disabled={singleCheckoutDisabled}
                    className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider text-lg disabled:opacity-60"
                  >
                    {loading
                      ? "Redirecting to Stripe..."
                      : hasInventoryError
                        ? "Adjust Cart to Continue"
                        : "Continue to Payment"}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      onClick={() => startCheckout("subscription")}
                      disabled={subscriptionCheckoutDisabled}
                      className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider text-lg disabled:opacity-60"
                    >
                      {loading === "subscription"
                        ? "Redirecting to Stripe..."
                        : hasInventoryError
                          ? "Adjust Cart to Continue"
                          : "Checkout Subscription"}
                    </Button>

                    <Button
                      type="button"
                      onClick={() => startCheckout("onetime")}
                      disabled={onetimeCheckoutDisabled}
                      className="w-full h-14 bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-wider text-lg disabled:opacity-60"
                    >
                      {loading === "onetime"
                        ? "Redirecting to Stripe..."
                        : hasInventoryError
                          ? "Adjust Cart to Continue"
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