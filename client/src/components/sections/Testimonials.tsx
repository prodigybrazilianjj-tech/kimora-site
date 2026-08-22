/**
 * Testimonials — auto-scrolling lane (approved mockup 2026-07-05).
 * Same beta-user quotes as before, now in a continuously drifting marquee
 * lane that pauses on hover. Respects prefers-reduced-motion (falls back to
 * a static row via motion-reduce:animate-none + overflow scroll).
 */

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
}: (typeof testimonials)[number]) {
  return (
    <div className="w-[320px] md:w-[360px] shrink-0 rounded-2xl border border-foreground/8 bg-card p-7 flex flex-col gap-5">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} className="w-4 h-4 fill-primary" viewBox="0 0 20 20">
            <path d="M10 1l2.39 4.84 5.34.78-3.86 3.76.91 5.32L10 13.27l-4.78 2.51.91-5.32L2.27 6.62l5.34-.78z" />
          </svg>
        ))}
      </div>
      <p className="text-foreground/80 leading-relaxed text-sm flex-1">
        "{quote}"
      </p>
      <div>
        <p className="text-foreground font-semibold text-sm">{name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="py-16 md:py-24 bg-secondary overflow-hidden">
      <div className="container px-4 mx-auto max-w-6xl">
        <div className="mb-10 md:mb-12">
          <p className="text-[11px] font-bold tracking-[0.28em] uppercase text-accent mb-3">
            From the Community
          </p>
          <h2 className="text-3xl md:text-4xl font-display font-extrabold uppercase text-foreground">
            Real Athletes. Real Consistency.
          </h2>
        </div>
      </div>

      <div className="group overflow-hidden motion-reduce:overflow-x-auto">
        <div className="flex w-max gap-6 px-4 animate-marquee-slow group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {[...testimonials, ...testimonials].map((t, i) => (
            <TestimonialCard key={`${t.name}-${i}`} {...t} />
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-10 tracking-wide">
        Early access community · Testimonials are from beta users
      </p>
    </section>
  );
}
