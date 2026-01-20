import { useState } from "react";

export default function ManageSubscription() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

      if (!res.ok) throw new Error("Failed to send link.");
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Page title */}
        <h1 className="text-2xl font-semibold mb-2">
          Manage subscription
        </h1>

        <p className="text-sm text-muted-foreground mb-6">
          Enter the email you used at checkout and we’ll send you a secure link.
        </p>

        <div className="rounded-lg border border-white/10 bg-black/40 p-6">
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

          {error && (
            <p className="mt-3 text-sm text-red-500">{error}</p>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            Links expire after ~15 minutes for security. If it expires, just
            request a new one.
          </p>
        </div>
      </div>
    </div>
  );
}
