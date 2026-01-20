import { useEffect, useState } from "react";

export default function ManageSubscription() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setError("Invalid or missing link.");
      return;
    }

    fetch(`/api/customer-portal?token=${encodeURIComponent(token)}`)
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
        setError(err.message || "Something went wrong.");
      });
  }, []);

  return (
    <div style={{ padding: "4rem", textAlign: "center" }}>
      {!error ? (
        <>
          <h2>Redirecting…</h2>
          <p>Taking you to your subscription management page.</p>
        </>
      ) : (
        <>
          <h2>Link error</h2>
          <p>{error}</p>
        </>
      )}
    </div>
  );
}
