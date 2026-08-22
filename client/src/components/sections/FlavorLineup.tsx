import { Link } from "wouter";
import { motion } from "framer-motion";
import { Band, SectionHead, EASE, bodyOn, headOn, type Tone } from "./Band";
import { FLAVORS, isFlavorAvailable } from "@/lib/product";
import { INK_CARD, LIGHT_CARD } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

/**
 * The three flavors, as equal cards.
 *
 * The badge follows AVAILABLE_FLAVORS, not the launch state — the launch flavor
 * is worth calling out before the store opens too, which is how the mockup
 * shows it. `mode` only decides whether a price and a link to the product page
 * appear, since a price with no checkout behind it is just friction.
 *
 * The product well is a wash of the flavour's colour fading down into the card
 * rather than a flat block, and the photo sits inset with its own margin — the
 * studio shots have their own backdrop, so bleeding them edge to edge fought
 * with the tint instead of sitting inside it.
 */

export function FlavorLineup({
  tone = "sand",
  mode = "prelaunch",
  anchor,
}: {
  tone?: Tone;
  mode?: "prelaunch" | "launch";
  /** Pass "flavors-anchor" on pages with a sticky navbar. */
  anchor?: string;
}) {
  const ink = tone === "ink";
  const launched = mode === "launch";

  return (
    <Band tone={tone} id="flavors" anchor={anchor}>
      <SectionHead
        tone={tone}
        eyebrow="Flavor lineup"
        title="Three flavors. One system."
        lead="Designed to feel premium, clean, and actually enjoyable to take every day."
      />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {FLAVORS.map((flavor, i) => {
          const available = isFlavorAvailable(flavor.slug);

          const card = (
            <>
              <div
                className="relative px-6 pb-2 pt-6"
                style={{
                  backgroundImage: `linear-gradient(180deg, ${flavor.well} 0%, rgba(0,0,0,0) 88%)`,
                }}
              >
                {/* Opaque, not a tint: a translucent pill washes out against
                    the packaging behind it. */}
                <span
                  className={cn(
                    "absolute left-5 top-5 z-[5] rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]",
                    available
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-foreground/80 ring-1 ring-border"
                  )}
                >
                  {available ? "Launch Flavor" : "Coming Soon"}
                </span>

                <motion.img
                  src={flavor.image}
                  alt={flavor.name}
                  loading="lazy"
                  whileHover={{ scale: 1.04 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="relative z-[1] mx-auto block h-auto w-full max-w-[280px] object-contain"
                  style={{ willChange: "transform" }}
                />
              </div>

              <div className="px-6 pb-7 pt-3">
                <span
                  aria-hidden="true"
                  className="mb-3 block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: flavor.hex }}
                />

                <h3
                  className={cn("text-xl font-display font-bold", headOn(tone))}
                >
                  {flavor.name}
                </h3>

                <p className={cn("mt-2 text-sm leading-7", bodyOn(tone))}>
                  {flavor.desc}
                </p>

                {launched ? (
                  <p
                    className={cn(
                      "mt-4 font-display text-lg font-bold",
                      headOn(tone)
                    )}
                  >
                    ${flavor.priceOneTime.toFixed(2)}
                    <span className={cn("ml-2 text-xs font-medium", bodyOn(tone))}>
                      ${flavor.priceSub.toFixed(2)} on subscription
                    </span>
                  </p>
                ) : null}
              </div>
            </>
          );

          const shell = cn(
            "overflow-hidden transition-colors duration-300",
            ink ? INK_CARD : LIGHT_CARD,
            ink ? "hover:border-[rgba(247,240,222,0.28)]" : "hover:border-foreground/15"
          );

          return (
            <motion.article
              key={flavor.slug}
              initial={{ opacity: 0, y: 44 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.65, ease: EASE, delay: i * 0.12 }}
              whileHover={{ y: -10, transition: { duration: 0.25, ease: EASE } }}
              className={launched ? undefined : shell}
              style={{ willChange: "transform" }}
            >
              {launched ? (
                <Link
                  href={`/product?flavor=${flavor.slug}`}
                  className={cn(
                    shell,
                    "block focus:outline-none focus:ring-2 focus:ring-primary/60"
                  )}
                  aria-label={`View ${flavor.name}`}
                >
                  {card}
                </Link>
              ) : (
                card
              )}
            </motion.article>
          );
        })}
      </div>
    </Band>
  );
}
