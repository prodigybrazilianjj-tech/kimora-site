import { motion } from "framer-motion";
import { Band, SectionHead, EASE, bodyOn, type Tone } from "./Band";
import { cn } from "@/lib/utils";

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

export function FutureProducts({
  tone = "cream",
  footnote = "Rash guards, shorts, and training gear are in development. Join the waitlist above and you'll hear first.",
}: {
  tone?: Tone;
  /** The closing line changes with the page's call to action. */
  footnote?: string;
}) {
  return (
    <Band tone={tone}>
      <SectionHead
        tone={tone}
        eyebrow="What we're building"
        title="More than a supplement."
        lead="Kimora starts with the stick — but it's becoming a full system for the people who live on the mats. Gear engineered the same way the fuel is: honest, tested, built for live rounds. Here's what's next."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile, i) => (
          <motion.div
            key={tile.name}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: EASE, delay: i * 0.1 }}
            className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-surface-ink"
          >
            <div className="absolute inset-0" style={{ background: tile.glow }} />
            <img
              src={tile.img}
              alt={tile.name}
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
              className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.04]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute right-4 top-4 rounded-full border border-accent/40 bg-background px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
              Coming Soon
            </div>
            {/* The tile is dark whatever the band is, so its label is cream. */}
            <div className="absolute inset-x-0 bottom-0 p-6">
              <span className="text-[11px] uppercase tracking-[0.2em] text-[rgba(247,240,222,0.72)]">
                {tile.cat}
              </span>
              <h3 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide text-[#F7F0DE]">
                {tile.name}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      <p className={cn("mt-8 text-sm", bodyOn(tone))}>{footnote}</p>
    </Band>
  );
}
