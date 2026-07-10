import { useState } from "react";

type State = "idle" | "loading" | "success" | "error";

export function EmailCapture() {
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
    <section
      id="email-capture"
      className="py-24 bg-background border-t border-foreground/5 scroll-mt-[92px]"
    >
      <div className="container px-4 mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium uppercase tracking-[0.26em] text-primary mb-5">
          Limited launch offer
        </p>

        <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4 leading-[0.95]">
          15% OFF YOUR FIRST ORDER
        </h2>

        <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
          Drop your email and we'll send you a discount code to use at checkout.
          No spam — just the code.
        </p>

        {state === "success" ? (
          <div className="bg-card border border-primary/40 rounded-2xl px-8 py-10">
            <div
              className="text-primary text-5xl font-display font-bold tracking-widest mb-3"
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
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-xl mx-auto">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={state === "loading"}
              className="h-14 w-full flex-1 bg-card border border-foreground/10 text-foreground placeholder:text-muted-foreground rounded-xl px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={state === "loading"}
              className="h-14 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base px-7 rounded-xl transition disabled:opacity-60 whitespace-nowrap"
            >
              {state === "loading" ? "Sending…" : "Get 15% Off"}
            </button>
          </form>
        )}

        {state === "error" && (
          <p className="mt-4 text-sm text-red-400">{errorMsg}</p>
        )}
      </div>
    </section>
  );
}
