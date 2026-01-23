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

function scrollToEl(selector: string, behavior: ScrollBehavior) {
  const el = document.querySelector(selector);
  if (!(el instanceof HTMLElement)) return;

  // ✅ Because you keep landing TOO LOW, we bias HIGHER with a negative gap.
  // Tune this number only if needed.
  const gap = -18;

  const navHeight = getNavHeight();
  const y = window.scrollY + el.getBoundingClientRect().top - (navHeight + gap);

  window.scrollTo({ top: Math.max(0, y), behavior });
}

function forceScrollTo(selector: string) {
  // 1) immediate (no animation)
  scrollToEl(selector, "auto");

  // 2) next paint
  requestAnimationFrame(() => scrollToEl(selector, "auto"));

  // 3) after typical layout shifts (fonts/images/motion)
  window.setTimeout(() => scrollToEl(selector, "auto"), 250);
  window.setTimeout(() => scrollToEl(selector, "auto"), 800);
}

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [location, setLocation] = useLocation();
  const { cartCount } = useCart();

  const isHome = location === "/";

  const navBackground =
    !isHome || isScrolled
      ? "bg-background/90 backdrop-blur-md border-border py-4"
      : "bg-transparent py-6";

  useEffect(() => {
    if (!isHome) {
      setIsScrolled(true);
      return;
    }
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  const goToSection = (id: string) => {
    const hash = id.startsWith("#") ? id : `#${id}`;
    const selector = `${hash}-anchor`; // ✅ we scroll to "#flavors-anchor", etc.

    if (!isHome) {
      setLocation("/");

      // Wait for route change to mount the home sections
      window.setTimeout(() => {
        // keep URL nice
        window.location.hash = hash;

        forceScrollTo(selector);
      }, 0);

      return;
    }

    window.location.hash = hash;
    forceScrollTo(selector);
  };

  // If you land on /#flavors directly, force-scroll after mount too.
  useEffect(() => {
    if (!isHome) return;

    const run = () => {
      const hash = window.location.hash;
      if (!hash) return;
      const selector = `${hash}-anchor`;
      forceScrollTo(selector);
    };

    run();
    window.addEventListener("hashchange", run);
    return () => window.removeEventListener("hashchange", run);
  }, [isHome]);

  const navLinks = [
    { name: "Flavors", action: () => goToSection("#flavors") },
    { name: "Shop", action: () => setLocation("/shop") },
    { name: "Formula", action: () => goToSection("#formula") },
    { name: "Why Not a Tub?", action: () => goToSection("#comparison") },
    { name: "About", action: () => goToSection("#about") },
  ];

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent",
        navBackground
      )}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        <Link
          href="/"
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

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="bg-background border-l border-border">
              <div className="flex flex-col gap-6 mt-10">
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
                  onClick={() => setLocation("/shop")}
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
