import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

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
          err?.message || "Link invalid or expired. Request a new one below.",
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

      // Always returns ok:true for anti-enumeration
      setStatus("sent");
      setMessage(
        data?.message ||
          "If that email is in our system, you’ll receive a link shortly.",
      );
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err?.message || "Failed to request link. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card/50 border border-white/10 rounded-2xl p-6 text-center">
        {status === "redirecting" ? (
          <>
            <h2 className="text-2xl font-display font-bold text-white">
              Redirecting…
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Taking you to your subscription management page.
            </p>
            <p className="text-xs text-white/40 mt-4">
              If this takes more than a few seconds, your link may be expired.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-display font-bold text-white">
              Manage Subscription
            </h2>

            {message ? (
              <p
                className={`text-sm mt-3 ${
                  status === "error" ? "text-red-400" : "text-muted-foreground"
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
                className="w-full"
              >
                {loading ? "Sending…" : "Email me a secure link"}
              </Button>

              <p className="text-xs text-white/40">
                Link expires in 15 minutes. If it expires, just request another.
              </p>

              {status === "sent" && (
                <p className="text-xs text-white/40">
                  Tip: check spam/promotions if you don’t see it.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
