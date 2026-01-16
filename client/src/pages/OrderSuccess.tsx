import { Link } from "wouter";
import { useEffect, useMemo } from "react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";

export default function OrderSuccess() {
  const { clearCart } = useCart();

  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("session_id");
  }, []);

  useEffect(() => {
    // Clear cart immediately after a successful checkout
    clearCart();

    // Defensive: ensure localStorage is cleared even if something blocks state sync
    try {
      localStorage.removeItem("kimora-cart");
    } catch {
      // ignore
    }
  }, [clearCart]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container mx-auto max-w-xl px-4 text-center">
          <h1 className="text-3xl font-display font-bold text-white mb-4">
            Order Confirmed 🎉
          </h1>

          <p className="text-muted-foreground mb-6">
            Thanks — your payment went through. You’ll receive an email receipt
            shortly.
          </p>

          {sessionId ? (
            <p className="text-xs text-white/40 mb-8">
              Confirmation ID:{" "}
              <span className="font-mono break-all">{sessionId}</span>
            </p>
          ) : (
            <div className="mb-8" />
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
            If you don’t see the email within a few minutes, check spam/promotions.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
