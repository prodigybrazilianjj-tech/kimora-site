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

  // Only use scroll effect on home page
  const isHome = location === "/";

  // Always solid background on other pages
  const navBackground =
    !isHome || isScrolled
      ? "bg-background/90 backdrop-blur-md border-border py-4"
      : "bg-transparent py-6";

  useEffect(() => {
    if (!isHome) {
      setIsScrolled(true);
      return;
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  function scrollWithOffset(selector: string) {
    const el = document.querySelector(selector);
    if (!el) return;

    // Scroll to the section first
    el.scrollIntoView({ behavior: "smooth", block: "start" });

    // Then offset for fixed navbar height
    const yOffset = window.innerWidth >= 768 ? 120 : 100;

    window.setTimeout(() => {
      window.scrollBy({ top: -yOffset, left: 0, behavior: "auto" });
    }, 50);
  }

  const scrollToSection = (id: string) => {
    // If we're not on home, navigate there with the hash.
    // This fixes the "needs two clicks" problem.
    if (!isHome) {
      setLocation(`/${id}`); // e.g. "/#flavors"
      return;
    }

    scrollWithOffset(id);
  };

  // If we land on home with a hash, auto-scroll once the DOM is ready.
  useEffect(() => {
    if (!isHome) return;

    const hash = window.location.hash; // e.g. "#flavors"
    if (!hash) return;

    const t = window.setTimeout(() => {
      scrollWithOffset(hash);
    }, 50);

    return () => window.clearTimeout(t);
  }, [isHome, location]);

  const navLinks = [
    { name: "Flavors", href: "#flavors", action: () => scrollToSection("#flavors") },
    { name: "Shop", href: "/shop", action: () => setLocation("/shop") },
    { name: "Formula", href: "#formula", action: () => scrollToSection("#formula") },
    { name: "Why Not a Tub?", href: "#comparison", action: () => scrollToSection("#comparison") },
    { name: "About", href: "#about", action: () => scrollToSection("#about") },
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
                location === link.href
                  ? "text-primary"
                  : "text-muted-foreground hover:text-white",
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
