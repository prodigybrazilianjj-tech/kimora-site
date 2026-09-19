import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Band, EASE, bodyOn, headOn, type Tone } from "./Band";
import { cn } from "@/lib/utils";

/**
 * The dose numbers, counting up on scroll-into-view. It replaced the old
 * text-only fact strip, since the actual milligrams say more than
 * "electrolytes" does.
 *
 * With `product` the launch stick lies across the band above the numbers —
 * the pack first, then what is in it. It is a still image on purpose: the
 * numbers are the motion here.
 *
 * Values mirror the signed Bactolac batch sheet MF-20922 (2026-09-11), which
 * matches FORMULA_VALUES_LOCKED_2026-06-17. Keep in step with lib/product.ts.
 */

const STICK = {
  src: "/assets/products/strawberry-guava/stick-floating-sg.webp",
  alt: "Kimora Strawberry Guava creatine + electrolyte stick",
  width: 1517,
  height: 417,
};

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
  product = false,
}: {
  tone?: Tone;
  /** Gold hairlines top and bottom — used where this sits directly under the hero. */
  rules?: boolean;
  /** Lay the launch stick across the band, above the numbers. */
  product?: boolean;
}) {
  return (
    <Band
      tone={tone}
      className={cn(rules && "border-y border-primary")}
      innerClassName={product ? "py-12 lg:py-16" : "py-12 lg:py-14"}
    >
      {product ? (
        <div className="mx-auto mb-10 w-full max-w-[900px] px-2 lg:mb-14">
          <img
            src={STICK.src}
            alt={STICK.alt}
            width={STICK.width}
            height={STICK.height}
            // Sits just under the hero, so it is in the first viewport on
            // most screens — fetch it eagerly.
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className={cn(
              "block h-auto w-full",
              tone === "ink"
                ? "drop-shadow-[0_28px_30px_rgba(0,0,0,0.55)]"
                : "drop-shadow-[0_22px_26px_rgba(33,30,26,0.28)]"
            )}
          />
        </div>
      ) : null}
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
      {/* The article at /learn/third-party-testing promises this note travels
          with the numbers. Do not remove one without the other. */}
      <p
        className={cn(
          "mt-8 text-center text-[11px] leading-5 tracking-wide",
          bodyOn(tone)
        )}
      >
        Per stick. Formulated amounts — they finalize on our production
        Certificate of Analysis.
      </p>
    </Band>
  );
}
