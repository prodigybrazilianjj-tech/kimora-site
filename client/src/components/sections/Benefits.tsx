import { Brain, Zap, Dumbbell } from "lucide-react";
import { Band, SectionHead, SurfaceCard, bodyOn, headOn, type Tone } from "./Band";
import { cn } from "@/lib/utils";

/**
 * What creatine + electrolytes actually do. Homepage-only — the pre-launch page
 * makes the case through the formula section instead — but it runs on the same
 * Band/SectionHead recipe so it reads as one system with everything around it.
 */

const BENEFITS = [
  {
    title: "Cognition",
    icon: Brain,
    desc: "Supports brain energy metabolism and sharp decision-making under pressure.",
  },
  {
    title: "Recovery",
    icon: Zap,
    desc: "Creatine + electrolytes help restore energy and hydration so you bounce back between sessions.",
  },
  {
    title: "Strength",
    icon: Dumbbell,
    desc: "Fuels higher training volume for heavier lifts, harder rolls, and longer rounds.",
  },
];

export function Benefits({ tone = "sand" }: { tone?: Tone }) {
  const ink = tone === "ink";

  return (
    <Band tone={tone}>
      <SectionHead
        tone={tone}
        eyebrow="Why it works"
        title="Stronger in the body. Sharper in the mind."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {BENEFITS.map((benefit, i) => (
          <SurfaceCard
            key={benefit.title}
            tone={tone}
            delay={i * 0.1}
            className="flex flex-col items-center p-8 text-center"
          >
            <div
              className={cn(
                "mb-6 flex h-16 w-16 items-center justify-center rounded-full",
                ink
                  ? "bg-[rgba(247,240,222,0.08)] text-primary"
                  : "bg-primary/10 text-primary-strong"
              )}
            >
              <benefit.icon className="h-8 w-8" />
            </div>
            <h3
              className={cn(
                "mb-3 text-2xl font-display font-bold",
                headOn(tone)
              )}
            >
              {benefit.title}
            </h3>
            <p className={cn("leading-7", bodyOn(tone))}>{benefit.desc}</p>
          </SurfaceCard>
        ))}
      </div>
    </Band>
  );
}
