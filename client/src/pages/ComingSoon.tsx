import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

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
    <div className="relative min-h-screen overflow-x-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_12%,rgba(255,196,128,0.16),transparent_16%),radial-gradient(circle_at_72%_28%,rgba(255,134,74,0.12),transparent_22%),radial-gradient(circle_at_58%_54%,rgba(255,92,92,0.07),transparent_20%),linear-gradient(180deg,#020202_0%,#070707_44%,#030303_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.72)_0.55px,transparent_0.7px)] [background-size:6px_6px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-gradient-to-b from-[#1a120b]/20 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />

      <main className="relative z-10">
        <header className="border-b border-white/8">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 md:px-8 lg:px-10">
            <Link
              href="/"
              className="text-xl font-semibold uppercase tracking-[0.24em] text-white sm:text-2xl"
            >
              KIMORA
            </Link>

            <div className="hidden items-center gap-3 sm:flex">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-[#d9b161] backdrop-blur-sm">
                Creatine · Electrolytes · Daily
              </span>
            </div>
          </div>
        </header>

        <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8 md:px-8 lg:px-10 lg:pb-24 lg:pt-10">
          <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,560px)_1fr] lg:gap-12">
            <div className="relative z-10 max-w-[600px]">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#d9b161]">
                Coming soon
              </p>

              <h1 className="mt-5 text-5xl font-semibold leading-[0.92] tracking-tight text-white sm:text-6xl lg:text-7xl">
                OUT-TRAIN.
                <br />
                OUT-SMART.
                <br />
                OUT-LAST.
              </h1>

              <div className="mt-8 h-px w-40 bg-gradient-to-r from-[#d7ad57] via-[#f1d18a] to-transparent" />

              <p className="mt-8 max-w-[520px] text-lg leading-8 text-white/78 sm:text-xl">
                Creatine + electrolytes built for fighters.
              </p>

              <p className="mt-5 max-w-[560px] text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
                Single-serve daily performance support with no scooping, no mess,
                and no friction between intention and consistency.
              </p>

              <div className="mt-8 flex flex-wrap gap-2.5">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-white/82">
                  5 g Creatine Monohydrate
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-white/82">
                  Electrolytes Included
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-white/82">
                  Monk Fruit Sweetened
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-white/82">
                  Nothing Artificial
                </span>
              </div>

              <div className="mt-10 rounded-[30px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.4)] backdrop-blur-sm sm:p-6">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                        First drop
                      </p>
                      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                        Get early access
                      </h2>
                    </div>

                    <p className="max-w-[240px] text-sm leading-6 text-zinc-400 sm:text-right">
                      Join the list before launch and hear about the first batch
                      first.
                    </p>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-black/35 px-3 py-4 text-center">
                      <div className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                        {countdown.days}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                        Days
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/35 px-3 py-4 text-center">
                      <div className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                        {countdown.hours}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                        Hours
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/35 px-3 py-4 text-center">
                      <div className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                        {countdown.minutes}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                        Minutes
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#d7ad57]/30 bg-[#d7ad57]/10 px-3 py-4 text-center shadow-[0_0_28px_rgba(215,173,87,0.08)]">
                      <div className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                        {countdown.seconds}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-[#d7ad57]">
                        Seconds
                      </div>
                    </div>
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
                      className="h-14 flex-1 rounded-2xl border border-white/10 bg-black/40 px-5 text-sm text-white placeholder:text-zinc-500 focus:border-[#d7ad57]/40 focus:outline-none disabled:opacity-60"
                    />

                    <button
                      type="submit"
                      disabled={submitting}
                      className="h-14 rounded-2xl bg-[#b51212] px-7 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-[0_10px_24px_rgba(130,0,0,0.28)] transition-all duration-300 hover:bg-[#c81616] disabled:opacity-60"
                    >
                      {submitting ? "Submitting..." : "Get First Access"}
                    </button>
                  </form>

                  {submitted ? (
                    <p className="text-sm font-medium text-emerald-400">
                      You’re on the list. We’ll let you know first.
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      Limited first batch. No spam. Unsubscribe anytime.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative flex min-h-[440px] items-center justify-center overflow-visible lg:min-h-[720px]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_58%_18%,rgba(255,220,170,0.18),transparent_14%),radial-gradient(circle_at_55%_34%,rgba(255,148,82,0.14),transparent_22%),radial-gradient(circle_at_70%_68%,rgba(255,95,95,0.08),transparent_18%)]" />
                <div className="pointer-events-none absolute left-[20%] top-[12%] h-[17rem] w-[17rem] rounded-full bg-[#d7ad57]/12 blur-3xl" />
                <div className="pointer-events-none absolute right-[10%] top-[26%] h-[14rem] w-[14rem] rounded-full bg-[#c94d2d]/12 blur-3xl" />
                <div className="pointer-events-none absolute bottom-[10%] left-[35%] h-[12rem] w-[12rem] rounded-full bg-[#7d1d1d]/10 blur-3xl" />
                <div className="pointer-events-none absolute bottom-[14%] left-1/2 h-[90px] w-[68%] -translate-x-1/2 rounded-full bg-[rgba(255,130,58,0.10)] blur-[65px]" />
                <div className="pointer-events-none absolute bottom-[11%] left-1/2 h-[44px] w-[58%] -translate-x-1/2 rounded-full bg-black/55 blur-[32px]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_60%_28%,rgba(255,183,117,0.09),transparent_32%)]" />

                <img
                  src="/assets/products/full_lineup.png"
                  alt="Kimora creatine and electrolytes product lineup"
                  className="relative z-10 h-auto w-full max-w-[760px] object-contain brightness-[1.04] contrast-[1.06] saturate-[1.03] drop-shadow-[0_42px_90px_rgba(0,0,0,0.58)] transition duration-700 hover:scale-[1.01] [mask-image:radial-gradient(circle_at_center,black_72%,transparent_100%)]"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/8 bg-[#050505]">
          <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 lg:px-10 lg:py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-medium uppercase tracking-[0.26em] text-[#d7ad57]">
                Why Kimora exists
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Consistency wins.
              </h2>

              <p className="mt-6 leading-8 text-zinc-400">
                You do not get stronger from one lift. You do not get better
                from one roll. And you do not get results from taking creatine
                only when you remember.
              </p>

              <p className="mt-4 leading-8 text-zinc-300">
                Kimora was built to remove the friction so daily use becomes the
                default.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-white/8 bg-black">
          <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 lg:px-10 lg:py-20">
            <div className="mb-10 max-w-3xl">
              <p className="text-sm font-medium uppercase tracking-[0.26em] text-[#d7ad57]">
                Flavor lineup
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Three flavors. One system.
              </h2>

              <p className="mt-5 leading-7 text-zinc-400">
                Designed to feel premium, clean, and actually enjoyable to take
                every day.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <article className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] transition-colors duration-300 hover:border-white/15">
                <div className="relative aspect-[3/4] bg-[radial-gradient(circle_at_50%_16%,rgba(255,149,86,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-6">
                  <img
                    src="/assets/products/strawberry-guava/pouch.webp"
                    alt="Strawberry Guava"
                    className="h-full w-full object-contain drop-shadow-2xl"
                  />
                </div>
                <div className="border-t border-white/8 p-6 text-center">
                  <h3 className="text-2xl font-semibold text-white">
                    Strawberry Guava
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-400">
                    Tropical, richer, and fruit-forward with a fuller flavor
                    profile.
                  </p>
                </div>
              </article>

              <article className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] transition-colors duration-300 hover:border-white/15">
                <div className="relative aspect-[3/4] bg-[radial-gradient(circle_at_50%_16%,rgba(255,213,88,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-6">
                  <img
                    src="/assets/products/lemon-yuzu/pouch.webp"
                    alt="Lemon Yuzu"
                    className="h-full w-full object-contain drop-shadow-2xl"
                  />
                </div>
                <div className="border-t border-white/8 p-6 text-center">
                  <h3 className="text-2xl font-semibold text-white">
                    Lemon Yuzu
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-400">
                    Bright citrus with a cleaner, sharper finish.
                  </p>
                </div>
              </article>

              <article className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] transition-colors duration-300 hover:border-white/15">
                <div className="relative aspect-[3/4] bg-[radial-gradient(circle_at_50%_16%,rgba(255,86,149,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-6">
                  <img
                    src="/assets/products/raspberry-dragonfruit/pouch.webp"
                    alt="Raspberry Dragonfruit"
                    className="h-full w-full object-contain drop-shadow-2xl"
                  />
                </div>
                <div className="border-t border-white/8 p-6 text-center">
                  <h3 className="text-2xl font-semibold text-white">
                    Raspberry Dragonfruit
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-400">
                    Smooth, balanced, and built to be the daily driver.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-20 border-t border-white/8 bg-black">
        <div className="mx-auto w-full max-w-7xl px-6 py-14 md:px-8 lg:px-10">
          <div className="flex flex-col items-center gap-5 text-center">
            <p className="text-2xl font-semibold uppercase tracking-[0.25em] text-white">
              KIMORA
            </p>

            <p className="text-xs uppercase tracking-[0.35em] text-white/30">
              OUT-TRAIN. OUT-SMART. OUT-LAST.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-white/60">
              <a
                href="mailto:support@kimoraco.com"
                className="transition hover:text-white"
              >
                support@kimoraco.com
              </a>

              <a
                href="https://instagram.com/kimoracreatine"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-white"
              >
                @kimoracreatine
              </a>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-4 text-xs uppercase tracking-[0.18em] text-white/40">
            <Link href="/terms" className="transition hover:text-white">
              Terms
            </Link>

            <Link href="/privacy" className="transition hover:text-white">
              Privacy
            </Link>

            <Link href="/refunds" className="transition hover:text-white">
              Refunds
            </Link>

            <Link
              href="/wholesale/apply"
              className="transition hover:text-white"
            >
              Wholesale Apply
            </Link>
          </div>

          <div className="mt-10 border-t border-white/6 pt-6 text-center">
            <p className="text-xs text-white/30">
              © 2026 Kimora Co. All rights reserved.
            </p>

            <p className="mx-auto mt-4 max-w-2xl text-[10px] leading-relaxed text-white/20">
              These statements have not been evaluated by the Food and Drug
              Administration. This product is not intended to diagnose, treat,
              cure, or prevent any disease. Always consult your healthcare
              provider before starting any new supplement.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}