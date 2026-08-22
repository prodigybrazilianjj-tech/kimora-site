import { motion } from "framer-motion";
import { Band, SectionHead, EASE, bodyOn, type Tone } from "./Band";
import { cn } from "@/lib/utils";

/**
 * The founder story. Homepage-only, and the one section on the page written in
 * first person — it is the thing no competitor can copy, so it gets room to
 * breathe rather than being compressed into cards.
 *
 * The three value pillars that used to sit alongside it are gone: WhyKimora
 * makes the consistency and built-for-combat-sports arguments, and Quality
 * makes the formulated-with-intent one, so they were saying it twice.
 */

const STORY = [
  "I've been training jiu-jitsu since 2020. I have a degree in biochemistry. And I spent years watching people in the gym overlook one of the most well-researched supplements in existence — not because they didn't care, but because every option on the market made it too easy to skip.",
  "Plain creatine out of a tub. Chalky scoops. Gummies that tasted like a multivitamin. Nothing that actually made you want to take it every single day.",
  "Kimora is what I wanted to exist: a single-serve stick that pairs 5g of creatine with real electrolytes, tastes good enough that you look forward to it, and fits in your gym bag without a second thought.",
];

const CLOSER =
  "The name is a nod to the kimura — a submission that rewards patience, leverage, and persistence. That's the philosophy here too. Show up every day. The results compound.";

export function About({
  tone = "sand",
  anchor,
}: {
  tone?: Tone;
  /** Pass "about-anchor" on pages with a sticky navbar. */
  anchor?: string;
}) {
  return (
    <Band tone={tone} id="about" anchor={anchor}>
      <SectionHead
        tone={tone}
        eyebrow="The founder"
        title="Built on the mats."
      />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: EASE }}
        className="max-w-3xl"
      >
        <div className={cn("space-y-5 leading-8", bodyOn(tone))}>
          {STORY.map((para) => (
            <p key={para.slice(0, 32)}>{para}</p>
          ))}
        </div>

        <p
          className={cn(
            "mt-6 border-l-2 border-primary/50 pl-5 leading-8",
            tone === "ink" ? "text-[rgba(247,240,222,0.85)]" : "text-foreground/85"
          )}
        >
          {CLOSER}
        </p>
      </motion.div>
    </Band>
  );
}
