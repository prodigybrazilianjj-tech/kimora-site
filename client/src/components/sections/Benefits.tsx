import { Brain, Zap, Dumbbell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const benefits = [
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

export function Benefits() {
  return (
    <section className="py-12 md:py-16 bg-secondary/20">
      <div className="container px-4 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {benefits.map((benefit, index) => (
            <Card key={benefit.title} className="bg-card border-white/5">
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary">
                  <benefit.icon className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-display font-bold text-white mb-4">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {benefit.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
