import { Separator } from "@/components/ui/separator";

export function Formula() {
  return (
    <section id="formula" className="py-24 bg-card/30">
      <div className="container px-4 mx-auto max-w-4xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
            What’s Inside Each Stick
          </h2>
          <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Every Kimora stick is built around 5 g of micronized creatine monohydrate and a balanced electrolyte blend, with a clean acid system and monk fruit for sweetness — no sugar, no stevia, and no artificial colors or fillers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 relative">
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-primary tracking-wider uppercase mb-8">Performance & Hydration</h3>
            <ul className="space-y-4">
              <li className="flex justify-between items-baseline border-b border-white/5 pb-2">
                <span className="text-white font-medium">5 g Creatine Monohydrate</span>
                <span className="text-sm text-muted-foreground">Strength & Power</span>
              </li>
              <li className="flex justify-between items-baseline border-b border-white/5 pb-2">
                <span className="text-white font-medium">~500 mg Sodium</span>
                <span className="text-sm text-muted-foreground">Hydration & Performance</span>
              </li>
              <li className="flex justify-between items-baseline border-b border-white/5 pb-2">
                <span className="text-white font-medium">250 mg Potassium</span>
                <span className="text-sm text-muted-foreground">Muscle Function</span>
              </li>
              <li className="flex justify-between items-baseline border-b border-white/5 pb-2">
                <span className="text-white font-medium">60 mg Magnesium</span>
                <span className="text-sm text-muted-foreground">Recovery Support</span>
              </li>
            </ul>
          </div>

          {/* Vertical Divider for Desktop */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-white/10 -translate-x-1/2" />

          <div className="space-y-6">
            <h3 className="text-xl font-bold text-primary tracking-wider uppercase mb-8">Clean, Daily Formula</h3>
            <ul className="space-y-4">
              <li className="flex justify-between items-baseline border-b border-white/5 pb-2">
                <span className="text-white font-medium">Monk Fruit Only</span>
                <span className="text-sm text-muted-foreground">No Sugar / Alcohols</span>
              </li>
              <li className="flex justify-between items-baseline border-b border-white/5 pb-2">
                <span className="text-white font-medium">Acid Flavor System</span>
                <span className="text-sm text-muted-foreground">Citric · Malic · Ascorbic</span>
              </li>
              <li className="flex justify-between items-baseline border-b border-white/5 pb-2">
                <span className="text-white font-medium">Natural Flavors</span>
                <span className="text-sm text-muted-foreground">Nothing Artificial</span>
              </li>
              <li className="flex justify-between items-baseline border-b border-white/5 pb-2">
                <span className="text-white font-medium">Rice Hull Flow Agent</span>
                <span className="text-sm text-muted-foreground">No Silicon Dioxide</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center gap-2 text-sm text-muted-foreground uppercase tracking-widest text-center">
          <p>No artificial colors, sweeteners, or fillers.</p>
          <p>Mix 1 stick into 12–20 oz of water and drink once daily.</p>
        </div>
      </div>
    </section>
  );
}
