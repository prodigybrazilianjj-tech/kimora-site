import { motion } from "framer-motion";
import { EASE } from "./Band";
import { INK, INK_HEAD } from "@/lib/surfaces";

/**
 * The brand line, on its own ink band. Deliberately not a Band + SectionHead —
 * it has no eyebrow and no heading hierarchy, it is one sentence given room.
 */
export function Manifesto() {
  return (
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
  );
}
