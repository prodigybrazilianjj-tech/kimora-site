import { useEffect, useMemo, useState } from "react";
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

/**
 * Single, controlled scroll (no multi-jump flicker).
 * We also add a small nudge (your original intent).
 */
function scrollToSelector(selector: string) {
  const el = document.querySelector(selector);
  if (!(el instanceof HTMLElement)) return;

  const navHeight = getNavHeight();
  const NUDGE_PX = 160;

  const targetTop =
    window.scrollY + el.getBoundingClientRect().top - navHeight + NUDGE_PX;

  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: "auto",
  });

  // One extra frame helps if layout is still settling
  requestAnimationFrame(() => {
    const el2 = document.querySelector(selector);
    if (!(el2 instanceof HTMLElement)) return;
    const targetTop2 =
      window.scrollY + el2.getBoundingClientRect().top - getNavHeight() + NUDGE_PX;
    window.scrollTo({ top: Math.max(0, targetTop2), behavior: "auto" });
  });
}

function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
}

/**
 * Update URL hash WITHOUT the browser doing a native anchor jump.
 */
function setHashNoJump(hash: string) {
  const h = hash.startsWith("#") ? hash : `#${hash}`;
  const url = `${window.location.pathname}${window.location.search}${h}`;
  history.replaceState(null, "", url);
}

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [location, setLocation] = useLocation();
  const { cartCount } = useCart();

  // Control mobile sheet so we can close it on navigation
  const [mobileOpen, setMobileOpen] = useState(false);

  const isHome = location === "/";

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

  function closeMobile() {
    setMobileOpen(false);
  }

  function goHomeTop() {
    closeMobile();

    // Clear hash without causing a jump
    if (typeof window !== "undefined" && window.location.hash) {
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
    closeMobile();

    const normalizedHash = hash.startsWith("#") ? hash : `#${hash}`;
    const selector = normalizedHash;

    if (!isHome) {
      setLocation("/");
      window.setTimeout(() => {
        // Set hash without native jump, then scroll once
        setHashNoJump(normalizedHash);
        scrollToSelector(selector);
      }, 0);
      return;
    }

    setHashNoJump(normalizedHash);
    scrollToSelector(selector);
  }

  /**
   * Optional: support arriving on home with a hash already in the URL.
   * Only run once when we land on home.
   */
  const initialHash = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.hash || "";
  }, []);

  useEffect(() => {
    if (!isHome) return;
    if (!initialHash) return;

    // Scroll once on load; don't attach hashchange listener (avoids flicker)
    window.setTimeout(() => {
      scrollToSelector(initialHash);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHome]);

  const navLinks = [
    { name: "Flavors", action: () => goToSection("#flavors") },
    { name: "Formula", action: () => goToSection("#formula") },
    { name: "Why Not a Tub?", action: () => goToSection("#comparison") },
    { name: "About", action: () => goToSection("#about") },
    { name: "Shop", action: () => { closeMobile(); setLocation("/shop"); } },
    { name: "Wholesale", action: () => { closeMobile(); setLocation("/wholesale"); } },
  ];

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