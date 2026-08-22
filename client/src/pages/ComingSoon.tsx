import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { scrollToId, scrollToPageTop } from "@/lib/scroll";
import { Footer } from "@/components/sections/Footer";
import { StatsBand } from "@/components/sections/StatsBand";
import { FlavorLineup } from "@/components/sections/FlavorLineup";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { HeroShell } from "@/components/sections/HeroShell";
import { WhyKimora } from "@/components/sections/WhyKimora";
import { WhyNotATub } from "@/components/sections/WhyNotATub";
import { Formula } from "@/components/sections/Formula";
import { Quality } from "@/components/sections/Quality";
import { FaqSection } from "@/components/sections/FaqSection";
import { Manifesto } from "@/components/sections/Manifesto";
import { FutureProducts } from "@/components/sections/FutureProducts";
import { motion, AnimatePresence } from "framer-motion";
import { INK, INK_HEAD, INK_LEAD, INK_BODY, INK_CARD, LIGHT_CARD } from "@/lib/surfaces";

const EASE = [0.22, 1, 0.36, 1] as const;

const WRAP = "mx-auto max-w-7xl px-6 py-16 md:px-8 lg:px-10 lg:py-20";
const EYEBROW = "text-sm font-medium uppercase tracking-[0.26em]";

function scrollToWaitlist() {
  scrollToId("waitlist");
}

// HOME is the active link because this page is the front door.
const NAV_LINKS = [
  {
    label: "Home",
    active: true,
    onClick: scrollToPageTop,
  },
  { label: "Flavors", onClick: () => scrollToId("flavors") },
  { label: "Formula", onClick: () => scrollToId("formula") },
  { label: "About", onClick: () => scrollToId("about") },
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
          <SiteHeader
            links={NAV_LINKS}
            cta={{ label: "Join Waitlist", onClick: scrollToWaitlist }}
            onWordmarkClick={(ev) => {
              ev.preventDefault();
              scrollToPageTop();
            }}
          />

          {/* ── 1. Hero — ink ── */}
          <HeroShell>
                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
                  className="inline-block bg-gradient-to-r from-[#C9A86A] via-[#E3C88E] to-[#D8AE5A] bg-clip-text text-sm font-semibold uppercase tracking-[0.30em] text-transparent"
                >
                  Coming soon
                </motion.p>

                <h1
                  className={`mt-5 text-5xl font-display font-extrabold uppercase leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl ${INK_HEAD}`}
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
                  id="waitlist"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.75, ease: EASE, delay: 1.08 }}
                  className="mt-10 rounded-xl border border-[rgba(247,240,222,0.16)] bg-[rgba(247,240,222,0.04)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-6"
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
                          className="rounded-xl border border-[rgba(247,240,222,0.16)] bg-[rgba(247,240,222,0.05)] px-3 py-4 text-center"
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
                      <div className="rounded-xl border border-accent/40 bg-accent/20 px-3 py-4 text-center shadow-[0_0_28px_rgba(168,71,42,0.28)]">
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
                        className="h-16 w-full sm:flex-1 rounded-lg border border-[rgba(247,240,222,0.18)] bg-[rgba(247,240,222,0.06)] px-5 text-base text-[#F7F0DE] placeholder:text-[rgba(247,240,222,0.45)] focus:border-primary/60 focus:outline-none disabled:opacity-60 transition-colors duration-200"
                      />

                      <motion.button
                        type="submit"
                        disabled={submitting}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="h-16 rounded-lg bg-primary px-7 text-sm font-bold uppercase tracking-[0.18em] text-primary-foreground transition-colors duration-200 hover:bg-primary/90 disabled:opacity-60"
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
          </HeroShell>

          {/* ── 2. The numbers — cream, gold rules top + bottom ── */}
          <StatsBand tone="cream" rules />

          <Formula tone="ink" />

          <FlavorLineup tone="sand" mode="prelaunch" />

          <WhyNotATub tone="ink" />

          <WhyKimora tone="cream" id="about" />

          {/* ── 7-10. Shared with the homepage — see components/sections. ── */}
          <Quality tone="ink" />
          <FaqSection tone="sand" mode="prelaunch" />
          <Manifesto />
          <FutureProducts tone="cream" />
        </main>
      </div>

      <Footer tone="ink" />
    </>
  );
}
