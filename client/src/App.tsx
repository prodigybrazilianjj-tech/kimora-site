import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { CartProvider } from "@/lib/cart";

import Home from "@/pages/Home";
import FAQ from "@/pages/FAQ";
import Shop from "@/pages/Shop";
import Product from "@/pages/Product";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import OrderSuccess from "@/pages/OrderSuccess";
import ManageSubscription from "./pages/ManageSubscription";

import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Refunds from "@/pages/Refunds";

import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/faq" component={FAQ} />
      <Route path="/shop" component={Shop} />
      <Route path="/product" component={Product} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/manage-subscription" component={ManageSubscription} />


      {/* Legal */}
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/refunds" component={Refunds} />
      <Route path="/order-success" component={OrderSuccess} />

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <Toaster />
        <Router />
      </CartProvider>
    </QueryClientProvider>
  );
}
