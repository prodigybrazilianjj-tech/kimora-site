import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export default function ManageSubscription() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"redirecting" | "request" | "sent" | "error">(
    "redirecting",
  );
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
        const res = await fetch("/api/customer-portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (!res.ok || !data.url) {
          throw new Error(data?.message || "Invalid or expired link.");
        }

        window.location.href = data.url;
      } catch (err: any) {
        console.error(err);
        setStatus("request");
        setMessage(err?.message || "Link invalid or expired. Request a new one below.");
      }
    })();
  }, [token]);

  async function requestNewLink() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessage("Please enter the email used at checkout.");
      setStatus("error");
      return;
    }

    setLoading(true);
    setMessage("");

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
    <div style={{ padding: "4rem", textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
      {status === "redirecting" ? (
        <>
          <h2>Redirecting…</h2>
          <p>Taking you to your subscription management page.</p>
        </>
      ) : (
        <>
          <h2>Manage Subscription</h2>

          {message ? (
            <p style={{ marginTop: 12, opacity: 0.9 }}>{message}</p>
          ) : (
            <p style={{ marginTop: 12, opacity: 0.8 }}>
              Enter the email used at checkout and we’ll send a secure link.
            </p>
          )}

          <div style={{ marginTop: 18 }}>
            <input
              type="email"
              placeholder="Email used at checkout"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(0,0,0,0.35)",
                color: "white",
                marginBottom: 12,
              }}
            />

            <Button onClick={requestNewLink} disabled={loading} className="w-full">
              {loading ? "Sending…" : "Email me a secure link"}
            </Button>

            <p style={{ marginTop: 14, fontSize: 12, opacity: 0.7 }}>
              Link expires in 15 minutes. If it expires, just request another.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
