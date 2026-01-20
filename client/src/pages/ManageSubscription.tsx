import { useEffect, useState } from "react";
import { PortalLinkRequest } from "@/components/sections/PortalLinkRequest";

export default function ManageSubscription() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    // No token? Just show the request form. (This is the “permanent entry point” behavior.)
    if (!token) return;

    setLoading(true);

    fetch("/api/customer-portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.url) {
          throw new Error(data?.message || "Invalid or expired link.");
        }
        window.location.href = data.url;
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "Invalid or expired link.");
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h2 className="text-2xl font-semibold">Manage Subscription</h2>
        <p className="text-white/70">
          Enter the email you used at checkout and we’ll send a secure link.
        </p>

        {loading && !error ? (
          <div className="text-white/70">Redirecting to Stripe…</div>
        ) : (
          <>
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <PortalLinkRequest />
          </>
        )}
      </div>
    </div>
  );
}
