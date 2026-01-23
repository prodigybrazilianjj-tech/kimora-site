import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

const products = [
  {
    name: "Strawberry Guava",
    slug: "strawberry-guava",
    desc: "Tart, tropical, and refreshingly smooth.",
    image: "/assets/products/strawberry-guava/pouch.webp",
    accent: "from-orange-600/20 to-transparent",
  },
  {
    name: "Lemon Yuzu",
    slug: "lemon-yuzu",
    desc: "Bright citrus with a crisp, clean finish.",
    image: "/assets/products/lemon-yuzu/pouch.webp",
    accent: "from-yellow-500/20 to-transparent",
  },
  {
    name: "Raspberry Dragonfruit",
    slug: "raspberry-dragonfruit",
    desc: "Bold, juicy, and perfectly balanced.",
    image: "/assets/products/raspberry-dragonfruit/pouch.webp",
    accent: "from-rose-600/25 to-transparent",
  },
];

export function ProductLineup() {
  return (
    <section id="flavors" className="py-12 md:py-16 bg-background relative overflow-hidden">
      <div className="container px-4 mx-auto">
        {/* ✅ Navbar scroll target */}
        <div id="flavors-anchor" />

        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            Daily Fuel. Zero Compromise.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Three precision-engineered flavors designed to make your daily
            creatine habit effortless.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {products.map((product, index) => (
            <motion.div
              key={product.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              viewport={{ once: true }}
            >
              <a
                href={`/product?flavor=${product.slug}`}
                className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/60"
                aria-label={`View ${product.name}`}
              >
                <Card className="bg-card/50 border-white/5 hover:border-white/10 transition-colors duration-300 overflow-hidden group cursor-pointer">
                  <CardContent className="p-0 relative">
                    <div
                      className={`pointer-events-none absolute inset-0 bg-gradient-to-t ${product.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                    />

                    <div className="aspect-[3/4] p-6 flex items-center justify-center relative z-10">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-contain drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    <div className="p-6 text-center border-t border-white/5 bg-card/80 backdrop-blur-sm">
                      <h3 className="text-2xl font-display font-bold text-white mb-2">
                        {product.name}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {product.desc}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
