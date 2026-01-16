import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";

export default function OrderSuccess() {
  const cart = useCart() as any;
  const clearCart = cart?.clearCart;

  const [cleared, setCleared] = useState(false);

  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("session_id");
  }, []);

  useEffect(() => {
    if (!cleared) {
      try {
        clearCart?.();
      } catch {}
      setCleared(true);
    }
  }, [cleared, clearCart]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-3xl">
          <div className="bg-card/50 p-8 rounded-2xl border border-white/10">
            <h1 className="text-3xl font-display font-bold text-white">
              Order confirmed ✅
            </h1>

            <p className="text-muted-foreground mt-4 leading-relaxed">
              Thanks — your checkout was successful.
              <br />
              You’ll receive an email confirmation from Stripe.
            </p>

            {sessionId ? (
              <p className="text-xs text-white/60 mt-4 break-all">
                Checkout Session: {sessionId}
              </p>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link href="/shop">
                <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-bold">
                  Continue Shopping
                </Button>
              </Link>

              <Link href="/">
                <Button
                  variant="secondary"
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white"
                >
                  Back to Home
                </Button>
              </Link>
            </div>

            <p className="text-xs text-white/50 mt-6">
              If you have any issues, reply to your receipt email.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
