import { motion } from "framer-motion";
import { Band, EASE, eyebrowOn, headOn, bodyOn, type Tone } from "./Band";
import { cn } from "@/lib/utils";

/**
 * The transparency claim. One column of prose — no cards, no grid — so it lands
 * as a statement rather than a feature list.
 */
export function Quality({ tone = "ink" }: { tone?: Tone }) {
  return (
    <Band tone={tone}>
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: EASE }}
        className="max-w-3xl"
      >
        <p
          className={cn(
            "text-sm font-medium uppercase tracking-[0.26em]",
            eyebrowOn(tone)
          )}
        >
          Quality
        </p>
        <h2
          className={cn(
            "mt-4 text-3xl font-display font-bold tracking-wide sm:text-4xl",
            headOn(tone)
          )}
        >
          Clean formula. Nothing hidden.
        </h2>
        <p className={cn("mt-6 leading-8", bodyOn(tone))}>
          No proprietary blends, no fairy dusting, no fillers you can't
          pronounce. Every stick is fully disclosed: 5g creatine monohydrate at
          label dose, a real electrolyte panel, and natural sweeteners — that's
          it. What's on the label is what's in the stick.
        </p>
      </motion.div>
    </Band>
  );
}
