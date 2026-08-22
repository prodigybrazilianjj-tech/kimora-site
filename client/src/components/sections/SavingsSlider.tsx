import { useState } from "react";
import { motion } from "framer-motion";
import { INK, INK_BODY } from "@/lib/surfaces";

/**
 * SavingsSlider — subscription value widget (approved mockup 2026-07-05,
 * revised per Alex 7/2: show SAVINGS + sticks delivered, never cumulative
 * subscription spend). Prices: retail $49.99 / sub $39.99 (locked 6/24).
 */

const SUB = 39.99;
const ONE_TIME = 49.99;

export function SavingsSlider() {
  const [months, setMonths] = useState(12);
  const saved = (ONE_TIME - SUB) * months;
  const sticks = months * 30;

  return (
    <section className={`relative overflow-hidden py-16 md:py-24 ${INK}`}>
      <div className="container px-4 mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7 }}
        >
          <p className="text-[11px] font-bold tracking-[0.28em] uppercase text-primary mb-3">
            Subscribe &amp; Save 20%
          </p>
          <h2 className="text-4xl md:text-5xl font-display font-extrabold uppercase leading-tight text-surface-ink-foreground">
            The Habit
            <br />
            Pays You Back.
          </h2>
          <p className={`mt-5 max-w-md leading-relaxed ${INK_BODY}`}>
            Creatine only works if you take it every day. Subscription keeps the
            sticks coming — and keeps $10 in your pocket every bag.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, delay: 0.12 }}
          className="rounded-xl border border-[rgba(247,240,222,0.16)] bg-[rgba(247,240,222,0.05)] p-8 md:p-9"
        >
          <label
            htmlFor="savings-months"
            className="block text-[11px] font-bold tracking-[0.22em] uppercase text-primary"
          >
            How long will you train?
          </label>
          <input
            id="savings-months"
            type="range"
            min={1}
            max={24}
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="w-full mt-5 mb-2 accent-primary cursor-pointer"
          />
          <div className="font-display text-xl font-bold text-surface-ink-foreground">
            {months} {months === 1 ? "month" : "months"}
          </div>

          <div className="grid grid-cols-2 gap-3.5 mt-7">
            <div className="rounded-xl bg-black/40 p-5">
              <div className="font-display font-black text-3xl text-[#D9B96E]">
                ${saved.toFixed(2)}
              </div>
              <div className={`mt-1 text-[10px] font-semibold tracking-[0.18em] uppercase ${INK_BODY}`}>
                You Save vs One-Time
              </div>
            </div>
            <div className="rounded-xl bg-black/40 p-5">
              <div className="font-display font-black text-3xl text-primary">
                {sticks.toLocaleString()}
              </div>
              <div className={`mt-1 text-[10px] font-semibold tracking-[0.18em] uppercase ${INK_BODY}`}>
                Sticks Delivered
              </div>
            </div>
          </div>

          <p className={`mt-5 text-xs ${INK_BODY}`}>
            $1.33/day subscribed · pause, swap flavors, or cancel anytime
          </p>
        </motion.div>
      </div>
    </section>
  );
}
