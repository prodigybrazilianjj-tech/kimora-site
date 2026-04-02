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
    <div className="relative min-h-screen overflow-x-hidden bg-[#040404] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-[#040404] to-[#040404]" />
      <div className="pointer-events-none absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_14%,rgba(249,115,22,0.12),transparent_22%),radial-gradient(circle_at_82%_72%,rgba(234,179,8,0.10),transparent_18%),radial-gradient(circle_at_72%_42%,rgba(244,63,94,0.06),transparent_20%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_14%,transparent_88%,rgba(255,255,255,0.015))]" />

      <header className="relative z-20 border-b border-white/6">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 md:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <img
              src="/assets/products/transparentlogo.png"
              alt="Kimora Co."
              className="h-9 w-auto invert brightness-[2.2] contrast-125 sm:h-10"
            />
            <div className="flex flex-col leading-none">
              <span className="text-sm font-semibold uppercase tracking-[0.22em] text-white sm:text-base">
                KIMORA CO.
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Grow Stronger. Think Sharper.
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-primary backdrop-blur-sm">
              Creatine · Electrolytes · Daily
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8 md:px-8 lg:px-10">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,660px)_1fr] lg:gap-16">
            <div className="relative max-w-[660px]">
              <img
                src="/assets/products/transparentlogo.png"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -left-10 top-10 hidden w-[520px] max-w-none opacity-[0.04] invert brightness-[2.3] contrast-125 lg:block"
              />

              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-1.5 backdrop-blur-sm sm:hidden">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
                  Creatine · Electrolytes · Daily
                </span>
              </div>

              <h1 className="mt-6 text-7xl font-bold leading-[0.9] tracking-tighter text-white sm:text-8xl lg:text-9xl">
                KIMORA
              </h1>

              <p className="mt-5 text-xl font-light uppercase tracking-widest text-white/80 sm:text-3xl">
                Creatine — Finally Done Right.
              </p>

              <p className="mt-5 text-sm font-medium uppercase tracking-widest text-muted-foreground">
                Built for BJJ · MMA · Muay Thai · Lifters
              </p>

              <p className="mt-8 max-w-[580px] text-base leading-7 text-zinc-300 sm:text-lg sm:leading-8">
                Most people know they should take creatine. Almost nobody does
                it consistently.
              </p>

              <p className="mt-4 max-w-[580px] text-base leading-7 text-zinc-300 sm:text-lg sm:leading-8">
                Kimora fixes that.
              </p>

              <p className="mt-4 max-w-[580px] text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
                Single-serve creatine + electrolytes — no scooping, no mixing,
                no mess. Just tear, pour, and go.
              </p>

              <div className="mt-7 flex flex-wrap gap-2.5">
                <span className="rounded-full border border-orange-400/20 bg-orange-500/[0.08] px-3 py-1.5 text-xs text-orange-100">
                  5 g Creatine Monohydrate
                </span>
                <span className="rounded-full border border-pink-400/20 bg-pink-500/[0.08] px-3 py-1.5 text-xs text-pink-100">
                  Electrolytes Included
                </span>
                <span className="rounded-full border border-yellow-300/20 bg-yellow-400/[0.10] px-3 py-1.5 text-xs text-yellow-100">
                  No Sugar / No Alcohols
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300">
                  Nothing Artificial
                </span>
              </div>

              <div className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_10px_50px_rgba(0,0,0,0.26)] backdrop-blur sm:p-6">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                        Launch countdown
                      </p>
                      <h3 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                        First Drop Coming Soon
                      </h3>
                    </div>

                    <p className="max-w-[240px] text-sm leading-6 text-zinc-400 sm:text-right">
                      Get early access before the first batch sells out.
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

                    <div className="rounded-2xl border border-primary/25 bg-primary/[0.12] px-3 py-4 text-center shadow-[0_0_28px_rgba(0,191,165,0.12)]">
                      <div className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                        {countdown.seconds}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-primary/80">
                        Seconds
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-white">
                      Built for people who actually train.
                    </p>
                    <p className="max-w-[520px] text-sm leading-6 text-zinc-400">
                      If you’ve ever skipped creatine because it’s inconvenient
                      — this is for you.
                    </p>
                    <p className="text-sm text-zinc-400">
                      Be part of the first drop.
                    </p>
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
                      className="h-14 flex-1 rounded-2xl border border-white/10 bg-black/40 px-5 text-sm text-white placeholder:text-zinc-500 focus:border-primary/40 focus:outline-none disabled:opacity-60"
                    />

                    <button
                      type="submit"
                      disabled={submitting}
                      className="h-14 rounded-2xl bg-primary px-7 text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(0,191,165,0.3)] transition-all duration-300 hover:bg-primary/90 hover:shadow-[0_0_30px_rgba(0,191,165,0.5)] disabled:opacity-60"
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
                      First batch will be limited. No spam. Unsubscribe anytime.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="sticky top-24 min-h-[680px]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_62%_34%,rgba(0,191,165,0.16),transparent_24%),radial-gradient(circle_at_78%_72%,rgba(234,179,8,0.10),transparent_20%),radial-gradient(circle_at_86%_24%,rgba(244,63,94,0.08),transparent_18%)]" />
                <div className="pointer-events-none absolute left-[20%] top-[14%] h-[24rem] w-[24rem] rounded-full bg-primary/10 blur-3xl" />
                <div className="pointer-events-none absolute right-[14%] top-[30%] h-[16rem] w-[16rem] rounded-full bg-pink-500/10 blur-3xl" />
                <div className="pointer-events-none absolute bottom-[12%] left-[36%] h-[14rem] w-[14rem] rounded-full bg-yellow-400/10 blur-3xl" />

                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src="/assets/products/strawberry-guava/pouch.webp"
                    alt="Kimora Co Strawberry Guava"
                    className="h-auto w-full max-w-[34rem] object-contain drop-shadow-[0_40px_70px_rgba(0,0,0,0.42)] transition duration-500 hover:scale-[1.015]"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-6 md:px-8 lg:px-10">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Why Kimora Exists
            </h2>

            <p className="mt-6 leading-7 text-zinc-400">
              In jiu-jitsu, nothing works if you’re inconsistent.
            </p>

            <p className="mt-4 leading-7 text-zinc-400">
              You don’t get stronger from one lift. You don’t get better from
              one roll. And you don’t get results from taking creatine “when you
              remember.”
            </p>

            <p className="mt-4 leading-7 text-zinc-300">
              Kimora was built to remove that friction — so you actually follow
              through.
            </p>
          </div>
        </section>

        <section className="bg-secondary/20 py-12 md:py-16">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-6 md:grid-cols-3 md:px-8 lg:px-10">
            <div className="rounded-2xl border border-white/5 bg-card p-8 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="mb-4 text-3xl font-bold text-white">Cognition</h3>
              <p className="leading-relaxed text-muted-foreground">
                Stay sharp under pressure — in training and competition.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-card p-8 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="mb-4 text-3xl font-bold text-white">Recovery</h3>
              <p className="leading-relaxed text-muted-foreground">
                Hydrate faster and bounce back quicker between sessions.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-card p-8 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="text-2xl">💪</span>
              </div>
              <h3 className="mb-4 text-3xl font-bold text-white">Strength</h3>
              <p className="leading-relaxed text-muted-foreground">
                Train harder, lift heavier, and push longer.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-6 md:px-8 lg:px-10">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Built for Performance
            </h2>

            <p className="mt-6 leading-7 text-zinc-400">
              Every stick delivers 5 g of creatine monohydrate with a balanced
              electrolyte blend.
            </p>

            <p className="mt-4 leading-7 text-zinc-400">
              No sugar. No artificial fillers. No unnecessary ingredients.
            </p>

            <p className="mt-4 leading-7 text-zinc-300">
              Just what works — in a form you’ll actually use daily.
            </p>
          </div>
        </section>

        <section className="bg-card/30 py-20">
          <div className="mx-auto max-w-5xl px-6 md:px-8 lg:px-10">
            <div className="mb-16 text-center">
              <h2 className="mb-6 text-4xl font-bold text-white md:text-5xl">
                What’s Inside Each Stick
              </h2>
              <p className="mx-auto max-w-2xl leading-relaxed text-muted-foreground">
                Every stick delivers 5 g of creatine monohydrate with a balanced
                electrolyte blend — designed for performance, hydration, and
                daily consistency.
              </p>
            </div>

            <div className="relative grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-24">
              <div className="space-y-6">
                <h3 className="mb-8 text-xl font-bold uppercase tracking-wider text-primary">
                  Performance & Hydration
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-baseline justify-between border-b border-white/5 pb-2">
                    <span className="font-medium text-white">
                      5 g Creatine Monohydrate
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Strength & Power
                    </span>
                  </li>
                  <li className="flex items-baseline justify-between border-b border-white/5 pb-2">
                    <span className="font-medium text-white">~500 mg Sodium</span>
                    <span className="text-sm text-muted-foreground">
                      Hydration & Performance
                    </span>
                  </li>
                  <li className="flex items-baseline justify-between border-b border-white/5 pb-2">
                    <span className="font-medium text-white">250 mg Potassium</span>
                    <span className="text-sm text-muted-foreground">
                      Muscle Function
                    </span>
                  </li>
                  <li className="flex items-baseline justify-between border-b border-white/5 pb-2">
                    <span className="font-medium text-white">60 mg Magnesium</span>
                    <span className="text-sm text-muted-foreground">
                      Recovery Support
                    </span>
                  </li>
                </ul>
              </div>

              <div className="absolute bottom-0 left-1/2 top-0 hidden w-px -translate-x-1/2 bg-white/10 md:block" />

              <div className="space-y-6">
                <h3 className="mb-8 text-xl font-bold uppercase tracking-wider text-primary">
                  Clean, Daily Formula
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-baseline justify-between border-b border-white/5 pb-2">
                    <span className="font-medium text-white">Monk Fruit Only</span>
                    <span className="text-sm text-muted-foreground">
                      No Sugar / Alcohols
                    </span>
                  </li>
                  <li className="flex items-baseline justify-between border-b border-white/5 pb-2">
                    <span className="font-medium text-white">Acid Flavor System</span>
                    <span className="text-sm text-muted-foreground">
                      Citric · Malic · Ascorbic
                    </span>
                  </li>
                  <li className="flex items-baseline justify-between border-b border-white/5 pb-2">
                    <span className="font-medium text-white">Natural Flavors</span>
                    <span className="text-sm text-muted-foreground">
                      Nothing Artificial
                    </span>
                  </li>
                  <li className="flex items-baseline justify-between border-b border-white/5 pb-2">
                    <span className="font-medium text-white">
                      Rice Hull Flow Agent
                    </span>
                    <span className="text-sm text-muted-foreground">
                      No Silicon Dioxide
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-16 flex flex-col items-center gap-2 text-center text-sm uppercase tracking-widest text-muted-foreground">
              <p>No artificial colors, sweeteners, or fillers.</p>
              <p>Mix 1 stick into 12–20 oz of water and drink once daily.</p>
            </div>
          </div>
        </section>

        <section className="relative mx-auto w-full max-w-7xl px-6 py-10 md:px-8 lg:px-10 lg:py-16">
          <div className="mb-8 text-center md:mb-10">
            <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">
              Daily Fuel. Zero Excuses.
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Three flavors designed to make taking creatine something you
              actually look forward to.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <article className="overflow-hidden rounded-xl border border-white/5 bg-card/50 transition-colors duration-300 hover:border-white/10">
              <div className="relative aspect-[3/4] bg-gradient-to-t from-orange-600/20 to-transparent p-6">
                <img
                  src="/assets/products/strawberry-guava/pouch.webp"
                  alt="Strawberry Guava"
                  className="h-full w-full object-contain drop-shadow-2xl"
                />
              </div>
              <div className="border-t border-white/5 bg-card/80 p-6 text-center backdrop-blur-sm">
                <h3 className="mb-2 text-2xl font-bold text-white">
                  Strawberry Guava
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Tart, tropical, and refreshingly smooth.
                </p>
              </div>
            </article>

            <article className="overflow-hidden rounded-xl border border-white/5 bg-card/50 transition-colors duration-300 hover:border-white/10">
              <div className="relative aspect-[3/4] bg-gradient-to-t from-yellow-500/20 to-transparent p-6">
                <img
                  src="/assets/products/lemon-yuzu/pouch.webp"
                  alt="Lemon Yuzu"
                  className="h-full w-full object-contain drop-shadow-2xl"
                />
              </div>
              <div className="border-t border-white/5 bg-card/80 p-6 text-center backdrop-blur-sm">
                <h3 className="mb-2 text-2xl font-bold text-white">
                  Lemon Yuzu
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Bright citrus with a crisp, clean finish.
                </p>
              </div>
            </article>

            <article className="overflow-hidden rounded-xl border border-white/5 bg-card/50 transition-colors duration-300 hover:border-white/10">
              <div className="relative aspect-[3/4] bg-gradient-to-t from-rose-600/25 to-transparent p-6">
                <img
                  src="/assets/products/raspberry-dragonfruit/pouch.webp"
                  alt="Raspberry Dragonfruit"
                  className="h-full w-full object-contain drop-shadow-2xl"
                />
              </div>
              <div className="border-t border-white/5 bg-card/80 p-6 text-center backdrop-blur-sm">
                <h3 className="mb-2 text-2xl font-bold text-white">
                  Raspberry Dragonfruit
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Bold, juicy, and perfectly balanced.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className="border-y border-white/5 bg-secondary/10 py-24">
          <div className="mx-auto max-w-3xl px-6 text-center md:px-8 lg:px-10">
            <h2 className="mb-8 text-4xl font-bold text-white md:text-5xl">
              ABOUT KIMORA
            </h2>
            <div className="space-y-6 text-lg leading-relaxed text-muted-foreground">
              <p>Kimora is built on one idea: consistency wins.</p>
              <p>
                In jiu-jitsu, strength, endurance, and clarity aren’t built in a
                day — they’re built daily.
              </p>
              <p>
                This isn’t just another supplement. It’s a system designed to
                make sure you actually follow through.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-20 border-t border-white/6 bg-black">
        <div className="mx-auto w-full max-w-7xl px-6 py-14 md:px-8 lg:px-10">
          <div className="flex flex-col items-center gap-6 text-center">
            <p className="text-2xl font-semibold uppercase tracking-[0.25em] text-white">
              KIMORA CO.
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

            <Link href="/wholesale/apply" className="transition hover:text-white">
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