import { useRef, type MouseEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { INK, INK_BODY } from "@/lib/surfaces";

/**
 * Hero — "dynamic refresh" build (approved mockup 2026-07-05):
 * - Kinetic word-by-word headline reveal (Gabarito 900)
 * - Real product hero photo (mat-side still life) as a floating editorial card
 *   with subtle mouse-parallax tilt on desktop
 * - Abner's octopus-vs-bear illustration ghosted full-bleed behind the section
 * - Pulsing eyebrow pill + dual CTA
 */

const HEADLINE_WORDS = ["Train", "With", "Purpose."];

export function Hero() {
  const prefersReducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLImageElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);

  const goToFormula = () => {
    const el = document.querySelector("#formula");
    if (el instanceof HTMLElement) el.scrollIntoView({ behavior: "smooth" });
  };

  function handleMouseMove(e: MouseEvent) {
    if (prefersReducedMotion) return;
    const section = sectionRef.current;
    const card = cardRef.current;
    if (!section || !card) return;
    const r = section.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `rotateY(${x * 7}deg) rotateX(${-y * 5}deg)`;
  }

  function handleMouseLeave() {
    const card = cardRef.current;
    if (card) card.style.transform = "";
  }

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative min-h-screen flex items-center overflow-hidden pt-24 pb-16 ${INK}`}
    >
      {/* Abner's octopus-vs-bear, full-bleed ghost watermark */}
      <img
        src="/assets/products/transparentlogo.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 m-auto w-[min(88vw,1000px)] max-h-[72%] object-contain opacity-[0.07] brightness-0 invert pointer-events-none select-none"
      />

      {/* Warm brass glow */}
      <div className="absolute inset-0 bg-[radial-gradient(1100px_560px_at_72%_38%,hsl(var(--primary)/0.20),transparent_62%)] pointer-events-none" />

      <div className="container relative z-10 px-4 md:px-6 mx-auto grid md:grid-cols-2 items-center gap-10 md:gap-8">
        {/* Copy column */}
        <div className="text-center md:text-left">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center gap-2.5 border border-[rgba(247,240,222,0.18)] rounded-full px-4 py-1.5 bg-[rgba(247,240,222,0.05)] backdrop-blur-sm mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-medium tracking-[0.2em] text-primary uppercase">
              Creatine · Electrolytes · Daily
            </span>
          </motion.div>

          <h1 className="font-display font-black uppercase leading-[0.94] text-[clamp(3rem,7vw,6.5rem)] tracking-wide text-surface-ink-foreground">
            {HEADLINE_WORDS.map((word, i) => (
              <span key={word} className="inline-block overflow-hidden align-top">
                <motion.span
                  className={`inline-block ${
                    i === HEADLINE_WORDS.length - 1 ? "text-primary" : ""
                  }`}
                  initial={prefersReducedMotion ? false : { y: "110%" }}
                  animate={{ y: 0 }}
                  transition={{
                    duration: 0.9,
                    delay: i * 0.12,
                    ease: [0.2, 0.7, 0.2, 1],
                  }}
                >
                  {word}
                  {i < HEADLINE_WORDS.length - 1 ? " " : ""}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className={`mt-6 text-base md:text-lg leading-relaxed max-w-md mx-auto md:mx-0 ${INK_BODY}`}
          >
            5g creatine + full electrolytes in one single-serve stick. Built for
            the mats — BJJ, MMA, and the lifters who back it up.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-8 flex flex-wrap justify-center md:justify-start items-center gap-4"
          >
            <Button
              asChild
              size="lg"
              className="h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-base font-bold uppercase tracking-wider shadow-[0_8px_24px_hsl(var(--primary)/0.35)] hover:shadow-[0_14px_32px_hsl(var(--primary)/0.45)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <Link href="/shop">
                Shop Strawberry Guava <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={goToFormula}
              className="h-14 px-8 border-accent text-surface-ink-foreground hover:bg-accent/25 text-base font-bold uppercase tracking-wider"
            >
              See the Formula
            </Button>
          </motion.div>
        </div>

        {/* Visual column — real mat-side product photo as floating editorial card.
            NOTE: float (outer motion.div) and mouse tilt (inner img) live on
            separate elements — putting both on one element makes the two
            transform writers fight and flicker. */}
        <div className="relative [perspective:1000px]">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={
              prefersReducedMotion
                ? { opacity: 1, y: 0 }
                : { opacity: 1, y: [0, -12, 0] }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0.8 }
                : {
                    opacity: { duration: 0.8, delay: 0.25 },
                    y: {
                      duration: 7,
                      ease: "easeInOut",
                      repeat: Infinity,
                      delay: 0.8,
                    },
                  }
            }
            className="w-full max-w-[520px] mx-auto"
          >
            <img
              ref={cardRef}
              src="/assets/products/hero_matside_v1.png"
              alt="Kimora Strawberry Guava — pouch, single-serve sticks and shaker at the edge of the mats"
              className="w-full rounded-3xl shadow-[0_36px_70px_rgba(0,0,0,0.45),0_0_0_1px_rgba(247,240,222,0.10)] transition-transform duration-200 ease-out will-change-transform"
            />
          </motion.div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none ${INK_BODY}`}>
        <span className="text-[10px] tracking-[0.3em] uppercase">Scroll</span>
        <span className="w-px h-9 bg-gradient-to-b from-primary to-transparent" />
      </div>
    </section>
  );
}
