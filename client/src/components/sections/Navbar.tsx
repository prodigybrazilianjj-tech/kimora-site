import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [location] = useLocation();
  const isHome = location === "/";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    if (!isHome) {
      window.location.href = `/${id}`;
      return;
    }
    const element = document.querySelector(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navLinks = [
    { name: "Flavors", href: "#flavors" },
    { name: "Formula", href: "#formula" },
    { name: "Why Not a Tub?", href: "#comparison" },
    { name: "About", href: "#about" },
  ];

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent",
        isScrolled ? "bg-background/90 backdrop-blur-md border-border py-4" : "bg-transparent py-6"
      )}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        <Link href="/">
          <a className="text-3xl font-display font-bold tracking-wider text-white hover:text-primary transition-colors">
            KIMORA
          </a>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <button
              key={link.name}
              onClick={() => scrollToSection(link.href)}
              className="text-sm font-medium text-muted-foreground hover:text-white transition-colors uppercase tracking-wide"
            >
              {link.name}
            </button>
          ))}
          <Button 
            onClick={() => scrollToSection("#waitlist")}
            className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider"
          >
            Join Waitlist
          </Button>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden">
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
                    onClick={() => {
                      scrollToSection(link.href);
                      // Close sheet logic is handled by Sheet primitive usually, but raw button needs help. 
                      // For prototype, this is fine or we can add state.
                    }}
                    className="text-lg font-display text-left text-muted-foreground hover:text-white transition-colors"
                  >
                    {link.name}
                  </button>
                ))}
                <Button 
                  onClick={() => scrollToSection("#waitlist")}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider mt-4"
                >
                  Join Waitlist
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
