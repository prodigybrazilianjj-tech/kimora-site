import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Band, EASE, bodyOn, headOn, type Tone } from "./Band";
import { cn } from "@/lib/utils";

/**
 * The dose numbers, counting up on scroll-into-view. Shared by the pre-launch
 * page and the homepage — it replaced the old text-only fact strip, since the
 * actual milligrams say more than "electrolytes" does.
 *
 * Values mirror FORMULA_VALUES_LOCKED_2026-06-17.
 */

const STATS = [
  { value: 5, suffix: "g", label: "Creatine" },
  { value: 750, suffix: "mg", label: "Sodium" },
  { value: 250, suffix: "mg", label: "Potassium" },
  { value: 60, suffix: "mg", label: "Magnesium" },
  { value: 0, suffix: "g", label: "Sugar" },
];

function Counter({ target }: { target: number }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const prefersReducedMotion = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion || target === 0) {
      setValue(target);
      return;
    }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / 1200, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, prefersReducedMotion]);

  return <span ref={ref}>{value}</span>;
}

export function StatsBand({
  tone = "ink",
  rules = false,
}: {
  tone?: Tone;
  /** Gold hairlines top and bottom — used where this sits directly under the hero. */
  rules?: boolean;
}) {
  return (
    <Band
      tone={tone}
      className={cn(rules && "border-y border-primary")}
      innerClassName="py-12 lg:py-14"
    >
      <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-5 md:gap-4">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: i * 0.08, duration: 0.6, ease: EASE }}
            className={i === 4 ? "col-span-2 md:col-span-1" : ""}
          >
            <div
              className={cn(
                "font-display text-4xl font-black md:text-5xl",
                headOn(tone)
              )}
            >
              <Counter target={stat.value} />
              {/* Red Rock measures 2.85:1 on ink — under AA even at display size. */}
              <span
                className={cn(
                  "ml-0.5 align-baseline text-[0.55em]",
                  tone === "ink" ? "text-primary" : "text-accent"
                )}
              >
                {stat.suffix}
              </span>
            </div>
            <div
              className={cn(
                "mt-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] md:text-[11px]",
                bodyOn(tone)
              )}
            >
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>
    </Band>
  );
}
