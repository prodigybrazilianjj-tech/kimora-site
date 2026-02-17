import { Check } from "lucide-react";

export function Comparison() {
  return (
    <>
      {/* OFFSET ANCHOR FOR NAVBAR HASH LINK */}
      <div id="comparison-anchor" className="h-[140px] md:h-[160px]" />

      <section id="comparison" className="py-24 bg-background">
        <div className="container px-4 mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          
          {/* LEFT SIDE TEXT */}
          <div>
            <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-6 leading-[0.9]">
              WHY NOT JUST A HUGE TUB OF PLAIN CREATINE?
            </h2>

            <p className="text-lg text-muted-foreground mb-8">
              Most people buy a tub, take it a few weeks, then fall off. Kimora is
              built to be the opposite: single-serve sticks that taste good,
              travel easily, and pair creatine with electrolytes so you actually
              look forward to taking it.
            </p>

            <ul className="space-y-4">
              {[
                "Single-serve sticks you can throw in your bag",
                "No scoops · no clumps · no guesswork",
                "Creatine + electrolytes in one daily habit",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* RIGHT SIDE IMAGE */}
          <div className="relative">
  <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
    <img
      src="/assets/products/tub-vs-sticks.png"
      alt="Creatine tub vs Kimora sticks comparison"
      className="w-full h-full object-cover"
      loading="lazy"
    />
  </div>
</div>


        </div>
      </section>
    </>
  );
}
