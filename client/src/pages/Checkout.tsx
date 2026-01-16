import { useState } from "react";
import { Link } from "wouter";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/lib/cart";

type CheckoutItem = {
  flavor: string; // slug e.g. "lemon-yuzu"
  type: "onetime" | "subscribe";
  frequency?: "2" | "4" | "6";
  quantity: number;
};

function toKebabSlug(v: unknown) {
  if (typeof v !== "string") return "unknown";
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function Checkout() {
  const { subtotal, items } = useCart() as any;

  // TEMP: verify cart item shape in browser console
  // Remove after verification
  console.log("CART ITEMS:", items);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePlaceOrder() {
    setError(null);
    setIsLoading(true);

    try {
      const payloadItems: CheckoutItem[] = (items ?? []).map((it: any) => {
        const id = String(it?.id || "");
        // expected:
        // "lemon-yuzu-onetime"
        // "lemon-yuzu-sub-2" | "-sub-4" | "-sub-6"
        const m = id.match(/^(.+?)-(onetime|sub)(?:-(2|4|6))?$/);

        let flavorSlug = toKebabSlug(it?.flavorSlug ?? it?.flavor);
        let type: "onetime" | "subscribe" = it?.type === "subscribe" ? "subscribe" : "onetime";
        let frequency: "2" | "4" | "6" | undefined = undefined;

        if (m) {
          flavorSlug = m[1];
          type = m[2] === "sub" ? "subscribe" : "onetime";
          const freq = m[3];
          if (type === "subscribe" && (freq === "2" || freq === "4" || freq === "6")) {
            frequency = freq;
          }
        }

        return {
          flavor: flavorSlug,
          type,
          frequency,
          quantity: it?.quantity ?? 1,
        };
      });

      if (!payloadItems.length) {
        setError("Your cart is empty.");
        return;
      }

      // TEMP: verify payload
      // Remove after verification
      console.log("CHECKOUT PAYLOAD:", payloadItems);

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payloadItems }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error((data as any)?.message || "Checkout failed.");
      }

      if (!(data as any)?.url) {
        throw new Error("Stripe session created, but no URL returned.");
      }

      window.location.href = (data as any).url;
    } catch (e: any) {
      setError(e?.message || "Checkout failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Checkout Form */}
            <div>
              <h1 className="text-3xl font-display font-bold text-white mb-8">Checkout</h1>

              <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider border-b border-white/10 pb-2">
                    Contact
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="alex@example.com"
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider border-b border-white/10 pb-2">
                    Shipping
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="First Name"
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Last Name"
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        placeholder="123 Main St"
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        placeholder="City"
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input
                        id="zip"
                        placeholder="ZIP"
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={isLoading}
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider text-lg mt-8 disabled:opacity-60"
                >
                  {isLoading ? "Processing..." : "Place Order"}
                </Button>

                <div className="text-xs text-muted-foreground">
                  You’ll be redirected to Stripe Checkout.
                  <span className="ml-2">
                    <Link href="/cart" className="underline underline-offset-4">
                      Back to cart
                    </Link>
                  </span>
                </div>
              </form>
            </div>

            {/* Order Preview */}
            <div className="lg:pl-12 lg:border-l border-white/10">
              <div className="bg-card/50 p-6 rounded-xl border border-white/5 sticky top-32">
                <h3 className="text-lg font-bold text-white mb-6">Order Summary</h3>
                <div className="flex justify-between mb-4">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-white font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-4">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-white font-medium">Free</span>
                </div>
                <div className="border-t border-white/10 pt-4 flex justify-between">
                  <span className="text-xl font-bold text-white">Total</span>
                  <span className="text-xl font-bold text-primary">${subtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
            {/* end grid */}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
