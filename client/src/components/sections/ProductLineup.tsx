import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { isFlavorAvailable } from "@/lib/product";
import { Button } from "@/components/ui/button";

/**
 * Flavor Explorer — interactive replacement for the static 3-card lineup
 * (approved mockup 2026-07-05). One stage with crossfading pouch imagery and
 * a color halo; pills switch the active flavor. Keeps the #flavors anchor.
 */

const FLAVORS = [
  {
    name: "Strawberry Guava",
    slug: "strawberry-guava",
    desc: "Tart, tropical, and refreshingly smooth. The opening flavor — first on the mats.",
    image: "/assets/products/strawberry-guava/pouch_sticks_v1.webp",
    hex: "#D25843",
  },
  {
    name: "Lemon Lychee",
    slug: "lemon-lychee",
    desc: "Bright lemon meets sweet, floral lychee — crisp, juicy, and refreshing. Dropping after launch.",
    image: "/assets/products/lemon-lychee/pouch_sticks_v6.webp",
    hex: "#E5D14E",
  },
  {
    name: "Raspberry Dragonfruit",
    slug: "raspberry-dragonfruit",
    desc: "Bold, juicy, and perfectly balanced. Dropping after launch.",
    image: "/assets/products/raspberry-dragonfruit/pouch_sticks_v8.webp",
    hex: "#D62839", // brighter true red (was #C13B49, read as pink on cream)
  },
];

export function ProductLineup() {
  const [active, setActive] = useState(0);
  const flavor = FLAVORS[active];
  const available = isFlavorAvailable(flavor.slug);

  return (
    <section
      id="flavors"
      className="py-16 md:py-24 bg-background relative overflow-hidden scroll-mt-[92px] md:scroll-mt-[104px]"
    >
      <div className="container px-4 mx-auto">
        <div className="mb-8 md:mb-12">
          <p className="text-[11px] font-bold tracking-[0.28em] uppercase text-accent mb-3">
            The Lineup
          </p>
          <h2 className="text-4xl md:text-5xl font-display font-extrabold uppercase text-foreground">
            Pick Your Fuel.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          {/* Stage */}
          <div className="relative min-h-[380px] md:min-h-[480px] flex items-center justify-center">
            <div
              className="absolute w-2/3 aspect-square rounded-full blur-[60px] opacity-50 transition-colors duration-500"
              style={{ backgroundColor: flavor.hex }}
            />
            {FLAVORS.map((f, i) => (
              <img
                key={f.slug}
                src={f.image}
                alt={f.name}
                className={cn(
                  "absolute inset-0 m-auto max-h-[360px] md:max-h-[460px] max-w-full object-contain drop-shadow-[0_26px_34px_rgba(28,19,11,0.3)] transition-all duration-500 pointer-events-none",
                  i === active
                    ? "opacity-100 scale-100 translate-y-0"
                    : "opacity-0 scale-95 translate-y-3"
                )}
              />
            ))}
          </div>

          {/* Copy + controls */}
          <div>
            <div className="flex flex-wrap gap-2.5 mb-7">
              {FLAVORS.map((f, i) => (
                <button
                  key={f.slug}
                  onClick={() => setActive(i)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-all duration-300",
                    i === active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card hover:border-foreground/40"
                  )}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: f.hex }}
                  />
                  {f.name}
                </button>
              ))}
            </div>

            <motion.div
              key={flavor.slug}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <span
                className={cn(
                  "inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] mb-4",
                  available
                    ? "bg-primary/15 text-primary"
                    : "bg-foreground/5 text-muted-foreground"
                )}
              >
                {available ? "Launch Flavor" : "Coming Soon"}
              </span>

              <h3 className="text-3xl md:text-4xl font-display font-extrabold text-foreground mb-3">
                {flavor.name}
              </h3>
              <p className="text-muted-foreground leading-relaxed max-w-md mb-7">
                {flavor.desc}
              </p>

              <Button
                asChild
                size="lg"
                className={cn(
                  "h-14 px-8 font-bold uppercase tracking-wider",
                  available
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                )}
              >
                <a href={`/product?flavor=${flavor.slug}`}>
                  {available ? `View ${flavor.name}` : "Join the Waitlist"}
                </a>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
