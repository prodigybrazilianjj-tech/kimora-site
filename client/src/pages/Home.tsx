import { useEffect } from "react";
import { Navbar } from "@/components/sections/Navbar";
import { Hero } from "@/components/sections/Hero";
import { ProductLineup } from "@/components/sections/ProductLineup";
import { Benefits } from "@/components/sections/Benefits";
import { Formula } from "@/components/sections/Formula";
import { Comparison } from "@/components/sections/Comparison";
import { About } from "@/components/sections/About";
import { FAQPreview } from "@/components/sections/FAQPreview";
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
        <ProductLineup />
        <Benefits />
        <Formula />
        <Comparison />
        <About />
        <FAQPreview />
      </main>
      <Footer />
    </div>
  );
}
