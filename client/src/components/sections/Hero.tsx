import { motion, useReducedMotion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { HeroShell } from "./HeroShell";
import { HEADER_CLEARANCE } from "./SiteHeader";
import { EASE } from "./Band";
import { INK_BODY, INK_HEAD } from "@/lib/surfaces";

/**
 * Homepage hero. Same backdrop and type as the pre-launch page — the only
 * difference is the call to action, which buys instead of joining a waitlist.
 *
 * The extra top padding clears the fixed header, which the pre-launch page
 * does not need because its header is sticky and sits in flow.
 */

const HEADLINE = ["TRAIN WITH", "PURPOSE."];

export function Hero() {
  const prefersReducedMotion = useReducedMotion();

  const goToFormula = () => {
    const el = document.querySelector("#formula");
    if (el instanceof HTMLElement) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <HeroShell innerClassName={HEADER_CLEARANCE}>
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
        className="inline-block bg-gradient-to-r from-[#C9A86A] via-[#E3C88E] to-[#D8AE5A] bg-clip-text text-sm font-semibold uppercase tracking-[0.30em] text-transparent"
      >
        Creatine · Electrolytes · Daily
      </motion.p>

      <h1
        className={`mt-5 text-5xl font-display font-extrabold uppercase leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl ${INK_HEAD}`}
      >
        {HEADLINE.map((line, i) => (
          <motion.span
            key={line}
            className="block"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: EASE, delay: 0.22 + i * 0.13 }}
          >
            {line}
          </motion.span>
        ))}
      </h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
        className={`mt-8 max-w-md text-base leading-relaxed md:text-lg ${INK_BODY}`}
      >
        5g creatine + full electrolytes in one single-serve stick. Built for the
        mats — BJJ, MMA, and the lifters who back it up.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.62 }}
        className="mt-9 flex flex-wrap items-center gap-4"
      >
        <Button
          asChild
          size="lg"
          className="h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-base font-bold uppercase tracking-wider shadow-[0_8px_24px_hsl(var(--primary)/0.35)] hover:shadow-[0_14px_32px_hsl(var(--primary)/0.45)] hover:-translate-y-0.5 transition-all duration-300"
        >
          <Link href="/shop">
            Shop Strawberry Guava <ChevronRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={goToFormula}
          className="h-14 px-8 border-accent text-surface-ink-foreground hover:bg-accent/25 text-base font-bold uppercase tracking-wider"
        >
          See the Formula
        </Button>
      </motion.div>
    </HeroShell>
  );
}
