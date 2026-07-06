/**
 * Spec marquee — scrolling brand/spec strip between Hero and the lineup.
 * Pure CSS animation (keyframes in index.css); pauses on hover and
 * respects prefers-reduced-motion.
 */

const ITEMS = [
  "5g Creatine",
  "750mg Sodium",
  "Zero Sugar",
  "Single-Serve Sticks",
  "Made for the Mats",
  "No Fillers",
];

function Lane() {
  return (
    <>
      {ITEMS.map((item) => (
        <span key={item} className="flex items-center gap-12 shrink-0">
          <span>{item}</span>
          <span className="text-primary/80" aria-hidden="true">
            ◆
          </span>
        </span>
      ))}
    </>
  );
}

export function Marquee() {
  return (
    <div
      className="overflow-hidden bg-foreground text-background border-y-[3px] border-primary py-3.5 group"
      aria-hidden="true"
    >
      <div className="flex w-max gap-12 whitespace-nowrap font-display font-bold text-sm md:text-base tracking-[0.22em] uppercase animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        <Lane />
        <Lane />
      </div>
    </div>
  );
}
