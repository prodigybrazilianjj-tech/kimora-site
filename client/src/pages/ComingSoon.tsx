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
    <div className="relative min-h-screen overflow-hidden bg-[#040404] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_18%,rgba(255,255,255,0.06),transparent_22%),radial-gradient(circle_at_76%_16%,rgba(249,115,22,0.16),transparent_24%),radial-gradient(circle_at_88%_74%,rgba(234,179,8,0.12),transparent_20%),radial-gradient(circle_at_68%_56%,rgba(244,63,94,0.08),transparent_24%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_14%,transparent_84%,rgba(255,255,255,0.015))]" />
      <div className="pointer-events-none absolute -left-24 top-12 h-[22rem] w-[22rem] rounded-full bg-orange-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[-8rem] top-20 h-[26rem] w-[26rem] rounded-full bg-red-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-6rem] right-[6%] h-[18rem] w-[18rem] rounded-full bg-yellow-400/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-10 md:px-8 lg:px-10">
        <div className="grid w-full items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <section className="relative max-w-[560px]">
            <img
              src="/assets/products/transparentlogo.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -left-8 top-14 hidden w-[440px] max-w-none opacity-[0.04] brightness-200 contrast-125 lg:block"
            />

            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-zinc-300 backdrop-blur">
              First drop coming soon
            </div>

            <div className="relative mt-7">
              <img
                src="/assets/products/transparentlogo.png"
                alt="Kimora Co."
                className="h-14 w-auto brightness-[2.4] contrast-125 invert sm:h-16"
              />
            </div>

            <h1 className="mt-8 text-5xl font-black uppercase leading-[0.9] tracking-[-0.05em] text-white sm:text-6xl lg:text-[5.35rem]">
              OUT-TRAIN.
              <br />
              OUT-SMART.
              <br />
              OUT-LAST.
            </h1>

            <p className="mt-6 max-w-[540px] text-lg leading-8 text-zinc-200 sm:text-[1.35rem]">
              Creatine + electrolytes for performance, hydration, and recovery
              — built for fighters and everyday high performers.
            </p>

            <div className="mt-7 flex flex-wrap gap-2.5">
              <span className="rounded-full border border-orange-400/20 bg-orange-500/[0.08] px-3 py-1.5 text-xs text-orange-100">
                5g creatine per serving
              </span>
              <span className="rounded-full border border-pink-400/20 bg-pink-500/[0.08] px-3 py-1.5 text-xs text-pink-100">
                Electrolytes for hydration
              </span>
              <span className="rounded-full border border-yellow-300/20 bg-yellow-400/[0.10] px-3 py-1.5 text-xs text-yellow-100">
                Built for combat athletes
              </span>
            </div>

            <div className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_10px_50px_rgba(0,0,0,0.26)] backdrop-blur sm:p-6">
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

                  <p className="max-w-[220px] text-sm leading-6 text-zinc-400 sm:text-right">
                    Waitlist members get first access before the public drop.
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-4 text-center">
                    <div className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                      {countdown.days}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                      Days
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-4 text-center">
                    <div className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                      {countdown.hours}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                      Hours
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-4 text-center">
                    <div className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                      {countdown.minutes}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                      Minutes
                    </div>
                  </div>

                  <div className="rounded-2xl border border-orange-400/25 bg-orange-500/[0.12] px-3 py-4 text-center shadow-[0_0_28px_rgba(249,115,22,0.12)]">
                    <div className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                      {countdown.seconds}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-orange-100/80">
                      Seconds
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-white">
                    Limited first drop. Early access only.
                  </p>
                  <p className="max-w-[520px] text-sm leading-6 text-zinc-400">
                    Join the list for launch updates and first notice when the
                    initial drop goes live.
                  </p>
                  <p className="text-sm text-zinc-400">
                    Join <span className="font-semibold text-white">137</span>{" "}
                    others already on the waitlist.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300">
                    Strawberry Guava
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300">
                    Raspberry Dragonfruit
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300">
                    Lemon Yuzu
                  </span>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-3 pt-1 sm:flex-row"
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
                    className="h-14 rounded-2xl bg-white px-7 text-sm font-semibold text-black transition duration-200 hover:translate-y-[-1px] hover:bg-zinc-100 disabled:opacity-60"
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
                    No spam. Early access only. Unsubscribe anytime.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="relative min-h-[640px]">
            <div className="pointer-events-none absolute inset-0 rounded-[42px] bg-[radial-gradient(circle_at_58%_34%,rgba(249,115,22,0.14),transparent_24%),radial-gradient(circle_at_72%_72%,rgba(234,179,8,0.12),transparent_20%),radial-gradient(circle_at_84%_28%,rgba(244,63,94,0.10),transparent_18%)]" />

            <div className="relative h-full min-h-[640px]">
              <div className="pointer-events-none absolute left-[16%] top-[10%] h-[28rem] w-[28rem] rounded-full bg-orange-500/10 blur-3xl" />
              <div className="pointer-events-none absolute right-[8%] top-[24%] h-[18rem] w-[18rem] rounded-full bg-pink-500/10 blur-3xl" />
              <div className="pointer-events-none absolute bottom-[8%] right-[12%] h-[16rem] w-[16rem] rounded-full bg-yellow-400/10 blur-3xl" />

              <div className="absolute left-[6%] top-[2%] hidden xl:block">
                <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-zinc-300 backdrop-blur">
                  3 signature flavors
                </div>
              </div>

              <div className="absolute left-[8%] top-[12%] z-20 w-[62%]">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                      Featured flavor
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                      Strawberry Guava
                    </p>
                  </div>

                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-zinc-300 backdrop-blur">
                    30 sticks
                  </div>
                </div>

                <div className="relative">
                  <img
                    src="/assets/products/strawberry-guava/pouchandstick.png"
                    alt="Kimora Co Strawberry Guava"
                    className="relative z-10 h-auto w-full object-contain drop-shadow-[0_32px_55px_rgba(0,0,0,0.42)] transition duration-500 hover:scale-[1.015]"
                  />
                </div>
              </div>

              <div className="absolute right-[4%] top-[12%] z-10 w-[32%] rounded-[26px] border border-white/8 bg-white/[0.03] p-4 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                  Signature flavor
                </p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-white">
                  Raspberry Dragonfruit
                </p>

                <img
                  src="/assets/products/raspberry-dragonfruit/pouchandstick.png"
                  alt="Kimora Co Raspberry Dragonfruit"
                  className="mt-4 h-auto w-full object-contain drop-shadow-[0_18px_32px_rgba(0,0,0,0.34)] transition duration-500 hover:scale-[1.02]"
                />
              </div>

              <div className="absolute right-[8%] bottom-[8%] z-10 w-[30%] rounded-[26px] border border-white/8 bg-white/[0.03] p-4 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                  Signature flavor
                </p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-white">
                  Lemon Yuzu
                </p>

                <img
                  src="/assets/products/lemon-yuzu/pouchandstick.png"
                  alt="Kimora Co Lemon Yuzu"
                  className="mt-4 h-auto w-full object-contain drop-shadow-[0_18px_32px_rgba(0,0,0,0.34)] transition duration-500 hover:scale-[1.02]"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}