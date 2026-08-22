import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Footer } from "@/components/sections/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { INK, INK_HEAD, INK_LEAD, INK_BODY, INK_CARD, LIGHT_CARD } from "@/lib/surfaces";

const EASE = [0.22, 1, 0.36, 1] as const;

const WRAP = "mx-auto max-w-7xl px-6 py-16 md:px-8 lg:px-10 lg:py-20";
const EYEBROW = "text-sm font-medium uppercase tracking-[0.26em]";

/** Fact strip — each line is lifted verbatim from a section further down. */
const FACTS = [
  "5g creatine monohydrate",
  "Sodium, potassium, magnesium",
  "No sugar, no sucralose",
  "Made for the mat",
];

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
      well: "rgba(210,88,67,0.16)",
      desc: "Tropical, richer, and fruit-forward with a fuller flavor profile.",
    },
    {
      name: "Lemon Lychee",
      img: "/assets/products/lemon-lychee/pouch_sticks_v6.webp",
      well: "rgba(229,209,78,0.13)",
      desc: "Bright lemon with a sweet, floral lychee finish.",
    },
    {
      name: "Raspberry Dragonfruit",
      img: "/assets/products/raspberry-dragonfruit/pouch_sticks_v8.webp",
      well: "rgba(214,40,57,0.14)",
      desc: "Smooth, balanced, and built to be the daily driver.",
    },
  ];

  return (
    <>
      <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
        {/* fine grain texture */}
        <div
          className="pointer-events-none absolute inset-0 z-20 mix-blend-multiply"
          style={{
            opacity: 0.05,
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <main className="relative z-10">
          {/* ── Header ── */}
          <motion.header
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md backdrop-saturate-150"
          >
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 md:px-8 lg:px-10">
              <Link
                href="/"
                className="font-wordmark text-4xl font-bold leading-none tracking-[0.16em] text-foreground transition-colors hover:text-foreground sm:text-5xl"
              >
                KIM<span className="text-accent">O</span>RA
              </Link>

              <div className="hidden items-center gap-3 sm:flex">
                <motion.span
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.55, ease: EASE, delay: 0.25 }}
                  className="rounded-full border border-foreground/10 bg-foreground/[0.04] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-primary-strong backdrop-blur-sm"
                >
                  Creatine · Electrolytes · Daily
                </motion.span>
              </div>
            </div>
          </motion.header>

          {/* ── 1. Hero — ink ── */}
          <section className={`relative overflow-hidden ${INK}`}>
            {/* warm aurora glows */}
            <div className="pointer-events-none absolute -left-32 -top-40 h-[34rem] w-[44rem] rounded-full bg-[radial-gradient(circle,rgba(201,168,106,0.22),transparent_70%)] blur-[120px]" />
            <div className="pointer-events-none absolute -right-40 top-24 h-[36rem] w-[42rem] rounded-full bg-[radial-gradient(circle,rgba(168,71,42,0.28),transparent_70%)] blur-[130px]" />

            {/* Gym-display illustration bleeds off the right edge — a layer, not a
                grid column, so there's no dead space to balance around it. */}
            <img
              src="/assets/brand/octopus-bear-display-red.png"
              alt="Kimora octopus and bear"
              className="pointer-events-none absolute -right-24 top-28 z-[1] w-[560px] max-w-none opacity-25 lg:-right-16 lg:top-16 lg:w-[820px] lg:opacity-90"
            />

            {/* Ink scrim so the copy stays legible where it crosses the artwork. */}
            <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,#211E1A_0%,rgba(33,30,26,0.92)_38%,rgba(33,30,26,0)_72%)]" />

            <div className="relative z-[2] mx-auto w-full max-w-7xl px-6 pb-20 pt-12 md:px-8 lg:px-10 lg:pb-28 lg:pt-16">
              <div className="max-w-[600px]">
                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
                  className="inline-block bg-gradient-to-r from-[#C9A86A] via-[#E3C88E] to-[#D8AE5A] bg-clip-text text-sm font-semibold uppercase tracking-[0.30em] text-transparent"
                >
                  Coming soon
                </motion.p>

                <h1
                  className={`mt-5 text-5xl font-display font-bold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl ${INK_HEAD}`}
                >
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
                  className={`mt-8 max-w-[520px] text-lg leading-8 sm:text-xl ${INK_LEAD}`}
                >
                  Creatine + electrolytes built for fighters.
                </motion.p>

                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.78 }}
                  className={`mt-5 max-w-[560px] text-base leading-7 sm:text-lg sm:leading-8 ${INK_BODY}`}
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
                      className="rounded-full border border-[rgba(247,240,222,0.18)] bg-[rgba(247,240,222,0.05)] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-[rgba(247,240,222,0.78)]"
                    >
                      {badge}
                    </motion.span>
                  ))}
                </div>

                {/* Waitlist card */}
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.75, ease: EASE, delay: 1.08 }}
                  className="mt-10 rounded-2xl border border-[rgba(247,240,222,0.16)] bg-[rgba(247,240,222,0.04)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-6"
                >
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className={`text-[11px] uppercase tracking-[0.24em] ${INK_BODY}`}>
                          Pre-Launch Exclusive
                        </p>
                        <h2
                          className={`mt-2 text-3xl font-display font-bold tracking-tight ${INK_HEAD}`}
                        >
                          Get 15% off — and first access.
                        </h2>
                      </div>

                      <p className={`max-w-[240px] text-sm leading-6 sm:text-right ${INK_BODY}`}>
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
                          className="rounded-2xl border border-[rgba(247,240,222,0.16)] bg-[rgba(247,240,222,0.05)] px-3 py-4 text-center"
                        >
                          <div
                            className={`text-3xl font-bold tracking-tight md:text-4xl ${INK_HEAD}`}
                          >
                            {value}
                          </div>
                          <div className={`mt-1 text-[10px] uppercase tracking-[0.22em] ${INK_BODY}`}>
                            {label}
                          </div>
                        </div>
                      ))}

                      {/* Seconds — subtle pulse on each tick */}
                      <div className="rounded-2xl border border-accent/40 bg-accent/20 px-3 py-4 text-center shadow-[0_0_28px_rgba(168,71,42,0.28)]">
                        <motion.div
                          key={countdown.seconds}
                          initial={{ opacity: 0.4, scale: 0.78 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className={`text-3xl font-bold tracking-tight md:text-4xl ${INK_HEAD}`}
                        >
                          {countdown.seconds}
                        </motion.div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-[#E08A6B]">
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
                        aria-label="Email address"
                        className="h-16 w-full sm:flex-1 rounded-2xl border border-[rgba(247,240,222,0.18)] bg-[rgba(247,240,222,0.06)] px-5 text-base text-[#F7F0DE] placeholder:text-[rgba(247,240,222,0.45)] focus:border-primary/60 focus:outline-none disabled:opacity-60 transition-colors duration-200"
                      />

                      <motion.button
                        type="submit"
                        disabled={submitting}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="h-16 rounded-2xl bg-[linear-gradient(180deg,#E3C88E_0%,#C9A86A_55%,#A6864B_100%)] px-7 text-sm font-bold uppercase tracking-[0.18em] text-primary-foreground shadow-[0_12px_26px_rgba(201,168,106,0.34),inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(201,168,106,0.45)] disabled:opacity-60"
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
                          className={`text-xs ${INK_BODY}`}
                        >
                          15% off first order · One use per customer · No spam
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ── 2. Fact strip — cream, gold rules top + bottom ── */}
          <section className="border-y border-primary bg-background">
            <div className="mx-auto max-w-7xl px-6 py-7 md:px-8 lg:px-10">
              <ul className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                {FACTS.map((fact, i) => (
                  <motion.li
                    key={fact}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.45, ease: EASE, delay: i * 0.07 }}
                    className="flex items-center gap-2.5 text-xs uppercase tracking-[0.18em] text-foreground/85 md:justify-center"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {fact}
                  </motion.li>
                ))}
              </ul>
            </div>
          </section>

          {/* ── 3. The formula — ink ── */}
          <section className={INK}>
            <div className={WRAP}>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, ease: EASE }}
                className="mb-10 max-w-3xl"
              >
                <p className={`${EYEBROW} text-primary`}>The formula</p>
                <h2
                  className={`mt-4 text-3xl font-display font-bold tracking-wide sm:text-4xl ${INK_HEAD}`}
                >
                  What's in it. What's not.
                </h2>
              </motion.div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <motion.div
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6, ease: EASE }}
                  className={`${INK_CARD} p-8`}
                >
                  <h3 className={`text-xl font-display font-bold ${INK_HEAD}`}>
                    In every stick
                  </h3>
                  <ul className={`mt-5 space-y-3 leading-7 ${INK_BODY}`}>
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
                  className={`${INK_CARD} p-8`}
                >
                  <h3 className={`text-xl font-display font-bold ${INK_HEAD}`}>
                    What we left out
                  </h3>
                  <ul className={`mt-5 space-y-3 leading-7 ${INK_BODY}`}>
                    <li>No silicon dioxide</li>
                    <li>No artificial colors</li>
                    <li>No sugar, no sucralose, no sugar alcohols</li>
                    <li>No proprietary blends, no hidden doses</li>
                  </ul>
                </motion.div>
              </div>

              <p className={`mt-8 max-w-3xl leading-8 ${INK_LEAD}`}>
                One formula behind all three flavors. Same dose, different
                profiles. Tear, mix, drink.
              </p>
            </div>
          </section>

          {/* ── 4. Flavor lineup — sand ── */}
          <section className="bg-secondary">
            <div className={WRAP}>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, ease: EASE }}
                className="mb-10 max-w-3xl"
              >
                <p className={`${EYEBROW} text-primary-strong`}>Flavor lineup</p>

                <h2 className="mt-4 text-3xl font-display font-bold tracking-wide text-foreground sm:text-4xl">
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
                    className={`overflow-hidden ${LIGHT_CARD} transition-colors duration-300 hover:border-foreground/15`}
                    style={{ willChange: "transform" }}
                  >
                    {/* Product well — tinted with the flavor colour at low alpha. */}
                    <div
                      className="relative aspect-[4/5] overflow-hidden"
                      style={{ backgroundColor: flavor.well }}
                    >
                      {/* Opaque, not a tint: a translucent pill washes out against
                          the packaging behind it. */}
                      <span className="absolute left-4 top-4 z-[5] rounded-full border border-accent/40 bg-background px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
                        Coming Soon
                      </span>
                      <motion.img
                        src={flavor.img}
                        alt={flavor.name}
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.4, ease: EASE }}
                        className="absolute inset-0 z-[1] h-full w-full object-cover"
                        style={{ willChange: "transform" }}
                      />
                    </div>
                    <div className="border-t border-border p-6 text-center">
                      <h3 className="text-2xl font-display font-bold text-foreground">
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

          {/* ── 5. The format — ink ── */}
          <section className={INK}>
            <div className={WRAP}>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, ease: EASE }}
                className="mb-10 max-w-3xl"
              >
                <p className={`${EYEBROW} text-primary`}>The format</p>
                <h2
                  className={`mt-4 text-3xl font-display font-bold tracking-wide sm:text-4xl ${INK_HEAD}`}
                >
                  Why a stick, not a tub.
                </h2>
              </motion.div>

              {/* Pouch + single-serve sticks — show the format */}
              <motion.figure
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, ease: EASE }}
                className={`mb-10 overflow-hidden ${INK_CARD}`}
              >
                <img
                  src="/assets/products/strawberry-guava/pouch_sticks_studio.webp"
                  alt="Kimora Strawberry Guava pouch with its single-serve creatine + electrolyte sticks"
                  loading="lazy"
                  className="mx-auto block h-auto w-full max-w-[760px] object-contain"
                />
              </motion.figure>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {[
                  {
                    title: "Fits the bag",
                    body: "A single-serve stick fits a gi pocket. No tub, no scoop, no shaker on the mat.",
                  },
                  {
                    title: "One stick, one day",
                    body: "No measuring, no guessing the dose. Tear, mix, drink.",
                  },
                  {
                    title: "Survives the gym",
                    body: "A matte laminate pack built to take a beating in your bag.",
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.6, ease: EASE, delay: i * 0.1 }}
                    className={`${INK_CARD} p-8`}
                  >
                    <h3 className={`text-xl font-display font-bold ${INK_HEAD}`}>
                      {item.title}
                    </h3>
                    <p className={`mt-3 leading-7 ${INK_BODY}`}>{item.body}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ── 6. Why Kimora exists + Built for combat sports — cream ── */}
          <section className="bg-background">
            <div className={WRAP}>
              <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
                <motion.div
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.7, ease: EASE }}
                >
                  <p className={`${EYEBROW} text-primary-strong`}>Why Kimora exists</p>

                  <h2 className="mt-4 text-3xl font-display font-bold tracking-wide text-foreground sm:text-4xl">
                    Consistency wins.
                  </h2>

                  <p className="mt-6 leading-8 text-muted-foreground">
                    You do not get stronger from one lift. You do not get better
                    from one roll. And you do not get results from taking creatine
                    only when you remember.
                  </p>

                  <p className="mt-4 leading-8 text-foreground/80">
                    Kimora was built to remove the friction so daily use becomes the
                    default.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
                >
                  <p className={`${EYEBROW} text-primary-strong`}>
                    Built for combat sports
                  </p>
                  <h2 className="mt-4 text-3xl font-display font-bold tracking-wide text-foreground sm:text-4xl">
                    Made for the mat, not the supplement aisle.
                  </h2>
                  <p className="mt-6 leading-8 text-muted-foreground">
                    Combat sports athletes train differently — the rounds are long,
                    the cuts are real, and the recovery window between sessions is
                    short. Kimora is built for that reality: a stick that survives a
                    gym bag and works mid-session, not a tub that sits on a counter.
                    For the people who roll, spar, drill, cut, and compete.
                  </p>
                  <p className="mt-6 text-sm font-medium uppercase tracking-[0.22em] text-foreground/70">
                    BJJ · MMA · Muay Thai · Boxing · Grappling · Serious Lifters
                  </p>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ── 7. Quality — ink ── */}
          <section className={INK}>
            <div className={WRAP}>
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, ease: EASE }}
                className="max-w-3xl"
              >
                <p className={`${EYEBROW} text-primary`}>Quality</p>
                <h2
                  className={`mt-4 text-3xl font-display font-bold tracking-wide sm:text-4xl ${INK_HEAD}`}
                >
                  Clean formula. Nothing hidden.
                </h2>
                <p className={`mt-6 leading-8 ${INK_BODY}`}>
                  No proprietary blends, no fairy dusting, no fillers you can't
                  pronounce. Every stick is fully disclosed: 5g creatine
                  monohydrate at label dose, a real electrolyte panel, and natural
                  sweeteners — that's it. What's on the label is what's in the
                  stick.
                </p>
              </motion.div>
            </div>
          </section>

          {/* ── 8. FAQ — sand ── */}
          <section className="bg-secondary">
            <div className={WRAP}>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, ease: EASE }}
                className="mb-10 max-w-3xl"
              >
                <p className={`${EYEBROW} text-primary-strong`}>FAQ</p>
                <h2 className="mt-4 text-3xl font-display font-bold tracking-wide text-foreground sm:text-4xl">
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
                    className={`${LIGHT_CARD} p-7`}
                  >
                    <h3 className="text-lg font-display font-bold text-foreground">
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

          {/* ── 9. Manifesto — ink, centred ── */}
          <section className={INK}>
            <div className="mx-auto max-w-5xl px-6 py-20 text-center md:px-8 lg:px-10 lg:py-28">
              <motion.p
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, ease: EASE }}
                className={`font-display text-2xl font-semibold uppercase leading-tight tracking-wide sm:text-3xl lg:text-4xl ${INK_HEAD}`}
              >
                We don't sell supplements. We build athletes who are{" "}
                <span className="text-primary">stronger in the body</span> and{" "}
                <span className="text-primary">sharper in the mind.</span>
              </motion.p>
            </div>
          </section>

          {/* ── 10. More than a supplement — cream, tiles stay dark ── */}
          <section className="bg-background">
            <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 lg:px-10 lg:py-24">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, ease: EASE }}
                className="mb-10 max-w-3xl"
              >
                <p className={`${EYEBROW} text-primary-strong`}>What we're building</p>
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
                    img: "/assets/apparel/training-bag-teaser-v3.webp",
                    glow: "radial-gradient(110% 85% at 50% 22%, rgba(168,72,31,0.22), transparent 60%)",
                  },
                ].map((tile, i) => (
                  <motion.div
                    key={tile.name}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.6, ease: EASE, delay: i * 0.1 }}
                    className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-surface-ink"
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
                    <div className="absolute right-4 top-4 rounded-full border border-accent/40 bg-background px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
                      Coming Soon
                    </div>
                    {/* The tile is dark whatever the band is, so its label is cream. */}
                    <div className="absolute inset-x-0 bottom-0 p-6">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-[rgba(247,240,222,0.72)]">
                        {tile.cat}
                      </span>
                      <h3 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide text-[#F7F0DE]">
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

      <Footer tone="ink" />
    </>
  );
}
