import { useState } from "react";
import { Band, SectionHead, type Tone } from "./Band";

type State = "idle" | "loading" | "success" | "error";

export function EmailCapture({ tone = "sand" }: { tone?: Tone }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "loading") return;

    const trimmed = email.trim();
    if (!trimmed) return;

    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMsg(data.message || "Something went wrong. Please try again.");
        setState("error");
        return;
      }

      setState("success");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  }

  return (
    <Band tone={tone} id="email-capture" className="scroll-mt-[92px]">
      <div className="mx-auto max-w-2xl text-center">
        <SectionHead
          tone={tone}
          align="center"
          eyebrow="Limited launch offer"
          title="15% off your first order"
          lead="Drop your email and we'll send you a discount code to use at checkout. No spam — just the code."
        />

        {state === "success" ? (
          <div className="bg-card border border-primary/40 rounded-xl px-8 py-10">
            <div
              className="text-primary-strong text-5xl font-display font-bold tracking-widest mb-3"
              style={{ fontFamily: "ui-monospace, monospace" }}
            >
              MAT15
            </div>
            <p className="text-foreground text-lg font-medium mb-1">Check your inbox.</p>
            <p className="text-muted-foreground text-sm">
              We sent your code to <span className="text-foreground">{email}</span>. Apply it at
              checkout for 15% off.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={state === "loading"}
              className="h-[52px] sm:h-14 w-full sm:flex-1 bg-card border border-foreground/10 text-foreground placeholder:text-muted-foreground rounded-lg px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={state === "loading"}
              className="h-[52px] sm:h-14 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base px-7 rounded-lg transition disabled:opacity-60 whitespace-nowrap"
            >
              {state === "loading" ? "Sending…" : "Get 15% Off"}
            </button>
          </form>
        )}

        {state === "error" && (
          <p className="mt-4 text-sm text-red-400">{errorMsg}</p>
        )}
      </div>
    </Band>
  );
}
