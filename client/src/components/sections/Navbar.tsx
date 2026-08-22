import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { PRELAUNCH_GATE, HOME_PATH } from "@/lib/prelaunch";
import { SiteHeader, type NavLink } from "@/components/sections/SiteHeader";

/**
 * 🔒 PRELAUNCH GATE
 * When PRELAUNCH_GATE is true the store is browsable but nothing is buyable, so
 * the header's call to action points at the storefront rather than the cart.
 *
 * This component is now just the homepage's nav data plus its hash-scrolling —
 * the bar itself lives in SiteHeader, shared with the pre-launch page.
 *
 * Wholesale is deliberately not in the nav; the design carries four links and
 * the footer already links it.
 */

function scrollToSelector(selector: string) {
  const el = document.querySelector(selector);
  if (!(el instanceof HTMLElement)) return false;

  el.scrollIntoView({ behavior: "auto", block: "start" });
  requestAnimationFrame(() => {
    el.scrollIntoView({ behavior: "auto", block: "start" });
  });

  return true;
}

function scrollToSelectorWithRetry(selector: string, attempts = 36) {
  let tries = 0;

  const tick = () => {
    if (scrollToSelector(selector)) return;
    tries += 1;
    if (tries >= attempts) return;
    requestAnimationFrame(tick);
  };

  tick();
}

function setHashNoJump(hash: string) {
  const normalized = hash.startsWith("#") ? hash : `#${hash}`;
  history.pushState(null, "", window.location.pathname + window.location.search + normalized);
}

function clearHashNoJump() {
  history.replaceState(null, "", window.location.pathname + window.location.search);
}

function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
}

export function Navbar() {
  const [location, setLocation] = useLocation();
  const isHome = location === HOME_PATH;
  const pendingSelectorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isHome) return;

    const selector = pendingSelectorRef.current;
    if (!selector) return;

    pendingSelectorRef.current = null;
    scrollToSelectorWithRetry(selector);
  }, [isHome]);

  useEffect(() => {
    if (!isHome) return;

    const onPopState = () => {
      const hash = window.location.hash;
      if (hash) scrollToSelectorWithRetry(hash);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isHome]);

  function goHomeTop() {
    if (window.location.hash) clearHashNoJump();

    if (!isHome) {
      setLocation(HOME_PATH);
      window.setTimeout(scrollToTop, 0);
      return;
    }

    scrollToTop();
  }

  function goToSection(hash: string) {
    const normalized = hash.startsWith("#") ? hash : `#${hash}`;

    if (!isHome) {
      setHashNoJump(normalized);
      pendingSelectorRef.current = normalized;
      setLocation(HOME_PATH);
      return;
    }

    setHashNoJump(normalized);
    scrollToSelectorWithRetry(normalized);
  }

  const links: NavLink[] = useMemo(
    () => [
      { label: "Home", active: isHome, onClick: goHomeTop },
      { label: "Flavors", onClick: () => goToSection("#flavors") },
      { label: "Formula", onClick: () => goToSection("#formula") },
      { label: "About", onClick: () => goToSection("#about") },
    ],
    [isHome, location]
  );

  return (
    <SiteHeader
      position="fixed"
      links={links}
      cta={{ label: PRELAUNCH_GATE ? "Shop" : "Shop Now", href: "/shop" }}
      onWordmarkClick={(e) => {
        e.preventDefault();
        goHomeTop();
      }}
    />
  );
}
