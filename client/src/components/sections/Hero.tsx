import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

export function Hero() {
  const scrollToShop = () => {
    window.location.href = "/shop";
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background z-0" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 mix-blend-overlay" />
      
      <div className="container relative z-10 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-6"
        >
          <div className="inline-block border border-foreground/10 rounded-full px-4 py-1.5 bg-foreground/5 backdrop-blur-sm mb-4">
            <span className="text-xs font-medium tracking-[0.2em] text-primary uppercase">
              Creatine · Electrolytes · Daily
            </span>
          </div>

          <h1 className="font-wordmark text-7xl md:text-9xl font-bold tracking-[0.04em] text-foreground leading-[0.9]">
            KIM<span className="text-accent">O</span>RA
          </h1>

          <p className="text-xl md:text-3xl font-light tracking-widest text-foreground/80 uppercase">
            Grow Stronger. Think Sharper.
          </p>

          <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase pt-4">
            Built for BJJ · MMA · Muay Thai · Lifters
          </p>

          {/* Mobile-only floating stick — no background, gently floats.
              Desktop keeps the clean typographic hero. */}
          <motion.img
            src="/assets/products/strawberry-guava/stick_render.png"
            alt="Kimora single-serve creatine + electrolyte stick"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, ease: "easeInOut", repeat: Infinity }}
            className="md:hidden mx-auto w-full max-w-[440px] h-auto object-contain"
          />

          <div className="pt-8">
            <Button 
              size="lg" 
              onClick={scrollToShop}
              className="h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(168,72,31,0.35)] hover:shadow-[0_0_30px_rgba(168,72,31,0.55)] transition-all duration-300"
            >
              Shop Now <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Faint Vignette */}
      <div className="absolute inset-0 bg-background/30 pointer-events-none z-0 bg-[radial-gradient(circle_at_center,transparent_0%,var(--background)_100%)]" />
    </section>
  );
}
