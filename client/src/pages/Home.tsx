import { useEffect } from "react";
import { Navbar } from "@/components/sections/Navbar";
import { Hero } from "@/components/sections/Hero";
import { Marquee } from "@/components/sections/Marquee";
import { ProductLineup } from "@/components/sections/ProductLineup";
import { StatsBand } from "@/components/sections/StatsBand";
import { Benefits } from "@/components/sections/Benefits";
import { Formula } from "@/components/sections/Formula";
import { CinematicBand } from "@/components/sections/CinematicBand";
import { Ritual } from "@/components/sections/Ritual";
import { Comparison } from "@/components/sections/Comparison";
import { SavingsSlider } from "@/components/sections/SavingsSlider";
import { About } from "@/components/sections/About";
import { FutureProducts } from "@/components/sections/FutureProducts";
import { Testimonials } from "@/components/sections/Testimonials";
import { EmailCapture } from "@/components/sections/EmailCapture";
import { FAQPreview } from "@/components/sections/FAQPreview";
import { StickyNotifyBar } from "@/components/sections/StickyNotifyBar";
import { Footer } from "@/components/sections/Footer";

function getNavHeight() {
  const nav = document.querySelector("nav");
  return nav instanceof HTMLElement ? nav.offsetHeight : 0;
}

function scrollToSelectorWithNudge(selector: string) {
  const el = document.querySelector(selector);
  if (!(el instanceof HTMLElement)) return;

  const NUDGE_PX = 160;
  const navHeight = getNavHeight();
  const targetTop = window.scrollY + el.getBoundingClientRect().top - navHeight;

  window.scrollTo({ top: Math.max(0, targetTop), behavior: "auto" });
  window.scrollBy({ top: NUDGE_PX, behavior: "auto" });
}

function forceScrollTo(selector: string) {
  scrollToSelectorWithNudge(selector);
  requestAnimationFrame(() => scrollToSelectorWithNudge(selector));
  window.setTimeout(() => scrollToSelectorWithNudge(selector), 250);
  window.setTimeout(() => scrollToSelectorWithNudge(selector), 800);
}

export default function Home() {
  useEffect(() => {
    const run = () => {
      const hash = window.location.hash;
      if (!hash) return;

      const selector = `${hash}-anchor`; // "#flavors-anchor"
      window.setTimeout(() => forceScrollTo(selector), 0);
    };

    run();
    window.addEventListener("hashchange", run);
    return () => window.removeEventListener("hashchange", run);
  }, []);

  return (
    <div className="bg-background text-foreground selection:bg-primary selection:text-white">
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <ProductLineup />
        <StatsBand />
        <Benefits />
        <Formula />
        <CinematicBand />
        <Ritual />
        <Comparison />
        <SavingsSlider />
        <Testimonials />
        <About />
        <FutureProducts />
        <EmailCapture />
        <FAQPreview />
      </main>
      <StickyNotifyBar />
      <Footer />
    </div>
  );
}
