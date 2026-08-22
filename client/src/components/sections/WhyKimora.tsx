import { motion } from "framer-motion";
import { Band, EASE, bodyOn, eyebrowOn, headOn, type Tone } from "./Band";
import { cn } from "@/lib/utils";

/**
 * The positioning, in two columns: why the product exists, and who it is for.
 *
 * Deliberately prose rather than cards — it is the argument, not a feature
 * list, and the sections either side of it are already card grids.
 */

const EYEBROW = "text-sm font-medium uppercase tracking-[0.26em]";

export function WhyKimora({
  tone = "cream",
  id,
  anchor,
}: {
  tone?: Tone;
  /** The nav's "About" target. Pass on whichever page owns that link. */
  id?: string;
  anchor?: string;
}) {
  return (
    <Band tone={tone} id={id} anchor={anchor}>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <p className={cn(EYEBROW, eyebrowOn(tone))}>Why Kimora exists</p>

          <h2
            className={cn(
              "mt-4 text-3xl font-display font-extrabold uppercase leading-[1.05] tracking-wide sm:text-4xl",
              headOn(tone)
            )}
          >
            Consistency wins.
          </h2>

          <p className={cn("mt-6 leading-8", bodyOn(tone))}>
            You do not get stronger from one lift. You do not get better from one
            roll. And you do not get results from taking creatine only when you
            remember.
          </p>

          <p
            className={cn(
              "mt-4 leading-8",
              tone === "ink" ? "text-[rgba(247,240,222,0.80)]" : "text-foreground/80"
            )}
          >
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
          <p className={cn(EYEBROW, eyebrowOn(tone))}>Built for combat sports</p>

          <h2
            className={cn(
              "mt-4 text-3xl font-display font-extrabold uppercase leading-[1.05] tracking-wide sm:text-4xl",
              headOn(tone)
            )}
          >
            Made for the mat, not the supplement aisle.
          </h2>

          <p className={cn("mt-6 leading-8", bodyOn(tone))}>
            Combat sports athletes train differently — the rounds are long, the
            cuts are real, and the recovery window between sessions is short.
            Kimora is built for that reality: a stick that survives a gym bag and
            works mid-session, not a tub that sits on a counter. For the people
            who roll, spar, drill, cut, and compete.
          </p>

          <p
            className={cn(
              "mt-6 text-sm font-medium uppercase tracking-[0.22em]",
              tone === "ink" ? "text-[rgba(247,240,222,0.70)]" : "text-foreground/70"
            )}
          >
            BJJ · MMA · Muay Thai · Boxing · Grappling · Serious Lifters
          </p>
        </motion.div>
      </div>
    </Band>
  );
}
