import { useEffect, useMemo, useState } from "react";

export default function ComingSoon() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const launchAt = useMemo(() => {
    const configured =
      (typeof import.meta !== "undefined" &&
        (import.meta as any)?.env?.VITE_LAUNCH_AT) ||
      "";
    const parsed = configured ? new Date(configured) : null;

    if (parsed && !Number.isNaN(parsed.getTime())) return parsed;

    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 14);
    fallback.setHours(9, 0, 0, 0);
    return fallback;
  }, []);

  const [timeLeftMs, setTimeLeftMs] = useState(
    Math.max(0, launchAt.getTime() - Date.now())
  );

  useEffect(() => {
    const tick = () => {
      setTimeLeftMs(Math.max(0, launchAt.getTime() - Date.now()));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [launchAt]);

  const countdown = useMemo(() => {
    const totalSeconds = Math.floor(timeLeftMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => String(n).padStart(2, "0");

    return {
      days: pad(days),
      hours: pad(hours),
      minutes: pad(minutes),
      seconds: pad(seconds),
    };
  }, [timeLeftMs]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setSubmitting(true);

      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Something went wrong");
      }

      setSubmitted(true);
      setEmail("");
    } catch (err: any) {
      console.error("Waitlist submit failed:", err);
      alert(err?.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#040404] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(255,255,255,0.06),transparent_28%),radial-gradient(circle_at_82%_28%,rgba(249,115,22,0.12),transparent_26%),radial-gradient(circle_at_86%_78%,rgba(234,179,8,0.08),transparent_20%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/[0.02] to-transparent" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-6 py-10 md:px-8 lg:px-10">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[0.96fr_1.04fr] lg:gap-16">

          {/* LEFT SIDE */}
          <div>
            <div className="max-w-[560px]">

              {/* LOGO (NEW) */}
              <div className="mb-8 flex justify-start">
                <img
                  src="/assets/transparentlogo.png"
                  alt="Kimora Co Logo"
                  className="w-[220px] sm:w-[260px] md:w-[300px] object-contain opacity-95"
                />
              </div>

              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-zinc-300">
                First drop coming soon
              </div>

              <h1 className="mt-6 text-5xl font-black uppercase leading-[0.92] tracking-[-0.04em] text-white sm:text-6xl lg:text-[5.4rem]">
                Grow
                <br />
                stronger.
                <br />
                Think
                <br />
                sharper.
              </h1>

              <p className="mt-6 max-w-[520px] text-lg leading-8 text-zinc-300 md:text-[1.35rem]">
                Creatine + electrolytes for performance, hydration, and
                recovery — built for fighters and everyday high performers.
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300">
                  5g creatine per serving
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300">
                  Electrolytes for hydration
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300">
                  Built for combat athletes
                </span>
              </div>

              <div className="mt-8 h-px w-full bg-white/10" />

              {/* WAITLIST CARD */}
              <div className="mt-8 rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.045] to-white/[0.015] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.015)] backdrop-blur sm:p-6">
                <div className="flex flex-col gap-5">

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                        Launch countdown
                      </p>
                      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                        Launching soon
                      </h2>
                    </div>

                    <p className="max-w-[240px] text-sm leading-6 text-zinc-400 sm:text-right">
                      Waitlist members get first access before the public drop.
                    </p>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {["days", "hours", "minutes", "seconds"].map((key) => (
                      <div key={key} className="rounded-2xl border border-white/10 bg-black/30 px-3 py-4 text-center">
                        <div className="text-3xl font-bold md:text-4xl">
                          {countdown[key as keyof typeof countdown]}
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                          {key}
                        </div>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={handleSubmit}
                    className="pt-1 flex flex-col gap-3 sm:flex-row"
                  >
                    <input
                      type="email"
                      required
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={submitting}
                      className="h-14 flex-1 rounded-2xl border border-white/10 bg-black/40 px-5 text-sm text-white placeholder:text-zinc-500 focus:border-white/30 focus:outline-none disabled:opacity-60"
                    />

                    <button
                      type="submit"
                      disabled={submitting}
                      className="h-14 rounded-2xl bg-white px-7 text-sm font-semibold text-black hover:bg-zinc-100 disabled:opacity-60"
                    >
                      {submitting ? "Submitting..." : "Get Early Access"}
                    </button>
                  </form>

                  {submitted ? (
                    <p className="text-sm font-medium text-emerald-400">
                      You’re on the list.
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      No spam. Early access only.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE (UNCHANGED PRODUCTS) */}
          <div>
            <img
              src="/assets/products/strawberry-guava/pouchandstick.png"
              alt="Product"
              className="w-full object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}