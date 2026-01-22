import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";

type Status = "redirecting" | "request" | "sent" | "error";

export default function ManageSubscription() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("redirecting");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const token = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("token");
  }, []);

  // If token exists, exchange it for Stripe portal URL
  useEffect(() => {
    if (!token) {
      setStatus("request");
      return;
    }

    (async () => {
      try {
        setStatus("redirecting");
        setMessage("");

        const res = await fetch(
          `/api/customer-portal?token=${encodeURIComponent(token)}`,
        );

        const data = await res.json();
        if (!res.ok || !data.url) {
          throw new Error(data?.message || "Invalid or expired link.");
        }

        window.location.href = data.url;
      } catch (err: any) {
        console.error(err);
        setStatus("request");
        setMessage(
          err?.message ||
            "That secure link is invalid or expired. Request a new one below.",
        );
      }
    })();
  }, [token]);

  async function requestNewLink() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setStatus("error");
      setMessage("Please enter the email used at checkout.");
      return;
    }

    setLoading(true);
    setMessage("");
    setStatus("request");

    try {
      const res = await fetch("/api/customer-portal/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await res.json();

      // Always returns ok:true (anti-enumeration)
      setStatus("sent");
      setMessage(
        data?.message ||
          "If that email is in our system, you’ll receive a link shortly.",
      );
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage("Failed to request link. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      {/* Main content */}
      <main className="flex-grow pt-28 md:pt-32 pb-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-md mx-auto">
            <div className="bg-card/50 border border-white/10 rounded-2xl p-6 text-center">
              {status === "redirecting" ? (
                <>
                  <h2 className="text-2xl font-display font-bold text-white">
                    Redirecting…
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2">
                    Taking you to your subscription portal.
                  </p>
                  <p className="text-xs text-white/40 mt-4">
                    If this takes more than a few seconds, your link may be expired.
                  </p>

                  <div className="mt-6 flex items-center justify-center gap-4 text-xs">
                    <Link
                      href="/shop"
                      className="text-muted-foreground hover:text-white transition-colors uppercase tracking-wide"
                    >
                      Shop
                    </Link>
                    <span className="text-white/20">•</span>
                    <a
                      href="mailto:alex@kimoraco.com"
                      className="text-muted-foreground hover:text-white transition-colors uppercase tracking-wide"
                    >
                      Support
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-display font-bold text-white">
                    Manage Subscription
                  </h2>

                  {message ? (
                    <p
                      className={`text-sm mt-3 ${
                        status === "error"
                          ? "text-red-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {message}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-3">
                      Enter the email used at checkout and we’ll send a secure link.
                    </p>
                  )}

                  <div className="mt-5 space-y-3">
                    <input
                      type="email"
                      placeholder="Email used at checkout"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") requestNewLink();
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                    />

                    <Button
                      onClick={requestNewLink}
                      disabled={loading}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider"
                    >
                      {loading ? "Sending…" : "Email me a secure link"}
                    </Button>

                    <p className="text-xs text-white/40">
                      Secure links expire in 15 minutes. If it expires, just
                      request another.
                    </p>

                    {status === "sent" && (
                      <p className="text-xs text-white/40">
                        Tip: check Spam or Promotions if you don’t see it right
                        away.
                      </p>
                    )}
                  </div>

                  {/* Escape hatches */}
                  <div className="mt-6 flex items-center justify-center gap-4 text-xs">
                    <Link
                      href="/shop"
                      className="text-muted-foreground hover:text-white transition-colors uppercase tracking-wide"
                    >
                      Back to Shop
                    </Link>
                    <span className="text-white/20">•</span>
                    <Link
                      href="/"
                      className="text-muted-foreground hover:text-white transition-colors uppercase tracking-wide"
                    >
                      Home
                    </Link>
                    <span className="text-white/20">•</span>
                    <a
                      href="mailto:alex@kimoraco.com"
                      className="text-muted-foreground hover:text-white transition-colors uppercase tracking-wide"
                    >
                      Support
                    </a>
                  </div>
                </>
              )}
            </div>

            {/* Trust / reassurance */}
            <div className="mt-6 text-center text-xs text-white/30">
              This secure link is unique to your email and expires automatically.
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
