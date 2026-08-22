import { useEffect } from "react";
import { scrollToId, scrollToPageTop, HEADER_OFFSET } from "@/lib/scroll";
import { Footer } from "@/components/sections/Footer";
import { StatsBand } from "@/components/sections/StatsBand";
import { FlavorLineup } from "@/components/sections/FlavorLineup";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { HeroShell } from "@/components/sections/HeroShell";
import { WhyKimora } from "@/components/sections/WhyKimora";
import { WhyNotATub } from "@/components/sections/WhyNotATub";
import { Formula } from "@/components/sections/Formula";
import { Quality } from "@/components/sections/Quality";
import { FaqSection } from "@/components/sections/FaqSection";
import { Manifesto } from "@/components/sections/Manifesto";
import { FutureProducts } from "@/components/sections/FutureProducts";
import { Waitlist } from "@/components/sections/Waitlist";
import { motion } from "framer-motion";
import { INK_HEAD, INK_LEAD, INK_BODY } from "@/lib/surfaces";
import { FLAVORS, LAUNCH_FLAVOR, STICKS_PER_POUCH } from "@/lib/product";
import { WAITLIST_DISCOUNT_LABEL } from "@/lib/prelaunch";

const LAUNCH = FLAVORS.find((f) => f.slug === LAUNCH_FLAVOR) ?? FLAVORS[0];

const EASE = [0.22, 1, 0.36, 1] as const;


function scrollToWaitlist() {
  scrollToId("waitlist");
}

// HOME is the active link because this page is the front door.
const NAV_LINKS = [
  {
    label: "Home",
    active: true,
    onClick: scrollToPageTop,
  },
  { label: "Flavors", onClick: () => scrollToId("flavors") },
  { label: "Pricing", href: "/shop" },
  { label: "Formula", onClick: () => scrollToId("formula") },
  { label: "About", onClick: () => scrollToId("about") },
];

export default function ComingSoon() {
  // A visitor coming from the shop's nav arrives with "#flavors" in the URL.
  // A full page load jumps there natively; an in-app navigation does not, and
  // the shop's header has already unmounted by the time we render, so the
  // scroll has to happen here.
  useEffect(() => {
    const run = () => {
      const hash = window.location.hash;
      if (!hash) return;

      const id = hash.slice(1);
      scrollToId(id, HEADER_OFFSET, "auto");
      window.setTimeout(() => scrollToId(id, HEADER_OFFSET, "auto"), 250);
    };

    run();
    window.addEventListener("hashchange", run);
    return () => window.removeEventListener("hashchange", run);
  }, []);

  return (
    <>
      <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
        {/* fine grain texture */}
        <div
          className="pointer-events-none absolute inset-0 z-20 mix-blend-multiply"
          style={{
            opacity: 0.05,
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <main className="relative z-10">
          {/* ── Header ── */}
          <SiteHeader
            links={NAV_LINKS}
            cta={{ label: "Join Waitlist", onClick: scrollToWaitlist }}
            onWordmarkClick={(ev) => {
              ev.preventDefault();
              scrollToPageTop();
            }}
          />

          {/* ── 1. Hero — ink ── */}
          <HeroShell>
                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
                  className="inline-block bg-gradient-to-r from-[#C9A86A] via-[#E3C88E] to-[#D8AE5A] bg-clip-text text-sm font-semibold uppercase tracking-[0.30em] text-transparent"
                >
                  Coming soon
                </motion.p>

                <h1
                  className={`mt-5 text-5xl font-display font-extrabold uppercase leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl ${INK_HEAD}`}
                >
                  {["TRAIN WITH", "PURPOSE."].map((line, i) => (
                    <motion.span
                      key={line}
                      className="block"
                      initial={{ opacity: 0, y: 36 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.65, ease: EASE, delay: 0.22 + i * 0.13 }}
                    >
                      {line}
                    </motion.span>
                  ))}
                </h1>

                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.68 }}
                  className={`mt-8 max-w-[520px] text-lg leading-8 sm:text-xl ${INK_LEAD}`}
                >
                  Creatine + electrolytes built for fighters.
                </motion.p>

                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.78 }}
                  className={`mt-5 max-w-[560px] text-base leading-7 sm:text-lg sm:leading-8 ${INK_BODY}`}
                >
                  Single-serve daily performance support with no scooping, no mess,
                  and no friction between intention and consistency.
                </motion.p>

                <div className="mt-8 flex flex-wrap gap-2.5">
                  {[
                    "5g Creatine Monohydrate",
                    "Electrolytes Included",
                    "Naturally Sweetened",
                    "Nothing Artificial",
                  ].map((badge, i) => (
                    <motion.span
                      key={badge}
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, ease: EASE, delay: 0.85 + i * 0.07 }}
                      className="rounded-full border border-[rgba(247,240,222,0.18)] bg-[rgba(247,240,222,0.05)] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-[rgba(247,240,222,0.78)]"
                    >
                      {badge}
                    </motion.span>
                  ))}
                </div>

                {/* Pricing first, then the ask. The waitlist card used to sit
                    here, which pitched a discount before the page had shown a
                    price or a pack size. */}
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: EASE, delay: 1.08 }}
                  className="mt-10"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => scrollToId("flavors")}
                      className="h-14 rounded-lg bg-primary px-7 text-sm font-bold uppercase tracking-[0.18em] text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
                    >
                      See pricing
                    </button>

                    <button
                      type="button"
                      onClick={scrollToWaitlist}
                      className="h-14 rounded-lg border border-[rgba(247,240,222,0.28)] px-7 text-sm font-bold uppercase tracking-[0.18em] text-[#F7F0DE] transition-colors duration-200 hover:bg-[rgba(247,240,222,0.08)]"
                    >
                      Join the waitlist
                    </button>
                  </div>

                  <p className={`mt-4 text-sm leading-6 ${INK_BODY}`}>
                    ${LAUNCH.priceOneTime.toFixed(2)} for {STICKS_PER_POUCH}{" "}
                    sticks — a month of daily dosing.{" "}
                    <span className="text-[#F7F0DE]">
                      Waitlist gets {WAITLIST_DISCOUNT_LABEL} off.
                    </span>
                  </p>
                </motion.div>
          </HeroShell>

          {/* ── 2. The numbers — cream, gold rules top + bottom ── */}
          <StatsBand tone="cream" rules />

          <Formula tone="ink" />

          <FlavorLineup tone="sand" mode="prelaunch" />

          <WhyNotATub tone="ink" />

          <WhyKimora tone="cream" id="about" />

          {/* ── 7-10. Shared with the homepage — see components/sections. ── */}
          <Quality tone="ink" />
          <FaqSection tone="sand" mode="prelaunch" />
          <Manifesto />
          <FutureProducts tone="cream" />

          {/* ── The ask, last. ── */}
          <Waitlist />
        </main>
      </div>

      <Footer tone="ink" />
    </>
  );
}
