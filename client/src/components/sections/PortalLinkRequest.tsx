import { useState } from "react";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function PortalLinkRequest({
  defaultEmail = "",
  compact = false,
}: {
  defaultEmail?: string;
  compact?: boolean;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string>("");

  async function submit() {
    const trimmed = email.trim().toLowerCase();

    if (!trimmed || !isValidEmail(trimmed)) {
      setStatus("error");
      setError("Please enter a valid email address.");
      return;
    }

    setStatus("sending");
    setError("");

    try {
      const res = await fetch("/api/customer-portal/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to send link. Please try again.");
      }

      setStatus("sent");
    } catch (e: any) {
      setStatus("error");
      setError(e?.message || "Failed to send link. Please try again.");
    }
  }

  return (
    <div
      className={
        compact
          ? "flex flex-col gap-2"
          : "rounded-xl border border-white/10 bg-white/5 p-5"
      }
    >
      {!compact && (
        <div className="mb-3">
          <div className="text-lg font-semibold">Manage your subscription</div>
          <div className="text-sm text-white/70">
            Enter the email you used at checkout. We’ll send a secure link.
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-white/30"
          autoComplete="email"
        />
        <button
          onClick={submit}
          disabled={status === "sending"}
          className="rounded-lg bg-white text-black px-4 py-2 font-medium disabled:opacity-60"
        >
          {status === "sending" ? "Sending..." : "Email me a link"}
        </button>
      </div>

      {status === "sent" && (
        <div className="text-sm text-emerald-300">
          If that email is in our system, you’ll receive a link shortly.
        </div>
      )}

      {status === "error" && (
        <div className="text-sm text-red-300">{error}</div>
      )}

      <div className="text-xs text-white/50">
        Links expire in ~15 minutes for security. If it expires, just request a new one.
      </div>
    </div>
  );
}
