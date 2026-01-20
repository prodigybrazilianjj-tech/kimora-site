import { useEffect, useState } from "react";
import { PortalLinkRequest } from "@/components/sections/PortalLinkRequest";

export default function ManageSubscription() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setError("Invalid or missing link.");
      setLoading(false);
      return;
    }

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

        // Redirect to Stripe Billing Portal
        window.location.href = data.url;
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "Invalid or expired link.");
        setLoading(false);
      });
  }, []);

  if (loading && !error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-xl font-semibold">Redirecting…</h2>
        <p className="text-white/70">
          Taking you to your subscription management page.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h2 className="text-xl font-semibold">Link error</h2>
        <p className="text-white/70">{error}</p>

        <PortalLinkRequest compact />
      </div>
    </div>
  );
}
