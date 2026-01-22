import { Link } from "wouter";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";

export default function OrderSuccess() {
  const { clearCart } = useCart();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clearCart();
    localStorage.removeItem("kimora-cart");
  }, [clearCart]);

  async function requestPortalLink() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Please enter the email used at checkout.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/customer-portal/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Unable to send link.");
      }

      setSent(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
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

          <p className="text-muted-foreground mb-8">
            Thanks — your payment went through. You’ll receive an email receipt shortly.
          </p>

          {/* Manage subscription block */}
          <div className="bg-card/50 border border-white/10 rounded-xl p-5 mb-8 text-left">
            <h3 className="text-white font-semibold mb-2 text-center">
              Manage your subscription
            </h3>

            <p className="text-xs text-white/50 mb-4 text-center">
              Enter the email you used at checkout and we’ll send a secure link. You can also manage your
              subscription anytime at{" "}
              <Link href="/manage-subscription" className="underline underline-offset-4 hover:text-white">
              kimoraco.com/manage-subscription
              </Link>{" "}
              (also linked in the footer).
            </p>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 text-center">
                {error}
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
                />

                <Button
                  onClick={requestPortalLink}
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {loading ? "Sending…" : "Email me a secure link"}
                </Button>

                <p className="text-[11px] text-white/40 mt-3 text-center">
                  Links expire after ~15 minutes for security. If it expires, just request a new one.
                </p>
              </>
            ) : (
              <p className="text-sm text-white/80 text-center">
                If that email is in our system, you’ll receive a link shortly.
              </p>
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
