import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Band, EASE } from "./Band";
import { INK_HEAD, INK_BODY } from "@/lib/surfaces";
import { FLAVORS, LAUNCH_FLAVOR, STICKS_PER_POUCH } from "@/lib/product";
import {
  WAITLIST_CODE,
  WAITLIST_DISCOUNT_LABEL,
  waitlistPrice,
} from "@/lib/prelaunch";

const LAUNCH = FLAVORS.find((f) => f.slug === LAUNCH_FLAVOR) ?? FLAVORS[0];

/**
 * The waitlist capture — countdown, email form, and the 15% code.
 *
 * This used to sit inside the pre-launch hero, which meant the first thing a
 * visitor met was a discount off a price they had not seen, on a pouch whose
 * size they did not know. It closes the page instead: flavors, formula and FAQ
 * make the case and quote the price, and the ask comes after. The hero now
 * points at pricing and links down here.
 *
 * It owns its own countdown and form state so the page that hosts it is just a
 * running order of sections.
 */

export function Waitlist() {
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
    <Band tone="ink" id="waitlist">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: EASE }}
        className="mx-auto flex max-w-2xl flex-col gap-8 text-center"
      >
        <div>
          <p className={`text-[11px] uppercase tracking-[0.24em] ${INK_BODY}`}>
            Pre-Launch Exclusive
          </p>

          <h2
            className={`mt-3 text-4xl font-display font-bold tracking-tight sm:text-5xl ${INK_HEAD}`}
          >
            Get {WAITLIST_DISCOUNT_LABEL} off — and first access.
          </h2>

          <p className={`mx-auto mt-4 max-w-[460px] text-base leading-7 ${INK_BODY}`}>
            You have seen the formula and the price. Join the waitlist and your
            first pouch is ${waitlistPrice(LAUNCH.priceOneTime)} instead of $
            {LAUNCH.priceOneTime.toFixed(2)} for {STICKS_PER_POUCH} sticks, with a
            24-hour head start before the public.
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
              className="rounded-xl border border-[rgba(247,240,222,0.16)] bg-[rgba(247,240,222,0.05)] px-3 py-4"
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
          <div className="rounded-xl border border-accent/40 bg-accent/20 px-3 py-4 shadow-[0_0_28px_rgba(168,71,42,0.28)]">
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            aria-label="Email address"
            className="h-16 w-full rounded-lg border border-[rgba(247,240,222,0.18)] bg-[rgba(247,240,222,0.06)] px-5 text-base text-[#F7F0DE] placeholder:text-[rgba(247,240,222,0.45)] transition-colors duration-200 focus:border-primary/60 focus:outline-none disabled:opacity-60 sm:flex-1"
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
              <span className="font-bold">{WAITLIST_CODE}</span> —{" "}
              {WAITLIST_DISCOUNT_LABEL} off your first order, plus early access at
              launch.
            </motion.p>
          ) : (
            <motion.p
              key="fine-print"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`text-xs ${INK_BODY}`}
            >
              {WAITLIST_DISCOUNT_LABEL} off first order · One use per customer ·
              No spam
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </Band>
  );
}
