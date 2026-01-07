import { useState } from "react";
import { Link } from "wouter";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const products = [
  {
    id: "strawberry-guava",
    name: "Strawberry Guava",
    desc: "Tart, tropical, and refreshingly smooth.",
    image: "/assets/products/strawberry-guava/pouch.webp",
    priceOneTime: 49.99,
    priceSub: 44.99,
    accent: "from-orange-600/20 to-transparent",
    bgAccent: "from-orange-500/20",
  },
  {
    id: "lemon-yuzu",
    name: "Lemon Yuzu",
    desc: "Bright citrus with a crisp, clean finish.",
    image: "/assets/products/lemon-yuzu/pouch.webp",
    priceOneTime: 49.99,
    priceSub: 44.99,
    accent: "from-yellow-500/20 to-transparent",
    bgAccent: "from-yellow-500/20",
  },
  {
    id: "raspberry-dragonfruit",
    name: "Raspberry Dragonfruit",
    desc: "Bold, juicy, and perfectly balanced.",
    image: "/assets/products/raspberry-dragonfruit/pouch.webp",
    priceOneTime: 49.99,
    priceSub: 44.99,
    accent: "from-rose-600/25 to-transparent",
    bgAccent: "from-rose-500/20",
  },
];

export default function Shop() {
  const [isSubscribe, setIsSubscribe] = useState(true);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6">
              SHOP KIMORA
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Daily electrolytes + creatine. Choose your fuel.
            </p>

            <div className="flex items-center justify-center gap-4 bg-secondary/30 w-fit mx-auto p-1.5 rounded-full border border-white/5">
              <button
                onClick={() => setIsSubscribe(false)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                  !isSubscribe
                    ? "bg-white text-black"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                One-time
              </button>
              <button
                onClick={() => setIsSubscribe(true)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                  isSubscribe
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                Subscribe & Save 10%
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {products.map((product, index) => {
              const href = `/product?flavor=${product.id}`;
              const displayPrice = isSubscribe ? product.priceSub : product.priceOneTime;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={href}>
                    <a
                      className="block h-full rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/60"
                      aria-label={`View ${product.name}`}
                    >
                      <Card className="bg-card border-white/5 overflow-hidden hover:border-white/10 transition-all group h-full flex flex-col cursor-pointer">
                        <CardContent className="p-0 flex flex-col h-full">
                          {/* Image Area */}
                          <div className="relative aspect-[4/5] bg-secondary/20 p-8 flex items-center justify-center overflow-hidden">
                            <div
                              className={`absolute inset-0 bg-gradient-to-t ${product.bgAccent} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                            />
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-contain drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500 z-10"
                            />
                          </div>

                          {/* Content Area */}
                          <div className="p-6 flex flex-col flex-grow">
                            <h3 className="text-2xl font-display font-bold text-white mb-2">
                              {product.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-6 flex-grow">
                              {product.desc}
                            </p>

                            <div className="flex items-end justify-between mb-6">
                              <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                                  30 Sticks
                                </span>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-2xl font-bold text-white">
                                    ${displayPrice}
                                  </span>

                                  {isSubscribe && (
                                    <span className="text-sm text-muted-foreground line-through decoration-destructive/50">
                                      ${product.priceOneTime}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Button stays for UX, but doesn't need to handle navigation */}
                            <Button
                              type="button"
                              className="w-full bg-white/10 hover:bg-white text-white hover:text-black font-bold uppercase tracking-wider border border-white/10 hover:border-white transition-all"
                            >
                              Select
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
