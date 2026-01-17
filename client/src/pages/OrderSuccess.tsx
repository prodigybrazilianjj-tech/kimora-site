import { Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";

export default function OrderSuccess() {
  const { clearCart } = useCart();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("session_id");
  }, []);

  useEffect(() => {
    clearCart();
    localStorage.removeItem("kimora-cart");
  }, [clearCart]);

  async function openCustomerPortal() {
    if (!email) {
      setError("Please enter the email used at checkout.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.message || "Unable to open customer portal.");
      }

      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
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

          <p className="text-muted-foreground mb-6">
            Thanks — your payment went through. You’ll receive an email receipt shortly.
          </p>

          {sessionId && (
            <p className="text-xs text-white/40 mb-6 font-mono break-all">
              Confirmation ID: {sessionId}
            </p>
          )}

          <div className="bg-card/50 border border-white/10 rounded-xl p-5 mb-8">
            <h3 className="text-white font-semibold mb-3">
              Manage your subscription
            </h3>

            <input
              type="email"
              placeholder="Email used at checkout"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mb-3 px-4 py-3 rounded-md bg-black/40 border border-white/10 text-white"
            />

            <Button
              onClick={openCustomerPortal}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {loading ? "Opening…" : "Manage Subscription"}
            </Button>

            {error && (
              <p className="text-red-400 text-sm mt-3">{error}</p>
            )}
          </div>

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
