
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Footer } from "@/components/sections/Footer";
import { motion, AnimatePresence } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

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

  const flavors = [
    {
      name: "Strawberry Guava",
      img: "/assets/products/strawberry-guava/pouch_sticks_v1.webp",
      glow: "rgba(255,149,86,0.18)",
      desc: "Tropical, richer, and fruit-forward with a fuller flavor profile.",
    },
    {
      name: "Lemon Lychee",
      img: "/assets/products/lemon-yuzu/pouch_sticks_v3.webp",
      glow: "rgba(255,213,88,0.18)",
      desc: "Bright lemon with a sweet, floral lychee finish.",
    },
    {
      name: "Raspberry Dragonfruit",
      img: "/assets/products/raspberry-dragonfruit/pouch_sticks_v2.webp",
      glow: "rgba(255,86,149,0.18)",
      desc: "Smooth, balanced, and built to be the daily driver.",
    },
  ];

  return (
    <>
      <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#0f0b06_0%,#161009_42%,#0c0905_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0c0905] to-transparent" />

        <main className="relative z-10">
          {/* ── Header ── */}
          <motion.header
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="border-b border-border"
          >
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 md:px-8 lg:px-10">
              <Link
                href="/"
                className="font-wordmark text-3xl font-bold tracking-[0.14em] text-white transition-colors hover:text-foreground"
              >
                KIM<span className="text-accent">O</span>RA
              </Link>

              <div className="hidden items-center gap-3 sm:flex">
                <motion.span
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.55, ease: EASE, delay: 0.25 }}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-primary backdrop-blur-sm"
                >
                  Creatine · Electrolytes · Daily
                </motion.span>
              </div>
            </div>
          </motion.header>

          {/* ── Hero ── */}
          <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8 md:px-8 lg:px-10 lg:pb-24 lg:pt-10">
            <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,500px)_minmax(0,1fr)] lg:gap-6">

              {/* Left: copy + CTA card */}
              <div className="relative z-10 max-w-[600px]">
                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
                  className="text-sm font-medium uppercase tracking-[0.28em] text-primary"
                >
                  Coming soon
                </motion.p>

                <h1 className="mt-5 text-5xl font-display font-bold leading-[0.95] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                  {["TRAIN WITH", "PURPOSE."].map((line, i) => (
                    <motion.span
                      key={line}
                      className="block"
                      initial={{ opacity: 0, y: 36 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.65, ease: EASE, delay: 0.22 + i * 0.13 }}
                    >
                      {line}
                    </motion.span>
                  ))}
                </h1>

                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.75, ease: EASE, delay: 0.62 }}
                  style={{ transformOrigin: "left" }}
                  className="mt-8 h-px w-40 bg-gradient-to-r from-primary via-primary/40 to-transparent"
                />

                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.68 }}
                  className="mt-8 max-w-[520px] text-lg leading-8 text-white/80 sm:text-xl"
                >
                  Creatine + electrolytes built for fighters.
                </motion.p>

                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.78 }}
                  className="mt-5 max-w-[560px] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8"
                >
                  Single-serve daily performance support with no scooping, no mess,
                  and no friction between intention and consistency.
                </motion.p>

                <div className="mt-8 flex flex-wrap gap-2.5">
                  {[
                    "5g Creatine Monohydrate",
                    "Electrolytes Included",
                    "Naturally Sweetened",
                    "Nothing Artificial",
                  ].map((badge, i) => (
                    <motion.span
                      key={badge}
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, ease: EASE, delay: 0.85 + i * 0.07 }}
                      className="rounded-full border border-border bg-white/[0.04] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-foreground/80"
                    >
                      {badge}
                    </motion.span>
                  ))}
                </div>

                {/* CTA card */}
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.75, ease: EASE, delay: 1.08 }}
                  className="mt-10 rounded-[30px] border border-border bg-white/[0.035] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.4)] backdrop-blur-sm sm:p-6"
                >
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                          Pre-Launch Exclusive
                        </p>
                        <h2 className="mt-2 text-3xl font-display font-bold tracking-tight text-white">
                          Get 15% off — and first access.
                        </h2>
                      </div>

                      <p className="max-w-[240px] text-sm leading-6 text-muted-foreground sm:text-right">
                        Join the waitlist before we launch. You get 15% off your first order and a 24-hour head start before the public.
                      </p>
                    </div>

                    {/* Countdown */}
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { value: countdown.days, label: "Days" },
                        { value: countdown.hours, label: "Hours" },
                        { value: countdown.minutes, label: "Minutes" },
                      ].map(({ value, label }) => (
                        <div
                          key={label}
                          className="rounded-2xl border border-border bg-black/35 px-3 py-4 text-center"
                        >
                          <div className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                            {value}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                            {label}
                          </div>
                        </div>
                      ))}

                      {/* Seconds — subtle pulse on each tick */}
                      <div className="rounded-2xl border border-primary/30 bg-primary/10 px-3 py-4 text-center shadow-[0_0_28px_rgba(168,72,31,0.14)]">
                        <motion.div
                          key={countdown.seconds}
                          initial={{ opacity: 0.4, scale: 0.78 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className="text-3xl font-bold tracking-tight text-white md:text-4xl"
                        >
                          {countdown.seconds}
                        </motion.div>
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
                        className="h-16 flex-1 rounded-2xl border border-border bg-black/40 px-5 text-base text-white placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none disabled:opacity-60 transition-colors duration-200"
                      />

                      <motion.button
                        type="submit"
                        disabled={submitting}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="h-16 rounded-2xl bg-primary px-7 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-[0_10px_24px_rgba(168,72,31,0.30)] transition-all duration-300 hover:bg-primary/90 disabled:opacity-60"
                      >
                        {submitting ? "Submitting..." : "Join the Waitlist"}
                      </motion.button>
                    </form>

                    <AnimatePresence mode="wait">
                      {submitted ? (
                        <motion.p
                          key="success"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.35 }}
                          className="text-sm font-medium text-emerald-400"
                        >
                          You're on the list. Your code is{" "}
                          <span className="font-bold">MAT15</span> — 15% off your
                          first order, plus early access at launch.
                        </motion.p>
                      ) : (
                        <motion.p
                          key="fine-print"
                          initial={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-xs text-muted-foreground"
                        >
                          15% off first order · One use per customer · No spam
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>

              {/* Right: hero product (floating cut-out lineup) */}
              <div className="relative">
                <div className="relative flex min-h-[400px] items-center justify-center lg:min-h-[600px]">
                  {/* warm ambient glow */}
                  <motion.div
                    animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.08, 1] }}
                    transition={{ duration: 7, ease: "easeInOut", repeat: Infinity }}
                    className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-primary/12 blur-[160px]"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}
                    className="relative z-10 w-full max-w-[640px] lg:max-w-[760px] xl:max-w-[820px] lg:-mr-10 xl:-mr-16"
                  >
                    <motion.img
                      src="/assets/products/lineup_hero_v9.webp"
                      alt="Kimora creatine + electrolytes — Raspberry Dragonfruit, Strawberry Guava, and Lemon Lychee"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 7, ease: "easeInOut", repeat: Infinity }}
                      className="block h-auto w-full drop-shadow-[0_26px_40px_rgba(0,0,0,0.5)]"
                    />
                  </motion.div>
                </div>
              </div>
            </div>
          </section>

          {/* ── What's in it / what's not ── */}
          <section className="border-t border-border bg-background">
            <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 lg:px-10 lg:py-20">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, ease: EASE }}
                className="mb-10 max-w-3xl"
              >
                <p className="text-sm font-medium uppercase tracking-[0.26em] text-primary">
                  The formula
                </p>
                <h2 className="mt-4 text-3xl font-display font-bold tracking-wide text-white sm:text-4xl">
                  What's in it. What's not.
                </h2>
              </motion.div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <motion.div
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6, ease: EASE }}
                  className="rounded-[24px] border border-border bg-card p-8"
                >
                  <h3 className="text-xl font-display font-bold text-white">
                    In every stick
                  </h3>
                  <ul className="mt-5 space-y-3 leading-7 text-muted-foreground">
                    <li>5g creatine monohydrate (200 mesh — no underdose)</li>
                    <li>A real electrolyte panel — sodium, potassium, magnesium</li>
                    <li>Naturally sweetened with stevia and monk fruit</li>
                  </ul>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
                  className="rounded-[24px] border border-border bg-card p-8"
                >
                  <h3 className="text-xl font-display font-bold text-white">
                    What we left out
                  </h3>
                  <ul className="mt-5 space-y-3 leading-7 text-muted-foreground">
                    <li>No silicon dioxide</li>
                    <li>No artificial colors</li>
                    <li>No sugar, no sucralose, no sugar alcohols</li>
                    <li>No proprietary blends, no hidden doses</li>
                  </ul>
                </motion.div>
              </div>

              <p className="mt-8 max-w-3xl leading-8 text-white/80">
                One formula behind all three flavors. Same dose, different
                profiles. Tear, mix, drink.
              </p>
            </div>
          </section>

          {/* ── Why Kimora ── */}
          <section className="border-t border-border bg-card">
            <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 lg:px-10 lg:py-20">
              <motion.div
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, ease: EASE }}
                className="max-w-3xl"
              >
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
              </motion.div>
            </div>
          </section>

          {/* ── Who it's for ── */}
          <section className="border-t border-border bg-card">
            <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 lg:px-10 lg:py-20">
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, ease: EASE }}
                className="max-w-3xl"
              >
                <p className="text-sm font-medium uppercase tracking-[0.26em] text-primary">
                  Built for combat sports
                </p>
                <h2 className="mt-4 text-3xl font-display font-bold tracking-wide text-white sm:text-4xl">
                  Made for the mat, not the supplement aisle.
                </h2>
                <p className="mt-6 leading-8 text-muted-foreground">
                  Combat sports athletes train differently — the rounds are long,
                  the cuts are real, and the recovery window between sessions is
                  short. Kimora is built for that reality: a stick that survives a
                  gym bag and works mid-session, not a tub that sits on a counter.
                  For the people who roll, spar, drill, cut, and compete.
                </p>
                <p className="mt-6 text-sm font-medium uppercase tracking-[0.22em] text-white/70">
                  BJJ · MMA · Muay Thai · Boxing · Grappling · Serious Lifters
                </p>
              </motion.div>
            </div>
          </section>

          {/* ── The stick ── */}
          <section className="border-t border-border bg-background">
            <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 lg:px-10 lg:py-20">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, ease: EASE }}
                className="mb-10 max-w-3xl"
              >
                <p className="text-sm font-medium uppercase tracking-[0.26em] text-primary">
                  The format
                </p>
                <h2 className="mt-4 text-3xl font-display font-bold tracking-wide text-white sm:text-4xl">
                  Why a stick, not a tub.
                </h2>
              </motion.div>

              {/* Pouch + single-serve sticks — show the format */}
              <motion.figure
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, ease: EASE }}
                className="mb-10 overflow-hidden rounded-[24px] border border-border bg-card"
              >
                <img
                  src="/assets/products/strawberry-guava/pouch_sticks_studio.webp"
                  alt="Kimora Strawberry Guava pouch with its single-serve creatine + electrolyte sticks"
                  loading="lazy"
                  className="mx-auto block h-auto w-full max-w-[760px] object-contain"
                />
              </motion.figure>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6, ease: EASE }}
                  className="rounded-[24px] border border-border bg-card p-8"
                >
                  <h3 className="text-xl font-display font-bold text-white">
                    Fits the bag
                  </h3>
                  <p className="mt-3 leading-7 text-muted-foreground">
                    A single-serve stick fits a gi pocket. No tub, no scoop, no
                    shaker on the mat.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
                  className="rounded-[24px] border border-border bg-card p-8"
                >
                  <h3 className="text-xl font-display font-bold text-white">
                    One stick, one day
                  </h3>
                  <p className="mt-3 leading-7 text-muted-foreground">
                    No measuring, no guessing the dose. Tear, mix, drink.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
                  className="rounded-[24px] border border-border bg-card p-8"
                >
                  <h3 className="text-xl font-display font-bold text-white">
                    Survives the gym
                  </h3>
                  <p className="mt-3 leading-7 text-muted-foreground">
                    A matte laminate pack built to take a beating in your bag.
                  </p>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ── Flavor lineup ── */}
          <section className="border-t border-border bg-background">
            <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 lg:px-10 lg:py-20">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, ease: EASE }}
                className="mb-10 max-w-3xl"
              >
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
              </motion.div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                {flavors.map((flavor, i) => (
                  <motion.article
                    key={flavor.name}
                    initial={{ opacity: 0, y: 44 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.65, ease: EASE, delay: i * 0.12 }}
                    whileHover={{ y: -10, transition: { duration: 0.25, ease: EASE } }}
                    className="overflow-hidden rounded-[24px] border border-border bg-card transition-colors duration-300 hover:border-white/15"
                    style={{ willChange: "transform" }}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-[#161312]">
                      <motion.img
                        src={flavor.img}
                        alt={flavor.name}
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.4, ease: EASE }}
                        className="absolute inset-0 h-full w-full object-cover"
                        style={{ willChange: "transform" }}
                      />
                    </div>
                    <div className="border-t border-border p-6 text-center">
                      <h3 className="text-2xl font-display font-bold text-white">
                        {flavor.name}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        {flavor.desc}
                      </p>
                    </div>
                  </motion.article>
                ))}
              </div>
            </div>
          </section>
          {/* ── Tested before it ships ── */}
          <section className="border-t border-border bg-card">
            <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 lg:px-10 lg:py-20">
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, ease: EASE }}
                className="max-w-3xl"
              >
                <p className="text-sm font-medium uppercase tracking-[0.26em] text-primary">
                  Quality
                </p>
                <h2 className="mt-4 text-3xl font-display font-bold tracking-wide text-white sm:text-4xl">
                  Clean formula. Nothing hidden.
                </h2>
                <p className="mt-6 leading-8 text-muted-foreground">
                  No proprietary blends, no fairy dusting, no fillers you can't
                  pronounce. Every stick is fully disclosed: 5g creatine
                  monohydrate at label dose, a real electrolyte panel, and natural
                  sweeteners — that's it. What's on the label is what's in the
                  stick.
                </p>
              </motion.div>
            </div>
          </section>

          {/* ── FAQ ── */}
          <section className="border-t border-border bg-background">
            <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 lg:px-10 lg:py-20">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, ease: EASE }}
                className="mb-10 max-w-3xl"
              >
                <p className="text-sm font-medium uppercase tracking-[0.26em] text-primary">
                  FAQ
                </p>
                <h2 className="mt-4 text-3xl font-display font-bold tracking-wide text-white sm:text-4xl">
                  Questions, answered.
                </h2>
              </motion.div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {[
                  {
                    q: "When does Kimora launch?",
                    a: "Soon — we're finishing final production. Join the waitlist and you'll get the buy link 24 hours before the public, plus 15% off your first order.",
                  },
                  {
                    q: "What do I get for joining the waitlist?",
                    a: "15% off your first order, a 24-hour early-access head start, and the formula details before anyone else. No spam.",
                  },
                  {
                    q: "What's in a stick?",
                    a: "5g creatine monohydrate, a real electrolyte panel (sodium, potassium, magnesium), naturally sweetened with stevia and monk fruit. No silicon dioxide, no artificial colors, no sugar alcohols.",
                  },
                  {
                    q: "How do I know it's dosed right?",
                    a: "Full transparency — 5g creatine monohydrate at label dose, a real electrolyte panel (sodium, potassium, magnesium), naturally sweetened. No proprietary blends, no hidden fillers. What's on the label is in the stick.",
                  },
                  {
                    q: "How do I take it?",
                    a: "One stick a day. Tear it open, mix into water, drink — after class or whenever fits your day.",
                  },
                  {
                    q: "Who is it for?",
                    a: "Combat sports athletes and serious lifters — BJJ, MMA, Muay Thai, boxing, grappling. Built for people who train daily.",
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.q}
                    initial={{ opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.55, ease: EASE, delay: (i % 2) * 0.08 }}
                    className="rounded-[24px] border border-border bg-card p-7"
                  >
                    <h3 className="text-lg font-display font-bold text-white">
                      {item.q}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {item.a}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Manifesto ── */}
          <section className="border-t border-border bg-card">
            <div className="mx-auto max-w-5xl px-6 py-20 text-center md:px-8 lg:px-10 lg:py-28">
              <motion.p
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, ease: EASE }}
                className="font-display text-2xl font-semibold uppercase leading-tight tracking-wide text-foreground sm:text-3xl lg:text-4xl"
              >
                We don't sell supplements. We build athletes who are{" "}
                <span className="text-accent">stronger in the body</span> and{" "}
                <span className="text-accent">sharper in the mind.</span>
              </motion.p>
            </div>
          </section>

          {/* ── What we're building (apparel teaser) ── */}
          <section className="border-t border-border bg-background">
            <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 lg:px-10 lg:py-24">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, ease: EASE }}
                className="mb-10 max-w-3xl"
              >
                <p className="text-sm font-medium uppercase tracking-[0.26em] text-primary">
                  What we're building
                </p>
                <h2 className="mt-4 text-3xl font-display font-bold tracking-wide text-foreground sm:text-4xl">
                  More than a supplement.
                </h2>
                <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">
                  Kimora starts with the stick — but it's becoming a full system
                  for the people who live on the mats. Gear engineered the same way
                  the fuel is: honest, tested, built for live rounds. Here's what's
                  next.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    cat: "Apparel",
                    name: "Rash Guards",
                    img: "/assets/apparel/rashguard-teaser.webp",
                    glow: "radial-gradient(110% 85% at 50% 22%, rgba(168,72,31,0.30), transparent 60%)",
                  },
                  {
                    cat: "Apparel",
                    name: "Grappling Shorts",
                    img: "/assets/apparel/shorts-teaser-v2.webp",
                    glow: "radial-gradient(110% 85% at 50% 22%, rgba(201,168,106,0.22), transparent 60%)",
                  },
                  {
                    cat: "Train",
                    name: "Training Gear",
                    img: "/assets/apparel/training-bag-teaser-v2.webp",
                    glow: "radial-gradient(110% 85% at 50% 22%, rgba(168,72,31,0.22), transparent 60%)",
                  },
                ].map((tile, i) => (
                  <motion.div
                    key={tile.name}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.6, ease: EASE, delay: i * 0.1 }}
                    className="group relative aspect-[4/5] overflow-hidden rounded-[24px] border border-border bg-card"
                  >
                    <div
                      className="absolute inset-0"
                      style={{ background: tile.glow }}
                    />
                    <img
                      src={tile.img}
                      alt={tile.name}
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                      className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                    <div className="absolute right-4 top-4 rounded-full border border-accent/40 bg-background/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent backdrop-blur-sm">
                      Coming Soon
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-6">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        {tile.cat}
                      </span>
                      <h3 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide text-foreground">
                        {tile.name}
                      </h3>
                    </div>
                  </motion.div>
                ))}
              </div>

              <p className="mt-8 text-sm text-muted-foreground">
                Rash guards, shorts, and training gear are in development. Join the
                waitlist above and you'll hear first.
              </p>
            </div>
          </section>
        </main>
      </div>

      <Footer />
    </>
  );
}
