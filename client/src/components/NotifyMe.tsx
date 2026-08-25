import { useState } from "react";
import { BotGuardFields, useFormGuard } from "@/lib/formGuard";

type State = "idle" | "loading" | "success" | "error";

/**
 * Pre-launch "notify me at launch" capture.
 * Posts to the existing /api/waitlist endpoint. Designed mobile-first:
 * full-width, comfortably tall input (no thin/cramped field on phones).
 */
export function NotifyMe({
  buttonLabel = "Notify Me",
  placeholder = "Enter your email",
  successMessage = "You're on the list — we'll email you the moment we launch, plus 15% off your first order.",
}: {
  buttonLabel?: string;
  placeholder?: string;
  successMessage?: string;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const guard = useFormGuard();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "loading") return;

    const trimmed = email.trim();
    if (!trimmed) return;

    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, ...guard.payload }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        setErrorMsg(data?.message || "Something went wrong. Please try again.");
        setState("error");
        return;
      }

      setState("success");
      setEmail("");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <p className="text-sm font-medium text-primary-strong leading-relaxed">
        {successMessage}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex flex-col gap-3 sm:flex-row">
      <BotGuardFields guard={guard} />
      <input
        type="email"
        required
        placeholder={placeholder}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={state === "loading"}
        className="h-14 w-full sm:flex-1 rounded-xl border border-foreground/10 bg-card px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={state === "loading"}
        className="h-14 shrink-0 rounded-xl bg-primary px-7 text-sm font-bold uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      >
        {state === "loading" ? "Submitting…" : buttonLabel}
      </button>
    </form>
  );
}
