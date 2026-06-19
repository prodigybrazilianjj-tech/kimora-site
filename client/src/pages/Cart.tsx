import { useMemo } from "react";
import { Link } from "wouter";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ArrowRight } from "lucide-react";
import { useCart } from "@/lib/cart";

function prettyFlavor(slug: string) {
  return String(slug || "")
    .split("-")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

export default function Cart() {
  const { items, updateQuantity, removeFromCart, subtotal, setQuantity } = useCart() as any;

  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-8">
            Your Cart
          </h1>

          {safeItems.length === 0 ? (
            <div className="text-center py-24 bg-card border border-foreground/5 rounded-2xl">
              <p className="text-xl text-muted-foreground mb-6">Your cart is empty.</p>
              <Link href="/shop">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider">
                  Start Shopping
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-4">
                {safeItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-6 p-4 bg-card border border-foreground/5 rounded-xl"
                  >
                    <div className="w-20 h-20 bg-secondary/30 rounded-lg p-2 flex-shrink-0">
                      <img
                        src={item.image}
                        alt={item.flavor}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="flex-grow min-w-0">
                      <h3 className="font-bold text-foreground text-lg truncate">
                        {prettyFlavor(item.flavor)}
                      </h3>

                      <p className="text-sm text-muted-foreground">
                        {item.type === "subscribe"
                          ? "Monthly Subscription"
                          : "One-time Purchase"}
                      </p>

                      <p className="text-sm font-medium text-primary mt-1">
                        ${Number(item.price || 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-4">
                      <div className="flex items-center border border-foreground/10 rounded-lg bg-foreground/5 h-9">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="px-2 text-foreground hover:text-primary transition-colors h-full flex items-center"
                          aria-label={`Decrease quantity of ${prettyFlavor(item.flavor)}`}
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        <input
                          type="number"
                          min={1}
                          step={1}
                          inputMode="numeric"
                          value={item.quantity}
                          onChange={(e) => {
                            const raw = Number(e.target.value);
                            const next = Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : 1;

                            if (typeof setQuantity === "function") {
                              setQuantity(item.id, next);
                            }
                          }}
                          className="w-12 text-center text-sm font-bold text-foreground bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          aria-label={`Quantity of ${prettyFlavor(item.flavor)}`}
                        />

                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="px-2 text-foreground hover:text-primary transition-colors h-full flex items-center"
                          aria-label={`Increase quantity of ${prettyFlavor(item.flavor)}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label={`Remove ${prettyFlavor(item.flavor)} from cart`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-4">
                  <div className="text-foreground font-semibold mb-1">Cart tip</div>
                  <p className="text-sm text-foreground/70">
                    You can adjust quantities here before checkout. If inventory is limited,
                    reduce the quantity and try again.
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-card border border-foreground/5 rounded-xl p-6 h-fit">
                <h3 className="font-display font-bold text-2xl text-foreground mb-6">
                  Order Summary
                </h3>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>${Number(subtotal || 0).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>

                  <div className="border-t border-foreground/10 pt-3 flex justify-between text-foreground font-bold text-lg">
                    <span>Total</span>
                    <span>${Number(subtotal || 0).toFixed(2)}</span>
                  </div>
                </div>

                <Link href="/checkout">
                  <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider">
                    Checkout <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}