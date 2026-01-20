import { useEffect, useMemo, useState } from "react";

export default function ManageSubscription() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token");
  }, []);

  // If we have a token, try to exchange it for a Stripe portal URL and redirect.
  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        setRedirecting(true);
        setError(null);

        const res = await fetch("/api/customer-portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.url) {
          throw new Error(data?.message || "Invalid or expired link.");
        }

        window.location.href = data.url;
      } catch (e: any) {
        // Remove token from URL so refresh doesn't keep re-triggering the error
        window.history.replaceState({}, "", "/manage-subscription");

        setRedirecting(false);
        setError(e?.message || "Invalid or expired link.");
      }
    })();
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/customer-portal/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to send link.");
      }

      setSent(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-2">Manage subscription</h1>

        <p className="text-sm text-muted-foreground mb-6">
          Enter the email you used at checkout and we’ll send you a secure link.
        </p>

        <div className="rounded-lg border border-white/10 bg-black/40 p-6">
          {redirecting ? (
            <div className="text-sm text-muted-foreground">
              Redirecting you to Stripe…
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              {!sent ? (
                <form onSubmit={submit} className="flex gap-3">
                  <input
                    type="email"
                    required
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 rounded-md bg-black border border-white/10 px-3 py-2 text-sm"
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-md bg-white text-black px-4 text-sm font-medium"
                  >
                    {loading ? "Sending…" : "Email link"}
                  </button>
                </form>
              ) : (
                <p className="text-sm">
                  If that email is in our system, you’ll receive a link shortly.
                </p>
              )}

              <p className="mt-4 text-xs text-muted-foreground">
                Links expire after ~15 minutes for security. If it expires, just request a new one.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
