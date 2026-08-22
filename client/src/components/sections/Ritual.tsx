import { motion } from "framer-motion";
import { Band, SectionHead, EASE, bodyOn, headOn, type Tone } from "./Band";
import { INK_CARD, LIGHT_CARD } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

/**
 * Tear / Mix / Roll — the daily habit in three steps. Homepage-only; the
 * pre-launch page argues the same point as prose under "Consistency wins."
 *
 * The oversized outlined numeral and the accent bar that stretches on hover are
 * from the approved 2026-07-05 mockup and are kept as-is; only the surface and
 * text colours now come from the band system.
 */

const STEPS = [
  {
    n: "01",
    title: "Tear",
    body: "One stick. No scoop, no tub, no guessing. Throw it in your gym bag or your gi jacket.",
  },
  {
    n: "02",
    title: "Mix",
    body: "12–20oz of water. Clean acid system means it actually tastes like something you want to drink.",
  },
  {
    n: "03",
    title: "Roll",
    body: "Strength, hydration, and recovery — compounding daily, on the mats and off.",
  },
];

export function Ritual({ tone = "sand" }: { tone?: Tone }) {
  const ink = tone === "ink";

  return (
    <Band tone={tone}>
      <SectionHead
        tone={tone}
        eyebrow="The ritual"
        title="Ten seconds. Every day."
        align="center"
      />

      <div className="grid gap-6 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.n}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.12, duration: 0.6, ease: EASE }}
            className={cn(
              "group relative overflow-hidden p-8 transition-all duration-300 hover:-translate-y-1.5 md:p-9",
              ink ? INK_CARD : LIGHT_CARD,
              ink
                ? "hover:shadow-[0_22px_40px_rgba(0,0,0,0.45)]"
                : "hover:shadow-[0_22px_40px_hsl(var(--foreground)/0.14)]"
            )}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-5 top-3 select-none font-display text-[86px] font-black leading-none text-transparent"
              style={{ WebkitTextStroke: "1.5px hsl(var(--primary) / 0.5)" }}
            >
              {step.n}
            </span>

            <span className="mb-6 block h-[3px] w-11 rounded bg-accent transition-all duration-300 group-hover:w-20" />

            <h3
              className={cn(
                "mb-2.5 text-2xl font-display font-bold uppercase",
                headOn(tone)
              )}
            >
              {step.title}
            </h3>
            <p className={cn("text-sm leading-relaxed md:text-[15px]", bodyOn(tone))}>
              {step.body}
            </p>
          </motion.div>
        ))}
      </div>
    </Band>
  );
}
