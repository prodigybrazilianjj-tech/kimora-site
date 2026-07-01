import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

// The brand ladder beyond the stick. These are teasers — no links, no prices,
// just signal that Kimora is becoming a full system for people on the mats.
const tiles = [
  {
    cat: "Apparel",
    name: "Rash Guards",
    img: "/assets/apparel/rashguard-teaser.webp",
    glow: "radial-gradient(110% 85% at 50% 22%, rgba(168,72,31,0.30), transparent 60%)",
  },
  {
    cat: "Apparel",
    name: "Grappling Shorts",
    img: "/assets/apparel/shorts-teaser-v2.webp",
    glow: "radial-gradient(110% 85% at 50% 22%, rgba(201,168,106,0.22), transparent 60%)",
  },
  {
    cat: "Train",
    name: "Training Gear",
    img: "/assets/apparel/training-bag-teaser-v3.webp",
    glow: "radial-gradient(110% 85% at 50% 22%, rgba(168,72,31,0.22), transparent 60%)",
  },
];

export function FutureProducts() {
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-8 lg:px-10 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-10 max-w-3xl"
        >
          <p className="text-sm font-medium uppercase tracking-[0.26em] text-primary">
            What we're building
          </p>
          <h2 className="mt-4 text-3xl font-display font-bold tracking-wide text-foreground sm:text-4xl">
            More than a supplement.
          </h2>
          <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">
            Kimora starts with the stick — but it's becoming a full system for
            the people who live on the mats. Gear engineered the same way the
            fuel is: honest, tested, built for live rounds. Here's what's next.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((tile, i) => (
            <motion.div
              key={tile.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: EASE, delay: i * 0.1 }}
              className="group relative aspect-[4/5] overflow-hidden rounded-[24px] border border-border bg-card"
            >
              <div className="absolute inset-0" style={{ background: tile.glow }} />
              <img
                src={tile.img}
                alt={tile.name}
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
              {/* Legibility scrim — only the bottom band darkens, so the product
                  stays bright while the white label below stays readable. */}
              <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute right-4 top-4 rounded-full border border-white/25 bg-black/45 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
                Coming Soon
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6">
                <span className="text-[11px] uppercase tracking-[0.2em] text-white/75">
                  {tile.cat}
                </span>
                <h3 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
                  {tile.name}
                </h3>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Rash guards, shorts, and training gear are in development. Join below
          and you'll hear first.
        </p>
      </div>
    </section>
  );
}
