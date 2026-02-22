import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart";

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

function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  requestAnimationFrame(() =>
    window.scrollTo({ top: 0, left: 0, behavior: "auto" }),
  );
  window.setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }), 60);
}

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [location, setLocation] = useLocation();
  const { cartCount } = useCart();

  // ✅ control mobile Sheet open state so we can close it on link tap
  const [mobileOpen, setMobileOpen] = useState(false);

  const isHome = location === "/";

  // ✅ IMPORTANT: keep height/padding CONSTANT to prevent flicker
  const navBase =
    "fixed top-0 left-0 right-0 z-50 border-b border-transparent " +
    "transition-colors duration-300"; // ✅ no transition-all

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

  function goHomeTop() {
    // Clear hash (prevents auto-jump / weirdness)
    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    if (!isHome) {
      setLocation("/");
      window.setTimeout(() => {
        scrollToTop();
      }, 0);
      return;
    }

    scrollToTop();
  }

  function goToSection(hash: string) {
    const normalizedHash = hash.startsWith("#") ? hash : `#${hash}`;
    const selector = normalizedHash;

    if (!isHome) {
      setLocation("/");
      window.setTimeout(() => {
        window.location.hash = normalizedHash;
        forceScrollTo(selector);
      }, 0);
      return;
    }

    window.location.hash = normalizedHash;
    forceScrollTo(selector);
  }

  useEffect(() => {
    if (!isHome) return;

    const run = () => {
      const hash = window.location.hash;
      if (!hash) return;
      forceScrollTo(hash);
    };

    run();
    window.addEventListener("hashchange", run);
    return () => window.removeEventListener("hashchange", run);
  }, [isHome]);

  // ✅ helper to close the mobile menu after selecting a link
  function closeMobileMenuSoon() {
    // allow any navigation/scroll logic to run, then close sheet
    window.setTimeout(() => setMobileOpen(false), 0);
  }

  const navLinks = [
    {
      name: "Flavors",
      action: () => {
        goToSection("#flavors");
        closeMobileMenuSoon();
      },
    },
    {
      name: "Formula",
      action: () => {
        goToSection("#formula");
        closeMobileMenuSoon();
      },
    },
    {
      name: "Why Not a Tub?",
      action: () => {
        goToSection("#comparison");
        closeMobileMenuSoon();
      },
    },
    {
      name: "About",
      action: () => {
        goToSection("#about");
        closeMobileMenuSoon();
      },
    },
    {
      name: "Shop",
      action: () => {
        setLocation("/shop");
        closeMobileMenuSoon();
      },
    },
    {
      name: "Wholesale",
      action: () => {
        setLocation("/wholesale");
        closeMobileMenuSoon();
      },
    },
  ];

  return (
    <nav className={cn(navBase, navBackground)}>
      {/* ✅ constant height container so nothing shifts */}
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
          <Link href="/cart" className="relative text-white">
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

            <SheetContent side="right" className="bg-background border-l border-border">
              <div className="flex flex-col gap-6 mt-10">
                <button
                  onClick={() => {
                    goHomeTop();
                    closeMobileMenuSoon();
                  }}
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
                    setLocation("/shop");
                    closeMobileMenuSoon();
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