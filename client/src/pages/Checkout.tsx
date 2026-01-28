import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { items, subtotal } = useCart() as any;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payloadItems: CheckoutItem[] = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];
    return safeItems
      .map((it: any) => ({
        flavor: String(it?.flavor ?? ""),
        type: it?.type === "subscribe" ? "subscribe" : "onetime",
        frequency: it?.type === "subscribe" ? it?.frequency : undefined,
        quantity: Number.isFinite(it?.quantity) ? Math.max(1, it.quantity) : 1,
      }))
      .filter((it) => {
        if (!it.flavor) return false;
        if (it.type === "subscribe" && !it.frequency) return false;
        return true;
      });
  }, [items]);

  const isEmpty = payloadItems.length === 0;

  async function handleStripeCheckout() {
    if (isEmpty || loading) return;

    setError(null);

    const normalized = normalizeEmail(email);
    if (!normalized || !isValidEmail(normalized)) {
      setError("Please enter a valid email for your receipt and order updates.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalized,
          items: payloadItems,
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
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left: Summary + CTA */}
            <div>
              <h1 className="text-3xl font-display font-bold text-white mb-6">
                Checkout
              </h1>

              <p className="text-muted-foreground mb-8">
                You’ll enter shipping and payment details on Stripe (secure). We
                use your email for your receipt and order updates.
              </p>

              <div className="mb-6">
                <Label className="text-sm text-white mb-2 block">
                  Email for receipt
                </Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  inputMode="email"
                  autoComplete="email"
                  className="h-12 bg-background border-white/10 text-white placeholder:text-white/40"
                />
                <p className="text-xs text-white/50 mt-2">
                  This is where Stripe will send your receipt.
                </p>
              </div>

              {error ? (
                <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  onClick={handleStripeCheckout}
                  disabled={loading || isEmpty}
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider text-lg"
                >
                  {loading ? "Redirecting to Stripe..." : "Continue to Payment"}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  className="w-full h-12 bg-white/10 hover:bg-white/20 text-white"
                  onClick={() => setLocation("/cart")}
                >
                  Back to Cart
                </Button>

                <p className="text-xs text-white/50 mt-2">
                  Powered by Stripe. We never see your card details.
                </p>
              </div>
            </div>

            {/* Right: Order Preview */}
            <div className="lg:pl-12 lg:border-l border-white/10">
              <div className="bg-card/50 p-6 rounded-xl border border-white/5 sticky top-32">
                <h3 className="text-lg font-bold text-white mb-6">
                  Order Summary
                </h3>

                {payloadItems.length ? (
                  <div className="space-y-3 mb-6">
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
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-white font-medium">
                    ${Number(subtotal || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between mb-4">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-white font-medium">
                    Calculated on Stripe
                  </span>
                </div>
                <div className="border-t border-white/10 pt-4 flex justify-between">
                  <span className="text-xl font-bold text-white">Total</span>
                  <span className="text-xl font-bold text-primary">
                    ${Number(subtotal || 0).toFixed(2)}
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
