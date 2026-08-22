import { motion } from "framer-motion";

/**
 * Ritual — Tear / Mix / Roll habit cards (approved mockup 2026-07-05).
 * Hover lifts the card and stretches the accent bar.
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

export function Ritual() {
  return (
    <section className="py-16 md:py-24 bg-secondary">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-10 md:mb-14">
          <p className="text-[11px] font-bold tracking-[0.28em] uppercase text-accent mb-3">
            The Ritual
          </p>
          <h2 className="text-4xl md:text-5xl font-display font-extrabold uppercase text-foreground">
            Ten Seconds. Every Day.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.12, duration: 0.6 }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 md:p-9 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_40px_hsl(var(--foreground)/0.14)]"
            >
              <span
                aria-hidden="true"
                className="absolute top-3 right-5 font-display font-black text-[86px] leading-none text-transparent select-none"
                style={{ WebkitTextStroke: "1.5px hsl(var(--primary) / 0.5)" }}
              >
                {step.n}
              </span>
              <span className="block h-[3px] w-11 rounded bg-accent mb-6 transition-all duration-300 group-hover:w-20" />
              <h3 className="text-2xl font-display font-extrabold uppercase text-foreground mb-2.5">
                {step.title}
              </h3>
              <p className="text-sm md:text-[15px] leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
