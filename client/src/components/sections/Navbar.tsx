import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart";

function scrollToSelector(selector: string) {
  const el = document.querySelector(selector);
  if (!(el instanceof HTMLElement)) return false;

  // ✅ Use native scroll + rely on CSS scroll-margin-top (scroll-mt-*)
  el.scrollIntoView({ behavior: "auto", block: "start" });

  // One extra frame helps when fonts/layout settle (prevents “jump then settle”)
  requestAnimationFrame(() => {
    el.scrollIntoView({ behavior: "auto", block: "start" });
  });

  return true;
}

function scrollToSelectorWithRetry(selector: string, attempts = 36) {
  let tries = 0;

  const tick = () => {
    const ok = scrollToSelector(selector);
    if (ok) return;

    tries += 1;
    if (tries >= attempts) return;

    requestAnimationFrame(tick);
  };

  tick();
}

function setHashNoJump(hash: string) {
  const normalized = hash.startsWith("#") ? hash : `#${hash}`;
  const url = window.location.pathname + window.location.search + normalized;
  // pushState avoids the browser’s default anchor jump that causes flicker
  history.pushState(null, "", url);
}

function clearHashNoJump() {
  const url = window.location.pathname + window.location.search;
  history.replaceState(null, "", url);
}

function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  requestAnimationFrame(() =>
    window.scrollTo({ top: 0, left: 0, behavior: "auto" }),
  );
}

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [location, setLocation] = useLocation();
  const { cartCount } = useCart();

  // Mobile sheet state (so it collapses after any tap)
  const [mobileOpen, setMobileOpen] = useState(false);

  const isHome = location === "/";

  // If we navigate to "/" and want to scroll to a section, we stash it here.
  const pendingSelectorRef = useRef<string | null>(null);

  // ✅ IMPORTANT: keep height/padding CONSTANT to prevent flicker
  const navBase =
    "fixed top-0 left-0 right-0 z-50 border-b border-transparent transition-colors duration-300";

  const navBackground =
    !isHome || isScrolled
      ? "bg-background/90 backdrop-blur-md border-border"
      : "bg-transparent";

  useEffect(() => {
    if (!isHome) {
      setIsScrolled(true);
      return;
    }

    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  // When we arrive on home (after setLocation("/")), execute any pending scroll.
  useEffect(() => {
    if (!isHome) return;

    const selector = pendingSelectorRef.current;
    if (!selector) return;

    pendingSelectorRef.current = null;

    // ✅ Retry a few frames so Home can mount and the anchor exists
    scrollToSelectorWithRetry(selector);
  }, [isHome]);

  function closeMobile() {
    setMobileOpen(false);
  }

  function goHomeTop() {
    closeMobile();

    // Clear hash (prevents auto-jump weirdness)
    if (window.location.hash) clearHashNoJump();

    if (!isHome) {
      setLocation("/");
      window.setTimeout(() => scrollToTop(), 0);
      return;
    }

    scrollToTop();
  }

  function goToSection(hash: string) {
    closeMobile();

    const normalizedHash = hash.startsWith("#") ? hash : `#${hash}`;
    const selector = normalizedHash;

    if (!isHome) {
      // ✅ CRITICAL FIX:
      // Set the hash BEFORE navigating home so App's ScrollToTop sees window.location.hash
      // and does NOT scroll to the top on route change.
      setHashNoJump(normalizedHash);

      // Navigate home, then scroll once content is mounted
      pendingSelectorRef.current = selector;
      setLocation("/");

      return;
    }

    // Home page: set hash without browser jump, then scroll
    setHashNoJump(normalizedHash);
    scrollToSelectorWithRetry(selector);
  }

  // Optional: if the user hits Back/Forward and hash changes, handle it without flicker.
  useEffect(() => {
    if (!isHome) return;

    const onPopState = () => {
      const hash = window.location.hash;
      if (!hash) return;
      scrollToSelectorWithRetry(hash);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isHome]);

  const navLinks = useMemo(
    () => [
      { name: "Flavors", action: () => goToSection("#flavors") },
      { name: "Formula", action: () => goToSection("#formula") },
      { name: "Why Not a Tub?", action: () => goToSection("#comparison") },
      { name: "About", action: () => goToSection("#about") },
      {
        name: "Shop",
        action: () => {
          closeMobile();
          setLocation("/shop");
        },
      },
      {
        name: "Wholesale",
        action: () => {
          closeMobile();
          setLocation("/wholesale");
        },
      },
      
    ],
    [isHome, location],
  );

  return (
    <nav className={cn(navBase, navBackground)}>
      <div className="container mx-auto px-4 md:px-6 h-[72px] flex items-center justify-between">
        <Link
          href="/"
          onClick={(e) => {
            e.preventDefault();
            goHomeTop();
          }}
          className="text-3xl font-display font-bold tracking-wider text-white hover:text-primary transition-colors"
        >
          KIMORA
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <button
              key={link.name}
              onClick={link.action}
              className="text-sm font-medium transition-colors uppercase tracking-wide text-muted-foreground hover:text-white"
            >
              {link.name}
            </button>
          ))}

          <Link
            href="/cart"
            className="relative text-muted-foreground hover:text-white transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {cartCount}
              </span>
            )}
          </Link>

          <Button
            onClick={() => setLocation("/shop")}
            className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider"
          >
            Shop Now
          </Button>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex items-center gap-4">
          <Link
            href="/cart"
            className="relative text-white"
            onClick={() => closeMobile()}
          >
            <ShoppingBag className="w-6 h-6" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {cartCount}
              </span>
            )}
          </Link>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="bg-background border-l border-border"
            >
              <div className="flex flex-col gap-6 mt-10">
                <button
                  onClick={goHomeTop}
                  className="text-lg font-display text-left text-white/90 hover:text-white transition-colors"
                >
                  Home
                </button>

                {navLinks.map((link) => (
                  <button
                    key={link.name}
                    onClick={link.action}
                    className="text-lg font-display text-left text-muted-foreground hover:text-white transition-colors"
                  >
                    {link.name}
                  </button>
                ))}

                <Button
                  onClick={() => {
                    closeMobile();
                    setLocation("/shop");
                  }}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider mt-4"
                >
                  Shop Now
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}