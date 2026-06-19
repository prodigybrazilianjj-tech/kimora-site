export function About() {
  return (
    <>
      {/* ✅ OFFSET ANCHOR */}
      <div id="about-anchor" className="h-[140px] md:h-[160px]" />

      <section id="about" className="py-24 bg-secondary/10 border-y border-foreground/5">
        <div className="container px-4 mx-auto max-w-5xl">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">

            {/* Left: Founder story */}
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.26em] text-primary mb-5">
                Why Kimora exists
              </p>

              <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-8 leading-[0.95]">
                BUILT ON THE MATS.
              </h2>

              <div className="space-y-5 text-muted-foreground leading-relaxed">
                <p>
                  I've been training jiu-jitsu since 2020. I have a degree in
                  biochemistry. And I spent years watching people in the gym
                  overlook one of the most well-researched supplements in
                  existence — not because they didn't care, but because every
                  option on the market made it too easy to skip.
                </p>
                <p>
                  Plain creatine out of a tub. Chalky scoops. Gummies that
                  tasted like a multivitamin. Nothing that actually made you
                  want to take it every single day.
                </p>
                <p>
                  Kimora is what I wanted to exist: a single-serve stick that
                  pairs 5g of creatine with real electrolytes, tastes good
                  enough that you look forward to it, and fits in your gym bag
                  without a second thought.
                </p>
                <p className="text-foreground/80">
                  The name is a nod to the kimura — a submission that rewards
                  patience, leverage, and persistence. That's the philosophy
                  here too. Show up every day. The results compound.
                </p>
              </div>
            </div>

            {/* Right: Values / pillars */}
            <div className="space-y-6 md:pt-16">
              {[
                {
                  label: "Consistency over intensity",
                  body: "You don't get better from one roll. Creatine doesn't work from one dose. Both require daily commitment — Kimora is designed to make that easier.",
                },
                {
                  label: "Formulated with intent",
                  body: "Every ingredient has a reason to be there. Nothing is in the formula to fill space or cut cost. Micronized creatine, real electrolytes, naturally sweetened. That's it.",
                },
                {
                  label: "Built for this community",
                  body: "Not a mass-market supplement dressed up for combat sports. Kimora was built by someone on the mats, for people on the mats — and everyone else who trains with that same level of intention.",
                },
              ].map((item) => (
                <div key={item.label} className="border-l-2 border-primary/40 pl-5">
                  <p className="text-foreground font-semibold mb-1">{item.label}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>
    </>
  );
}
