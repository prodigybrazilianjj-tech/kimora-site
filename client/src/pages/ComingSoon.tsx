

import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Footer } from "@/components/sections/Footer";

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
    <>
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#020202_0%,#060606_42%,#030303_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />

      <main className="relative z-10">
        {/* Simplified header — no nav links on pre-launch page */}
        <header className="border-b border-border">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 md:px-8 lg:px-10">
            <Link
              href="/"
              className="text-3xl font-display font-bold tracking-wider text-white hover:text-primary transition-colors"
            >
              KIMORA
            </Link>

            <div className="hidden items-center gap-3 sm:flex">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-primary backdrop-blur-sm">
                Creatine · Electrolytes · Daily
              </span>
            </div>
          </div>
        </header>

        <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8 md:px-8 lg:px-10 lg:pb-24 lg:pt-10">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,500px)_minmax(0,1fr)] lg:gap-6">
            <div className="relative z-10 max-w-[600px]">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-primary">
                Coming soon
              </p>

              <h1 className="mt-5 text-5xl font-display font-bold leading-[0.92] tracking-tight text-white sm:text-6xl lg:text-7xl">
                OUT-TRAIN.
                <br />
                OUT-SMART.
                <br />
                OUT-LAST.
              </h1>

              <div className="mt-8 h-px w-40 bg-gradient-to-r from-primary via-primary/40 to-transparent" />

              <p className="mt-8 max-w-[520px] text-lg leading-8 text-white/80 sm:text-xl">
                Creatine + electrolytes built for fighters.
              </p>

              <p className="mt-5 max-w-[560px] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Single-serve daily performance support with no scooping, no mess,
                and no friction between intention and consistency.
              </p>

              <div className="mt-8 flex flex-wrap gap-2.5">
                <span className="rounded-full border border-border bg-white/[0.04] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-foreground/80">
                  5g Creatine Monohydrate
                </span>
                <span className="rounded-full border border-border bg-white/[0.04] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-foreground/80">
                  Electrolytes Included
                </span>
                <span className="rounded-full border border-border bg-white/[0.04] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-foreground/80">
                  Naturally Sweetened
                </span>
                <span className="rounded-full border border-border bg-white/[0.04] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-foreground/80">
                  Nothing Artificial
                </span>
              </div>

              <div className="mt-10 rounded-[30px] border border-border bg-white/[0.035] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.4)] backdrop-blur-sm sm:p-6">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                        First drop
                      </p>
                      <h2 className="mt-2 text-3xl font-display font-bold tracking-tight text-white">
                        Get early access
                      </h2>
                    </div>

                    <p className="max-w-[240px] text-sm leading-6 text-muted-foreground sm:text-right">
                      Join the list before launch and hear about the first batch
                      first.
                    </p>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="rounded-2xl border border-border bg-black/35 px-3 py-4 text-center">
                      <div className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                        {countdown.days}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        Days
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-black/35 px-3 py-4 text-center">
                      <div className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                        {countdown.hours}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        Hours
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-black/35 px-3 py-4 text-center">
                      <div className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                        {countdown.minutes}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        Minutes
                      </div>
                    </div>

                    <div className="rounded-2xl border border-primary/30 bg-primary/10 px-3 py-4 text-center shadow-[0_0_28px_rgba(0,191,165,0.08)]">
                      <div className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                        {countdown.seconds}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-primary">
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
                      className="h-14 flex-1 rounded-2xl border border-border bg-black/40 px-5 text-sm text-white placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none disabled:opacity-60"
                    />

                    <button
                      type="submit"
                      disabled={submitting}
                      className="h-14 rounded-2xl bg-primary px-7 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-[0_10px_24px_rgba(0,191,165,0.25)] transition-all duration-300 hover:bg-primary/90 disabled:opacity-60"
                    >
                      {submitting ? "Submitting..." : "Get First Access"}
                    </button>
                  </form>

                  {submitted ? (
                    <p className="text-sm font-medium text-emerald-400">
                      You're on the list. We'll let you know first.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Limited first batch. No spam. Unsubscribe anytime.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Solid black column — covers the dot texture for the entire image area */}
            <div className="relative bg-black lg:-mr-10 xl:-mr-16">
              <div className="relative flex min-h-[520px] items-center justify-center lg:min-h-[780px]">
                <div className="pointer-events-none absolute left-1/2 top-[8%] h-[180px] w-[180px] -translate-x-1/2 rounded-full bg-primary/10 blur-[110px]" />
                <div className="pointer-events-none absolute left-1/2 top-[18%] h-[260px] w-[260px] -translate-x-1/2 rounded-full bg-primary/5 blur-[140px]" />
                <div className="pointer-events-none absolute bottom-[16%] left-1/2 h-[70px] w-[44%] -translate-x-1/2 rounded-full bg-black/80 blur-[28px]" />

                {/* Image wrapper — fades position against this */}
                <div className="relative z-10 w-full max-w-[1120px] xl:max-w-[1240px]">
                  <img
                    src="/assets/products/full_lineup.png"
                    alt="Kimora creatine and electrolytes product lineup"
                    className="h-auto w-full object-contain brightness-[1.03] contrast-[1.04] saturate-[1.02] drop-shadow-[0_42px_90px_rgba(0,0,0,0.55)]"
                  />

                  {/* Edge fades — dissolve image into pure black on all sides */}
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-black to-transparent z-20" />
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-black to-transparent z-20" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black to-transparent z-20" />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black to-transparent z-20" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-card">
          <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 lg:px-10 lg:py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-medium uppercase tracking-[0.26em] text-primary">
                Why Kimora exists
              </p>

              <h2 className="mt-4 text-3xl font-display font-bold tracking-wide text-white sm:text-4xl">
                Consistency wins.
              </h2>

              <p className="mt-6 leading-8 text-muted-foreground">
                You do not get stronger from one lift. You do not get better
                from one roll. And you do not get results from taking creatine
                only when you remember.
              </p>

              <p className="mt-4 leading-8 text-white/80">
                Kimora was built to remove the friction so daily use becomes the
                default.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-background">
          <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 lg:px-10 lg:py-20">
            <div className="mb-10 max-w-3xl">
              <p className="text-sm font-medium uppercase tracking-[0.26em] text-primary">
                Flavor lineup
              </p>

              <h2 className="mt-4 text-3xl font-display font-bold tracking-wide text-white sm:text-4xl">
                Three flavors. One system.
              </h2>

              <p className="mt-5 leading-7 text-muted-foreground">
                Designed to feel premium, clean, and actually enjoyable to take
                every day.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <article className="overflow-hidden rounded-[24px] border border-border bg-card transition-colors duration-300 hover:border-white/15">
                <div className="relative aspect-[3/4] bg-[radial-gradient(circle_at_50%_16%,rgba(255,149,86,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-6">
                  <img
                    src="/assets/products/strawberry-guava/pouch.webp"
                    alt="Strawberry Guava"
                    className="h-full w-full object-contain drop-shadow-2xl"
                  />
                </div>
                <div className="border-t border-border p-6 text-center">
                  <h3 className="text-2xl font-display font-bold text-white">
                    Strawberry Guava
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Tropical, richer, and fruit-forward with a fuller flavor
                    profile.
                  </p>
                </div>
              </article>

              <article className="overflow-hidden rounded-[24px] border border-border bg-card transition-colors duration-300 hover:border-white/15">
                <div className="relative aspect-[3/4] bg-[radial-gradient(circle_at_50%_16%,rgba(255,213,88,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-6">
                  <img
                    src="/assets/products/lemon-yuzu/pouch.webp"
                    alt="Lemon Yuzu"
                    className="h-full w-full object-contain drop-shadow-2xl"
                  />
                </div>
                <div className="border-t border-border p-6 text-center">
                  <h3 className="text-2xl font-display font-bold text-white">
                    Lemon Yuzu
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Bright citrus with a cleaner, sharper finish.
                  </p>
                </div>
              </article>

              <article className="overflow-hidden rounded-[24px] border border-border bg-card transition-colors duration-300 hover:border-white/15">
                <div className="relative aspect-[3/4] bg-[radial-gradient(circle_at_50%_16%,rgba(255,86,149,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-6">
                  <img
                    src="/assets/products/raspberry-dragonfruit/pouch.webp"
                    alt="Raspberry Dragonfruit"
                    className="h-full w-full object-contain drop-shadow-2xl"
                  />
                </div>
                <div className="border-t border-border p-6 text-center">
                  <h3 className="text-2xl font-display font-bold text-white">
                    Raspberry Dragonfruit
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Smooth, balanced, and built to be the daily driver.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>
      </main>
    </div>

    <Footer />
    </>
  );
}

