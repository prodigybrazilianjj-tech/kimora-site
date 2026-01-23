import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart";

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

  function scrollWithOffset(selector: string) {
    const el = document.querySelector(selector);
    if (!el) return;

    // Scroll first
    el.scrollIntoView({ behavior: "smooth", block: "start" });

    // Offset for fixed navbar
    const yOffset = window.innerWidth >= 768 ? 180 : 150;
    window.setTimeout(() => {
      window.scrollBy({ top: -yOffset, left: 0, behavior: "auto" });
    }, 50);
  }

  function goToSection(id: string) {
    // id like "#flavors"
    if (!isHome) {
      // 1) Navigate to home
      setLocation("/");

      // 2) After navigation/render, set hash + scroll
      window.setTimeout(() => {
        // Update hash so refresh/back button behaves
        window.location.hash = id;

        // Try immediately, and again shortly in case sections mount after initial render
        scrollWithOffset(id);
        window.setTimeout(() => scrollWithOffset(id), 150);
      }, 50);

      return;
    }

    // On home already: set hash + scroll
    window.location.hash = id;
    scrollWithOffset(id);
  }

  // If user loads "/" with a hash (or hash changes), auto-scroll once.
  useEffect(() => {
    if (!isHome) return;

    const run = () => {
      const hash = window.location.hash;
      if (!hash) return;
      // two attempts covers content that mounts slightly later
      scrollWithOffset(hash);
      window.setTimeout(() => scrollWithOffset(hash), 150);
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
        navBackground,
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
              className={cn(
                "text-sm font-medium transition-colors uppercase tracking-wide",
                "text-muted-foreground hover:text-white",
              )}
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
