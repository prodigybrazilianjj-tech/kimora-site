import { useEffect, useMemo, useState } from "react";

type CountdownUnit = {
  label: string;
  value: string;
};

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

    const units: CountdownUnit[] = [
      { label: "Days", value: pad(days) },
      { label: "Hours", value: pad(hours) },
      { label: "Minutes", value: pad(minutes) },
      { label: "Seconds", value: pad(seconds) },
    ];

    return units;
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
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_26%),radial-gradient(circle_at_78%_22%,rgba(249,115,22,0.16),transparent_20%),radial-gradient(circle_at_88%_72%,rgba(234,179,8,0.10),transparent_18%),linear-gradient(to_bottom,rgba(255,255,255,0.015),transparent_20%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/[0.03] to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-[14%] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-white/[0.02] blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-5 py-10 sm:px-8 lg:px-10">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1.04fr)_minmax(460px,0.96fr)] lg:gap-14">
          <section className="max-w-2xl">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-zinc-300 backdrop-blur">
              First drop coming soon
            </div>

            <div className="mt-7">
              <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">
                Kimora Co.
              </p>

              <h1 className="mt-4 max-w-xl text-5xl font-black uppercase leading-[0.94] tracking-[-0.04em] text-white sm:text-6xl lg:text-[5.3rem]">
                Stronger.
                <br />
                Sharper.
                <br />
                Ready.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-300 sm:text-[1.35rem]">
                Creatine + electrolytes built for fighters, lifters, and
                high-performers who want daily performance support without the
                extra junk.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                  Strength
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  5g creatine monohydrate per serving.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                  Hydration
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  Electrolytes to support training and recovery.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                  Formula
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  No sugar. No fluff. Daily-use simplicity.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur sm:p-6">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                      Countdown
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">
                      Launching soon
                    </h2>
                  </div>

                  <p className="max-w-xs text-sm leading-6 text-zinc-400 sm:text-right">
                    Waitlist members get first access before the public drop
                    opens.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {countdown.map((unit, index) => (
                    <div
                      key={unit.label}
                      className={`rounded-2xl border p-4 ${
                        index === 3
                          ? "border-orange-400/25 bg-orange-500/[0.08] shadow-[0_0_30px_rgba(249,115,22,0.08)]"
                          : "border-white/10 bg-black/30"
                      }`}
                    >
                      <div className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                        {unit.value}
                      </div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                        {unit.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
                  <div>
                    <p className="text-sm font-medium text-white">
                      Limited first drop.
                    </p>
                    <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-400">
                      Join the list for early access, launch updates, and first
                      notice when ordering opens.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300">
                        Strawberry Guava
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300">
                        Raspberry Dragonfruit
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300">
                        Lemon Yuzu
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-zinc-300">
                    <span className="font-semibold text-white">137</span> already
                    on the waitlist
                  </div>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-3 sm:flex-row"
                >
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    className="h-14 flex-1 rounded-2xl border border-white/10 bg-black/40 px-5 text-sm text-white placeholder:text-zinc-500 focus:border-white/40 focus:outline-none disabled:opacity-60"
                  />

                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-14 rounded-2xl bg-white px-7 text-sm font-semibold text-black shadow-[0_0_30px_rgba(255,255,255,0.08)] transition duration-200 hover:translate-y-[-1px] hover:bg-zinc-100 disabled:opacity-60"
                  >
                    {submitting ? "Submitting..." : "Get Early Access"}
                  </button>
                </form>

                {submitted ? (
                  <p className="text-sm font-medium text-emerald-400">
                    You’re on the list. We’ll let you know first.
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500">
                    Early access only. No spam. Unsubscribe anytime.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="relative">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.12),transparent_34%)]" />

            <div className="grid gap-4 sm:grid-cols-[1.18fr_0.82fr] sm:grid-rows-[auto_auto]">
              <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-white/[0.02] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)] sm:row-span-2 sm:p-6">
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_36%,transparent_64%,rgba(255,255,255,0.03))]" />
                <div className="pointer-events-none absolute left-1/2 top-[42%] h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-400/15 blur-3xl" />

                <div className="relative">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                        Featured flavor
                      </p>
                      <p className="mt-2 text-xl font-semibold tracking-tight text-white">
                        Strawberry Guava
                      </p>
                    </div>

                    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-zinc-300">
                      30 sticks
                    </div>
                  </div>

                  <img
                    src="/assets/products/strawberry-guava/pouchandstick.png"
                    alt="Kimora Co Strawberry Guava"
                    className="mx-auto h-auto w-full max-w-[34rem] object-contain drop-shadow-[0_28px_50px_rgba(0,0,0,0.45)] transition duration-500 hover:scale-[1.015]"
                  />
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-4 shadow-[0_16px_60px_rgba(0,0,0,0.28)]">
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-400/10 blur-3xl" />
                <p className="relative text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                  Signature flavor
                </p>
                <img
                  src="/assets/products/raspberry-dragonfruit/pouchandstick.png"
                  alt="Kimora Co Raspberry Dragonfruit"
                  className="relative mt-3 h-auto w-full object-contain drop-shadow-[0_18px_35px_rgba(0,0,0,0.4)] transition duration-500 hover:scale-[1.02]"
                />
              </div>

              <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-4 shadow-[0_16px_60px_rgba(0,0,0,0.28)]">
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-300/10 blur-3xl" />
                <p className="relative text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                  Signature flavor
                </p>
                <img
                  src="/assets/products/lemon-yuzu/pouchandstick.png"
                  alt="Kimora Co Lemon Yuzu"
                  className="relative mt-3 h-auto w-full object-contain drop-shadow-[0_18px_35px_rgba(0,0,0,0.4)] transition duration-500 hover:scale-[1.02]"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}