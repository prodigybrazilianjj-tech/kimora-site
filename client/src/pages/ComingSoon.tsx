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
    <div className="min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_40%,rgba(255,255,255,0.05),transparent_28%),radial-gradient(circle_at_78%_42%,rgba(249,115,22,0.10),transparent_24%),radial-gradient(circle_at_82%_76%,rgba(234,179,8,0.08),transparent_18%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-6 py-10 md:px-8 lg:px-10">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1.02fr_1fr] lg:gap-14">
          <div>
            <div className="max-w-xl">
              <div className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-zinc-400">
                First drop coming soon
              </div>

              <h1 className="mt-5 text-5xl font-bold tracking-tight md:text-6xl">
                KIMORA CO.
              </h1>

              <p className="mt-4 text-lg text-zinc-300 md:text-xl">
                Creatine + Electrolytes for Performance
              </p>

              <div className="mt-6 h-px w-full bg-zinc-800" />

              <div className="mt-7">
                <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  Launching Soon
                </h2>

                <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                    Drop goes live in
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xl font-semibold md:text-2xl">
                    <span className="rounded-lg border border-zinc-800 bg-black/40 px-3 py-2">
                      {countdown.days}d
                    </span>
                    <span className="text-zinc-600">:</span>
                    <span className="rounded-lg border border-zinc-800 bg-black/40 px-3 py-2">
                      {countdown.hours}h
                    </span>
                    <span className="text-zinc-600">:</span>
                    <span className="rounded-lg border border-zinc-800 bg-black/40 px-3 py-2">
                      {countdown.minutes}m
                    </span>
                    <span className="text-zinc-600">:</span>
                    <span className="rounded-lg border border-zinc-800 bg-black/40 px-3 py-2">
                      {countdown.seconds}s
                    </span>
                  </div>
                </div>

                <p className="mt-5 max-w-lg text-sm leading-7 text-zinc-400 md:text-base">
                  Dialed for performance — flavor, hydration, and recovery.
                  Join the list to get first access when the initial drop goes live.
                </p>

                <div className="mt-4 space-y-2 text-sm text-zinc-300">
                  <div>• 5g creatine per serving</div>
                  <div>• Electrolytes for hydration &amp; endurance</div>
                  <div>• Built for combat athletes</div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1 text-xs text-zinc-300">
                    Strawberry Guava
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1 text-xs text-zinc-300">
                    Raspberry Dragonfruit
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1 text-xs text-zinc-300">
                    Lemon Yuzu
                  </span>
                </div>

                <div className="mt-5 space-y-2">
                  <p className="text-sm font-semibold text-zinc-100">
                    Limited first drop. Early access only.
                  </p>
                  <p className="text-sm text-zinc-400">
                    Early access subscribers get priority ordering.
                  </p>
                  <p className="text-sm text-zinc-400">
                    Join 137 others on the waitlist.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className="mt-8 flex flex-col gap-3 sm:flex-row"
              >
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  className="h-13 flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-white placeholder:text-zinc-500 focus:border-white focus:outline-none disabled:opacity-60"
                />

                <button
                  type="submit"
                  disabled={submitting}
                  className="h-13 rounded-xl bg-white px-7 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Get Early Access"}
                </button>
              </form>

              {submitted && (
                <p className="mt-4 text-sm font-medium text-green-400">
                  You’re on the list. We’ll let you know first.
                </p>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-500">
                <span>Built for fighters.</span>
                <span className="hidden h-1 w-1 rounded-full bg-zinc-700 sm:block" />
                <span>Designed for everyday performance.</span>
                <span className="hidden h-1 w-1 rounded-full bg-zinc-700 sm:block" />
                <span>3 signature flavors.</span>
              </div>
            </div>
          </div>

          <div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="group relative overflow-hidden rounded-[28px] border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] sm:col-span-2">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_45%)]" />
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[65%] w-[55%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-400/10 blur-3xl" />
                <img
                  src="/assets/products/strawberry-guava/pouchandstick.png"
                  alt="Kimora Co Strawberry Guava"
                  className="relative h-auto w-full rounded-2xl object-contain transition duration-300 group-hover:scale-[1.015]"
                />
              </div>

              <div className="group relative overflow-hidden rounded-[24px] border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_45%)]" />
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[55%] w-[50%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-400/10 blur-3xl" />
                <img
                  src="/assets/products/raspberry-dragonfruit/pouchandstick.png"
                  alt="Kimora Co Raspberry Dragonfruit"
                  className="relative h-auto w-full rounded-xl object-contain transition duration-300 group-hover:scale-[1.02]"
                />
              </div>

              <div className="group relative overflow-hidden rounded-[24px] border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_45%)]" />
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[55%] w-[50%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-300/10 blur-3xl" />
                <img
                  src="/assets/products/lemon-yuzu/pouchandstick.png"
                  alt="Kimora Co Lemon Yuzu"
                  className="relative h-auto w-full rounded-xl object-contain transition duration-300 group-hover:scale-[1.02]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}