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

  function scrollToHash(hash: string) {
    if (!hash) return;
    const el = document.querySelector(hash);
    if (!el) return;

    // IMPORTANT: Let CSS (scroll-mt-*) handle the offset.
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goToSection(hash: string) {
    // e.g. "#flavors"
    if (!isHome) {
      // Navigate to home first
      setLocation("/");

      // After home renders, set hash + scroll.
      window.setTimeout(() => {
        window.location.hash = hash;
        scrollToHash(hash);

        // one more attempt in case the section mounts slightly later
        window.setTimeout(() => scrollToHash(hash), 150);
      }, 50);

      return;
    }

    window.location.hash = hash;
    scrollToHash(hash);
  }

  // If user loads "/" with a hash, scroll once sections mount.
  useEffect(() => {
    if (!isHome) return;

    const run = () => {
      const hash = window.location.hash;
      if (!hash) return;
      scrollToHash(hash);
      window.setTimeout(() => scrollToHash(hash), 150);
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
              <span className="abso
