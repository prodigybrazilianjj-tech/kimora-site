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

export function Testimonials() {
  return (
    <section className="py-24 bg-card/30 border-t border-white/5">
      <div className="container px-4 mx-auto max-w-6xl">
        <div className="text-center mb-14">
          <p className="text-sm font-medium uppercase tracking-[0.26em] text-primary mb-4">
            From the community
          </p>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white">
            Real athletes. Real consistency.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-white/8 bg-white/[0.03] p-7 flex flex-col gap-5"
            >
              {/* Stars */}
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className="w-4 h-4 fill-primary"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 1l2.39 4.84 5.34.78-3.86 3.76.91 5.32L10 13.27l-4.78 2.51.91-5.32L2.27 6.62l5.34-.78z" />
                  </svg>
                ))}
              </div>

              <p className="text-white/80 leading-relaxed text-sm flex-1">
                "{t.quote}"
              </p>

              <div>
                <p className="text-white font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-white/25 mt-10 tracking-wide">
          Early access community · Testimonials are from beta users
        </p>
      </div>
    </section>
  );
}
