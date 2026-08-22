import { Link } from "wouter";
import { motion } from "framer-motion";
import { Band, SectionHead, EASE, bodyOn, headOn, type Tone } from "./Band";
import { FLAVORS, isFlavorAvailable } from "@/lib/product";
import { INK_CARD, LIGHT_CARD } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

/**
 * The three flavors, as equal cards.
 *
 * `mode` is the only difference between the pre-launch page and the homepage:
 * before launch every card reads "Coming Soon" and shows no price, because
 * nothing is buyable and a price with no checkout is just friction. After
 * launch the card carries the price and links through to the product page,
 * and availability comes from AVAILABLE_FLAVORS rather than being restated.
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
          const available = launched && isFlavorAvailable(flavor.slug);
          const badge = launched
            ? available
              ? "Launch Flavor"
              : "Coming Soon"
            : "Coming Soon";

          const card = (
            <>
              {/* Product well — the flavor's colour at low alpha. */}
              <div
                className="relative aspect-[4/5] overflow-hidden"
                style={{ backgroundColor: flavor.well }}
              >
                {/* Opaque, not a tint: a translucent pill washes out against
                    the packaging behind it. */}
                <span
                  className={cn(
                    "absolute left-4 top-4 z-[5] rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]",
                    available
                      ? "border border-primary/50 bg-background text-primary-strong"
                      : "border border-accent/40 bg-background text-accent"
                  )}
                >
                  {badge}
                </span>
                <motion.img
                  src={flavor.image}
                  alt={flavor.name}
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="absolute inset-0 z-[1] h-full w-full object-cover"
                  style={{ willChange: "transform" }}
                />
              </div>

              <div
                className={cn(
                  "border-t p-6 text-center",
                  ink ? "border-[rgba(247,240,222,0.16)]" : "border-border"
                )}
              >
                <h3
                  className={cn(
                    "text-2xl font-display font-bold",
                    headOn(tone)
                  )}
                >
                  {flavor.name}
                </h3>
                <p className={cn("mt-3 text-sm leading-7", bodyOn(tone))}>
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
