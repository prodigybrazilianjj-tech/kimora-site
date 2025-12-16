import { Link } from "wouter";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/lib/cart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Checkout() {
  const { subtotal } = useCart();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-32 pb-24">
        <div className="container px-4 mx-auto max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Checkout Form */}
            <div>
              <h1 className="text-3xl font-display font-bold text-white mb-8">Checkout</h1>
              
              <form className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider border-b border-white/10 pb-2">Contact</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="alex@example.com" className="bg-white/5 border-white/10 text-white" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider border-b border-white/10 pb-2">Shipping</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" placeholder="First Name" className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" placeholder="Last Name" className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input id="address" placeholder="123 Main St" className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" placeholder="City" className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input id="zip" placeholder="ZIP" className="bg-white/5 border-white/10 text-white" />
                    </div>
                  </div>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button type="button" className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider text-lg mt-8">
                      Place Order
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-white/10 text-white">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-display">Checkout Coming Soon</DialogTitle>
                      <DialogDescription className="text-muted-foreground pt-4">
                        We are currently in pre-launch mode. Payment processing is not yet active. 
                        <br /><br />
                        Please join our waitlist on the homepage to be notified when we officially launch.
                      </DialogDescription>
                    </DialogHeader>
                    <Link href="/">
                      <Button className="w-full mt-4 bg-white/10 hover:bg-white/20">Back to Homepage</Button>
                    </Link>
                  </DialogContent>
                </Dialog>
              </form>
            </div>

            {/* Order Preview */}
            <div className="lg:pl-12 lg:border-l border-white/10">
               <div className="bg-card/50 p-6 rounded-xl border border-white/5 sticky top-32">
                 <h3 className="text-lg font-bold text-white mb-6">Order Summary</h3>
                 <div className="flex justify-between mb-4">
                   <span className="text-muted-foreground">Subtotal</span>
                   <span className="text-white font-medium">${subtotal.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between mb-4">
                   <span className="text-muted-foreground">Shipping</span>
                   <span className="text-white font-medium">Free</span>
                 </div>
                 <div className="border-t border-white/10 pt-4 flex justify-between">
                   <span className="text-xl font-bold text-white">Total</span>
                   <span className="text-xl font-bold text-primary">${subtotal.toFixed(2)}</span>
                 </div>
               </div>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
