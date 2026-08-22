import { motion } from "framer-motion";
import { Band, SectionHead, SurfaceCard, EASE, bodyOn, headOn, type Tone } from "./Band";
import { INK_CARD, LIGHT_CARD } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

/**
 * The format argument — why a single-serve stick beats a tub.
 *
 * This replaced two versions of the same case: the pre-launch page made it with
 * a pouch shot and three cards, the homepage with a checklist and a tub-vs-
 * sticks photo. The three checklist lines and the three cards turned out to be
 * the same three points, so the cards won and the checklist retired.
 */

const POINTS = [
  {
    title: "Packs flat",
    body: "A stick slides into a shorts pocket. The tub and the scoop stay home.",
  },
  {
    title: "One stick, one day",
    body: "No measuring, no guessing the dose. Tear, mix, drink.",
  },
  {
    title: "Survives the gym",
    body: "A matte laminate pack built to take a beating in your bag.",
  },
];

export function WhyNotATub({
  tone = "ink",
  anchor,
  image = "/assets/products/strawberry-guava/pouch_sticks_studio.webp",
  imageAlt = "Kimora Strawberry Guava pouch with its single-serve creatine + electrolyte sticks",
}: {
  tone?: Tone;
  /** Pass "comparison-anchor" on pages with a sticky navbar. */
  anchor?: string;
  /** Swap in /assets/products/tub-vs-sticks.webp to show the contrast directly. */
  image?: string;
  imageAlt?: string;
}) {
  const ink = tone === "ink";

  return (
    <Band tone={tone} id="comparison" anchor={anchor}>
      <SectionHead
        tone={tone}
        eyebrow="The format"
        title="Why a stick, not a tub."
      />

      <motion.figure
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7, ease: EASE }}
        className={cn("mb-10 overflow-hidden", ink ? INK_CARD : LIGHT_CARD)}
      >
        <img
          src={image}
          alt={imageAlt}
          loading="lazy"
          className="mx-auto block h-auto w-full max-w-[760px] object-contain"
        />
      </motion.figure>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {POINTS.map((item, i) => (
          <SurfaceCard key={item.title} tone={tone} className="p-8" delay={i * 0.1}>
            <h3 className={cn("text-xl font-display font-bold", headOn(tone))}>
              {item.title}
            </h3>
            <p className={cn("mt-3 leading-7", bodyOn(tone))}>{item.body}</p>
          </SurfaceCard>
        ))}
      </div>
    </Band>
  );
}
