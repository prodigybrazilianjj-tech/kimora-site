import { Link } from "wouter";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ArrowRight } from "lucide-react";
import { useCart } from "@/lib/cart";

export default function Cart() {
  const { items, updateQuantity, removeFromCart, subtotal } = useCart();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-8">
            Your Cart
          </h1>

          {items.length === 0 ? (
            <div className="text-center py-24 bg-card border border-white/5 rounded-2xl">
              <p className="text-xl text-muted-foreground mb-6">Your cart is empty.</p>
              <Link href="/shop">
                <Button className="bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider">
                  Start Shopping
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-6 p-4 bg-card border border-white/5 rounded-xl">
                    <div className="w-20 h-20 bg-secondary/30 rounded-lg p-2 flex-shrink-0">
                      <img src={item.image} alt={item.flavor} className="w-full h-full object-contain" />
                    </div>
                    
                    <div className="flex-grow">
                      <h3 className="font-bold text-white text-lg">{item.flavor}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.type === "subscribe" ? `Subscription (Every ${item.frequency} Weeks)` : "One-time Purchase"}
                      </p>
                      <p className="text-sm font-medium text-primary mt-1">${item.price}</p>
                    </div>

                    <div className="flex flex-col items-end gap-4">
                      <div className="flex items-center border border-white/10 rounded-lg bg-white/5 h-8">
                        <button 
                          onClick={() => updateQuantity(item.id, -1)}
                          className="px-2 text-white hover:text-primary transition-colors h-full flex items-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-white">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, 1)}
                          className="px-2 text-white hover:text-primary transition-colors h-full flex items-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="bg-card border border-white/5 rounded-xl p-6 h-fit">
                <h3 className="font-display font-bold text-2xl text-white mb-6">Order Summary</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>
                  <div className="border-t border-white/10 pt-3 flex justify-between text-white font-bold text-lg">
                    <span>Total</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                </div>
                
                <Link href="/checkout">
                  <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider">
                    Checkout <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
