import { Band, SectionHead, SurfaceCard, bodyOn, headOn, type Tone } from "./Band";
import { cn } from "@/lib/utils";

/**
 * What's in the stick and what isn't. The exact milligrams live in StatsBand
 * directly above, so this section is the qualitative half — the panel, the
 * sweeteners, and the list of things deliberately left out.
 */

const IN = [
  "5g creatine monohydrate (200 mesh — no underdose)",
  "A real electrolyte panel — sodium, potassium, magnesium",
  "Naturally sweetened with stevia and monk fruit",
  "Acid flavor system — citric, malic, ascorbic",
];

const OUT = [
  "No silicon dioxide",
  "No artificial colors",
  "No sugar, no sucralose, no sugar alcohols",
  "No proprietary blends, no hidden doses",
];

export function Formula({
  tone = "ink",
  anchor,
}: {
  tone?: Tone;
  /** Pass "formula-anchor" on pages with a sticky navbar. */
  anchor?: string;
}) {
  return (
    <Band tone={tone} id="formula" anchor={anchor}>
      <SectionHead
        tone={tone}
        eyebrow="The formula"
        title="What's in it. What's not."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SurfaceCard tone={tone} className="p-8">
          <h3 className={cn("text-xl font-display font-bold", headOn(tone))}>
            In every stick
          </h3>
          <ul className={cn("mt-5 space-y-3 leading-7", bodyOn(tone))}>
            {IN.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </SurfaceCard>

        <SurfaceCard tone={tone} className="p-8" delay={0.1}>
          <h3 className={cn("text-xl font-display font-bold", headOn(tone))}>
            What we left out
          </h3>
          <ul className={cn("mt-5 space-y-3 leading-7", bodyOn(tone))}>
            {OUT.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </SurfaceCard>
      </div>

      <p className={cn("mt-8 max-w-3xl leading-8", bodyOn(tone))}>
        One formula behind all three flavors. Same dose, different profiles. Mix
        one stick into 12–20 oz of water and drink once daily.
      </p>
    </Band>
  );
}
