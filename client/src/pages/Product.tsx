import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  ShieldCheck,
  Truck,
  RotateCcw,
  Minus,
  Plus,
} from "lucide-react";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

const productData: Record<string, any> = {
  "strawberry-guava": {
    name: "Strawberry Guava",
    desc: "Tart, tropical, and refreshingly smooth. A perfect balance of island sweetness and punchy tartness.",
    // ✅ matches the pouch (warm orange / terracotta)
    color: "text-orange-400",
    gradient: "from-orange-500/20",
    pouch: "/assets/products/strawberry-guava/pouch.webp",
    stick: "/assets/products/strawberry-guava/stick.png",
  },
  "lemon-yuzu": {
    name: "Lemon Yuzu",
    desc: "Bright citrus with a crisp, clean finish. Zesty, aromatic, and incredibly refreshing over ice.",
    // ✅ already correct
    color: "text-yellow-400",
    gradient: "from-yellow-500/20",
    pouch: "/assets/products/lemon-yuzu/pouch.webp",
    stick: "/assets/products/lemon-yuzu/stick.png",
  },
  "raspberry-dragonfruit": {
    name: "Raspberry Dragonfruit",
    desc: "Bold, juicy, and perfectly balanced. Deep berry notes with a smooth, exotic finish.",
    // ✅ matches the pouch (raspberry/red)
    color: "text-rose-400",
    gradient: "from-pink-500/20",
    pouch: "/assets/products/raspberry-dragonfruit/pouch.webp",
    stick: "/assets/products/raspberry-dragonfruit/stick.png",
  },
};

export default function Product() {
  const [location] = useLocation(); // kept as-is in case you use it later
  const searchParams = new URLSearchParams(window.location.search);
  const flavor = searchParams.get("flavor") || "strawberry-guava";

  const product = productData[flavor] || productData["strawberry-guava"];

  const [purchaseType, setPurchaseType] = useState<"onetime" | "subscribe">(
    "subscribe"
  );
  const [frequency, setFrequency] = useState<"2" | "4" | "6">("4");
  const [quantity, setQuantity] = useState(1);
  const [currentImage, setCurrentImage] = useState<"pouch" | "stick">("pouch");

  const { addToCart } = useCart();

  // Pricing
  const priceOneTime = 49.99;
  const pricePerShipmentSub = 44.99;

  // What the customer pays per order/renewal (NOT "monthly")
  const currentUnitPrice =
    purchaseType === "subscribe" ? pricePerShipmentSub : priceOneTime;

  // Display-only helper (makes it obvious that 2-week is billed twice as often)
  const estimatedMonthly = useMemo(() => {
    if (purchaseType !== "subscribe") return null;

    if (frequency === "2") return pricePerShipmentSub * 2;
    if (frequency === "4") return pricePerShipmentSub;

    // 6-week: roughly 4 weeks / 6 weeks of the price (estimate only)
    return (pricePerShipmentSub * 4) / 6;
  }, [purchaseType, frequency]);

  const handleAddToCart = () => {
    const id =
      purchaseType === "subscribe"
        ? `${flavor}-sub-${frequency}` // IMPORTANT: frequency in ID so 2/4/6wk are unique
        : `${flavor}-onetime`;

    addToCart({
      id,
      flavor: product.name,
      type: purchaseType,
      price: currentUnitPrice,
      quantity,
      frequency: purchaseType === "subscribe" ? frequency : undefined,
      image: product.pouch,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          {/* Left Column: Images */}
          <div className="space-y-6">
            <div className="relative aspect-[4/5] bg-secondary/10 rounded-2xl flex items-center justify-center p-8 overflow-hidden border border-white/5">
              <div
                className={`absolute inset-0 bg-gradient-to-t ${product.gradient} to-transparent opacity-50`}
              />
              <img
                src={currentImage === "pouch" ? product.pouch : product.stick}
                alt={product.name}
                className="relative z-10 w-full h-full object-contain drop-shadow-2xl animate-in fade-in zoom-in duration-500"
              />
            </div>

            {/* Thumbnails */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setCurrentImage("pouch")}
                className={cn(
                  "w-20 h-20 rounded-lg border bg-card p-2 transition-all",
                  currentImage === "pouch"
                    ? "border-primary ring-1 ring-primary"
                    : "border-white/10 hover:border-white/30"
                )}
              >
                <img
                  src={product.pouch}
                  alt="Pouch"
                  className="w-full h-full object-contain"
                />
              </button>
              <button
                onClick={() => setCurrentImage("stick")}
                className={cn(
                  "w-20 h-20 rounded-lg border bg-card p-2 transition-all",
                  currentImage === "stick"
                    ? "border-primary ring-1 ring-primary"
                    : "border-white/10 hover:border-white/30"
                )}
              >
                <img
                  src={product.stick}
                  alt="Stick"
                  className="w-full h-full object-contain"
                />
              </button>
            </div>
          </div>

          {/* Right Column: Details & Purchase */}
          <div className="flex flex-col">
            <h1 className="text-5xl md:text-6xl font-display font-bold text-white mb-4">
              {product.name}
            </h1>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              {product.desc}
            </p>

            <div className="mb-8">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                What's Inside
              </h3>
              <ul className="grid grid-cols-2 gap-y-2 gap-x-4">
                {[
                  "5g Creatine Monohydrate",
                  "Balanced Electrolytes",
                  "Zero Sugar / Zero Stevia",
                  "Natural Monk Fruit Sweetener",
                  "Micronized for Solubility",
                  "Third-Party Tested",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Check className={`w-4 h-4 ${product.color}`} /> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4 mb-8">
              {/* Subscribe */}
              <div
                className={cn(
                  "border rounded-xl p-4 cursor-pointer transition-all relative overflow-hidden",
                  purchaseType === "subscribe"
                    ? "border-primary bg-primary/5"
                    : "border-white/10 hover:border-white/20"
                )}
                onClick={() => setPurchaseType("subscribe")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border flex items-center justify-center",
                        purchaseType === "subscribe"
                          ? "border-primary"
                          : "border-muted-foreground"
                      )}
                    >
                      {purchaseType === "subscribe" && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-white block">
                        Subscribe & Save
                      </span>
                      <span className="text-xs text-primary font-medium">
                        Save 10% + Free Shipping
                      </span>
                    </div>
                  </div>

                  <span className="font-bold text-white">
                    ${pricePerShipmentSub}
                    <span className="text-xs text-muted-foreground font-normal">
                      {" "}
                      / shipment
                    </span>
                  </span>
                </div>

                {purchaseType === "subscribe" && (
                  <div className="mt-4 pl-8 animate-in slide-in-from-top-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                      Delivery Frequency
                    </Label>

                    <Select
                      value={frequency}
                      onValueChange={(v) => setFrequency(v as "2" | "4" | "6")}
                    >
                      <SelectTrigger className="w-full bg-background border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">Every 2 Weeks</SelectItem>
                        <SelectItem value="4">
                          Every 4 Weeks (Most Popular)
                        </SelectItem>
                        <SelectItem value="6">Every 6 Weeks</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="mt-2 text-xs text-muted-foreground">
                      Billed every {frequency} weeks
                      {estimatedMonthly !== null && (
                        <>
                          {" "}
                          • Est. monthly: ${estimatedMonthly.toFixed(2)}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* One-time */}
              <div
                className={cn(
                  "border rounded-xl p-4 cursor-pointer transition-all",
                  purchaseType === "onetime"
                    ? "border-primary bg-primary/5"
                    : "border-white/10 hover:border-white/20"
                )}
                onClick={() => setPurchaseType("onetime")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border flex items-center justify-center",
                        purchaseType === "onetime"
                          ? "border-primary"
                          : "border-muted-foreground"
                      )}
                    >
                      {purchaseType === "onetime" && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="font-bold text-white">
                      One-time Purchase
                    </span>
                  </div>
                  <span className="font-bold text-white">${priceOneTime}</span>
                </div>
              </div>
            </div>

            {/* Quantity & CTA */}
            <div className="flex gap-4 mb-6">
              <div className="flex items-center border border-white/10 rounded-lg bg-white/5 h-14">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 text-white hover:text-primary transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-bold text-white">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(6, quantity + 1))}
                  className="px-4 text-white hover:text-primary transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <Button
                onClick={handleAddToCart}
                className="flex-1 h-14 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider text-lg"
              >
                Add to Cart - ${(currentUnitPrice * quantity).toFixed(2)}
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
              <div className="flex flex-col items-center text-center gap-2">
                <ShieldCheck className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Secure Checkout
                </span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <RotateCcw className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Cancel Anytime
                </span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <Truck className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Ships in 1-3 Days
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
