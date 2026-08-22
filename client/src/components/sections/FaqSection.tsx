import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Band, SectionHead, EASE, type Tone } from "./Band";
import { INK_CARD, LIGHT_CARD, INK_BODY, INK_HEAD } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

/**
 * Shared FAQ block. Two of the questions only make sense before launch, so the
 * list is split rather than duplicated per page — `mode` picks which set runs.
 */

type Item = { q: string; a: string };

/** True whether or not the store is open. */
const CORE: Item[] = [
  {
    q: "What's in a stick?",
    a: "5g creatine monohydrate, a real electrolyte panel (sodium, potassium, magnesium), naturally sweetened with stevia and monk fruit. No silicon dioxide, no artificial colors, no sugar alcohols.",
  },
  {
    q: "How do I know it's dosed right?",
    a: "Full transparency — 5g creatine monohydrate at label dose, a real electrolyte panel (sodium, potassium, magnesium), naturally sweetened. No proprietary blends, no hidden fillers. What's on the label is in the stick.",
  },
  {
    q: "How do I take it?",
    a: "One stick a day. Tear it open, mix into water, drink — after class or whenever fits your day.",
  },
  {
    q: "Who is it for?",
    a: "Combat sports athletes and serious lifters — BJJ, MMA, Muay Thai, boxing, grappling. Built for people who train daily.",
  },
];

/** Only while the waitlist is the call to action. */
const PRELAUNCH: Item[] = [
  {
    q: "When does Kimora launch?",
    a: "Soon — we're finishing final production. Join the waitlist and you'll get the buy link 24 hours before the public, plus 15% off your first order.",
  },
  {
    q: "What do I get for joining the waitlist?",
    a: "15% off your first order, a 24-hour early-access head start, and the formula details before anyone else. No spam.",
  },
];

/** Only once people can actually buy. */
const LAUNCH: Item[] = [
  {
    q: "Do I need to load creatine?",
    a: "No. Just take one 5 g stick daily and let your levels build over time.",
  },
];

export function FaqSection({
  tone = "sand",
  mode = "prelaunch",
  showAllLink = false,
}: {
  tone?: Tone;
  mode?: "prelaunch" | "launch";
  /** Adds the "View all FAQs" link through to the full page. */
  showAllLink?: boolean;
}) {
  const ink = tone === "ink";
  const items = mode === "prelaunch" ? [...PRELAUNCH, ...CORE] : [...CORE, ...LAUNCH];

  return (
    <Band tone={tone}>
      <SectionHead tone={tone} eyebrow="FAQ" title="Questions, answered." />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {items.map((item, i) => (
          <motion.div
            key={item.q}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, ease: EASE, delay: (i % 2) * 0.08 }}
            className={cn(ink ? INK_CARD : LIGHT_CARD, "p-7")}
          >
            <h3
              className={cn(
                "text-lg font-display font-bold",
                ink ? INK_HEAD : "text-foreground"
              )}
            >
              {item.q}
            </h3>
            <p
              className={cn(
                "mt-3 text-sm leading-7",
                ink ? INK_BODY : "text-muted-foreground"
              )}
            >
              {item.a}
            </p>
          </motion.div>
        ))}
      </div>

      {showAllLink ? (
        <Link
          href="/faq"
          className={cn(
            "mt-10 inline-flex items-center font-bold uppercase tracking-wider transition-colors",
            ink
              ? "text-primary hover:text-primary/80"
              : "text-primary-strong hover:text-primary-strong/80"
          )}
        >
          View all FAQs <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      ) : null}
    </Band>
  );
}
