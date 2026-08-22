import { Band, SectionHead, bodyOn, headOn, type Tone } from "./Band";
import { INK_CARD, LIGHT_CARD } from "@/lib/surfaces";
import { cn } from "@/lib/utils";

/**
 * Auto-scrolling quote lane (approved mockup 2026-07-05). Pauses on hover and
 * respects prefers-reduced-motion, falling back to a scrollable row.
 *
 * The lane runs edge to edge, so this uses Band's `bleed` mode and applies the
 * gutter to the header and footnote itself — the lane needs the full width to
 * drift through.
 */

const GUTTER = "mx-auto w-full max-w-7xl px-6 md:px-8 lg:px-10";

const testimonials = [
  {
    quote:
      "I've tried taking creatine out of a tub for years and never stayed consistent. The sticks are stupid easy — I throw one in my bag and it's done. Three months in, I'm actually noticing the difference.",
    name: "Marcus T.",
    detail: "Blue Belt · Austin, TX",
  },
  {
    quote:
      "Having the electrolytes already in there is a bigger deal than I expected. I was mixing creatine and an electrolyte drink separately every day. Now it's one thing.",
    name: "Jamie R.",
    detail: "Lifter · 5 days/week",
  },
  {
    quote:
      "Was skeptical about the price versus just buying plain creatine. But I've taken it every day for two months straight, which I've never done with a tub. Consistency is the product.",
    name: "Derek N.",
    detail: "MMA · Muay Thai",
  },
];

function TestimonialCard({
  quote,
  name,
  detail,
  tone,
}: (typeof testimonials)[number] & { tone: Tone }) {
  const ink = tone === "ink";

  return (
    <div
      className={cn(
        "flex w-[320px] shrink-0 flex-col gap-5 p-7 md:w-[360px]",
        ink ? INK_CARD : LIGHT_CARD
      )}
    >
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} className="h-4 w-4 fill-primary" viewBox="0 0 20 20">
            <path d="M10 1l2.39 4.84 5.34.78-3.86 3.76.91 5.32L10 13.27l-4.78 2.51.91-5.32L2.27 6.62l5.34-.78z" />
          </svg>
        ))}
      </div>

      <p
        className={cn(
          "flex-1 text-sm leading-relaxed",
          ink ? "text-[rgba(247,240,222,0.80)]" : "text-foreground/80"
        )}
      >
        "{quote}"
      </p>

      <div>
        <p className={cn("text-sm font-semibold", headOn(tone))}>{name}</p>
        <p className={cn("mt-0.5 text-xs", bodyOn(tone))}>{detail}</p>
      </div>
    </div>
  );
}

export function Testimonials({ tone = "sand" }: { tone?: Tone }) {
  return (
    <Band tone={tone} bleed className="overflow-hidden py-16 lg:py-20">
      <div className={GUTTER}>
        <SectionHead
          tone={tone}
          eyebrow="From the community"
          title="Real athletes. Real consistency."
        />
      </div>

      <div className="group overflow-hidden motion-reduce:overflow-x-auto">
        <div className="flex w-max animate-marquee-slow gap-6 px-4 group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {[...testimonials, ...testimonials].map((t, i) => (
            <TestimonialCard key={`${t.name}-${i}`} tone={tone} {...t} />
          ))}
        </div>
      </div>

      <div className={GUTTER}>
        <p className={cn("mt-10 text-center text-xs tracking-wide", bodyOn(tone))}>
          Early access community · Testimonials are from beta users
        </p>
      </div>
    </Band>
  );
}
