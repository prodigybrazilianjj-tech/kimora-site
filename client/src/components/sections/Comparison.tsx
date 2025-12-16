import { Check } from "lucide-react";

export function Comparison() {
  return (
    <section id="comparison" className="py-24 bg-background">
      <div className="container px-4 mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-6 leading-[0.9]">
            WHY NOT JUST A HUGE TUB OF PLAIN CREATINE?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Most people buy a tub, take it a few weeks, then fall off. Kimora is built to be the opposite: single-serve sticks that taste good, travel easily, and pair creatine with electrolytes so you actually look forward to taking it.
          </p>
          
          <ul className="space-y-4">
            {[
              "Single-serve sticks you can throw in your bag",
              "No scoops · no clumps · no guesswork",
              "Creatine + electrolytes in one daily habit"
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
        
        <div className="relative">
          {/* Abstract visual for comparison - maybe a stylized tub vs stick graphic or just a clean layout */}
          <div className="aspect-square rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-12">
             {/* Placeholder for a visual comparison graphic if we had one, for now text art */}
             <div className="text-center space-y-8 opacity-50">
                <div className="text-8xl">🥡 vs 🥢</div>
                <p className="font-display text-2xl tracking-widest">OLD SCHOOL vs NEW STANDARD</p>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
