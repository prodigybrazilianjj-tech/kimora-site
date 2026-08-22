import { Link } from "wouter";
import { motion } from "framer-motion";
import { Band, SectionHead, EASE, bodyOn, headOn, type Tone } from "./Band";
import {
  FLAVORS,
  isFlavorAvailable,
  STICKS_PER_POUCH,
  perStickPrice,
} from "@/lib/product";
import { INK_CARD } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

/** Flat colour from the flavour hex, for the well behind the product shot. */
function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/**
 * The card sits one step lighter than its band. On sand that is cream, which
 * is what the mockup shows; on a cream band cream would vanish, so it takes
 * the raised card surface instead.
 */
const CARD_FILL: Record<Tone, string> = {
  ink: INK_CARD,
  cream: "rounded-xl border border-border bg-card",
  sand: "rounded-xl border border-border bg-background",
};

/**
 * The three flavors, as equal cards.
 *
 * The badge follows AVAILABLE_FLAVORS, not the launch state — the launch flavor
 * is worth calling out before the store opens too, which is how the mockup
 * shows it.
 *
 * Price, pack size and the link to the product page show in BOTH modes. Hiding
 * them pre-launch meant the waitlist pitched 15% off a number nobody had seen,
 * off a pouch whose size nobody knew — the discount read as a trick. The gate
 * already handles the rest: Shop and Product render the price and swap the buy
 * button for Notify Me, so the path never dead-ends. `mode` now only sets the
 * wording of the link out to the shop.
 *
 * The product well is its own panel — a flat wash of the flavour's colour with
 * a glow behind the pouch, ending on a hard edge where the card body starts.
 * It used to fade into the card, which read as one white box with a coloured
 * haze over it rather than two distinct parts.
 *
 * The photo sits inset rather than bleeding edge to edge: the studio shots
 * carry their own backdrop, which fought with the tint instead of sitting in
 * it.
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
        lead="Same 5g dose in every stick. The only thing that changes is how it tastes."
      />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {FLAVORS.map((flavor, i) => {
          const available = isFlavorAvailable(flavor.slug);

          const card = (
            <>
              <div
                className="relative px-6 pb-6 pt-6"
                style={{
                  backgroundColor: rgba(flavor.hex, 0.10),
                  backgroundImage: `radial-gradient(78% 58% at 50% 46%, ${rgba(
                    flavor.hex,
                    0.3
                  )} 0%, rgba(0,0,0,0) 72%)`,
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

              <div className="px-6 pb-7 pt-5">
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

                <p
                  className={cn(
                    "mt-4 font-display text-lg font-bold",
                    headOn(tone)
                  )}
                >
                  ${flavor.priceOneTime.toFixed(2)}
                  <span className={cn("ml-2 text-xs font-medium", bodyOn(tone))}>
                    · {STICKS_PER_POUCH} sticks · ${perStickPrice(flavor.priceOneTime)} each
                  </span>
                </p>

                <p className={cn("mt-1.5 text-xs leading-6", bodyOn(tone))}>
                  ${flavor.priceSub.toFixed(2)} on subscription · $
                  {perStickPrice(flavor.priceSub)} each
                </p>

              </div>
            </>
          );

          const shell = cn(
            "overflow-hidden transition-colors duration-300",
            CARD_FILL[tone],
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
              className={available ? undefined : shell}
              style={{ willChange: "transform" }}
            >
              {available ? (
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

      <div className="mt-10 text-center">
        <Link
          href="/shop"
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] transition-colors duration-200",
            ink
              ? "border-[rgba(247,240,222,0.28)] text-[#F7F0DE] hover:bg-[rgba(247,240,222,0.08)]"
              : "border-foreground/20 text-foreground hover:bg-foreground/5"
          )}
        >
          {launched ? "Shop all flavors" : "See the full lineup"}
          <span aria-hidden="true">→</span>
        </Link>

        <p className={cn("mt-3 text-xs", bodyOn(tone))}>
          One pouch is a month of daily dosing. Cancel or skip a subscription
          anytime.
        </p>
      </div>
    </Band>
  );
}
