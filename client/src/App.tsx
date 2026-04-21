// client/src/App.tsx
import { useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { CartProvider } from "@/lib/cart";

import ComingSoon from "@/pages/ComingSoon";
import Home from "@/pages/Home";
import FAQ from "@/pages/FAQ";
import Shop from "@/pages/Shop";
import Product from "@/pages/Product";
import Wholesale from "@/pages/Wholesale";
import WholesaleApply from "@/pages/Wholesaleapply";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import OrderSuccess from "@/pages/OrderSuccess";
import ManageSubscription from "@/pages/ManageSubscription";

import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Refunds from "@/pages/Refunds";

import AdminDashboard from "@/pages/AdminDashboard";

import NotFound from "@/pages/not-found";

/**
 * Scroll to top on route change (Wouter doesn't do this by default)
 * - If there's a hash (#something), we let the page-level hash logic handle it.
 * - Otherwise we scroll to the top.
 */
function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location]);

  return null;
}

function Router() {
  return (
    <>
      <ScrollToTop />

      <Switch>
        <Route path="/" component={ComingSoon} />
        <Route path="/coming-soon" component={ComingSoon} />
        <Route path="/faq" component={FAQ} />

        {/* Pre-launch: consumer purchase routes redirect to coming soon */}
        <Route path="/shop">{() => <Redirect to="/" />}</Route>
        <Route path="/product">{() => <Redirect to="/" />}</Route>
        <Route path="/cart">{() => <Redirect to="/" />}</Route>
        <Route path="/checkout">{() => <Redirect to="/" />}</Route>
        <Route path="/order-success">{() => <Redirect to="/" />}</Route>
        <Route path="/manage-subscription">{() => <Redirect to="/" />}</Route>

        {/* Admin */}
        <Route path="/admin" component={AdminDashboard} />

        {/* Put the more specific route BEFORE /wholesale */}
        <Route path="/wholesale/apply" component={WholesaleApply} />
        <Route path="/wholesale" component={Wholesale} />

        {/* Legal */}
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/refunds" component={Refunds} />

        <Route component={NotFound} />
      </Switch>
    </>
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