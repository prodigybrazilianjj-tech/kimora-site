// client/src/App.tsx
import { useEffect } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { CartProvider } from "@/lib/cart";
import { PRELAUNCH_GATE } from "@/lib/prelaunch";

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

import Learn from "@/pages/Learn";
import Article from "@/pages/Article";

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

/**
 * Pre-launch gate. Driven by PRELAUNCH_GATE in src/lib/prelaunch.ts.
 *
 * When gated:
 *  - Home / Shop / Product are BROWSABLE (products + prices visible).
 *  - The purchase flow (Cart / Checkout / Order Success / Manage Subscription)
 *    redirects home — nothing is buyable.
 *
 * Staging override: set VITE_PRELAUNCH_REDIRECTS=false to open the purchase
 * routes for pixel/QA even while gated. Anything other than the literal
 * string "false" keeps the gate on, so a missing env var stays safe.
 */
const PURCHASE_GATED =
  PRELAUNCH_GATE &&
  String((import.meta as any).env?.VITE_PRELAUNCH_REDIRECTS ?? "true").toLowerCase() !==
    "false";

function Router() {
  return (
    <>
      <ScrollToTop />

      <Switch>
        {/* Pre-launch front door. Home is the launch-day homepage and lives at
            /preview-home until then — flip these two lines to go live. */}
        <Route path="/" component={PRELAUNCH_GATE ? ComingSoon : Home} />
        {PRELAUNCH_GATE && <Route path="/preview-home" component={Home} />}

        {/* Old direct link, kept so bookmarks and any ad URLs still land. */}
        <Route path="/coming-soon">{() => <Redirect to="/" />}</Route>
        <Route path="/faq" component={FAQ} />

        {/* Storefront is always browsable so visitors can see products + prices. */}
        <Route path="/shop" component={Shop} />
        <Route path="/product" component={Product} />

        {/* Pre-launch: the purchase flow redirects home (nothing is buyable)
            unless VITE_PRELAUNCH_REDIRECTS=false (staging branch for QA). */}
        {PURCHASE_GATED ? (
          <>
            <Route path="/cart">{() => <Redirect to="/" />}</Route>
            <Route path="/checkout">{() => <Redirect to="/" />}</Route>
            <Route path="/order-success">{() => <Redirect to="/" />}</Route>
            <Route path="/manage-subscription">{() => <Redirect to="/" />}</Route>
          </>
        ) : (
          <>
            <Route path="/cart" component={Cart} />
            <Route path="/checkout" component={Checkout} />
            <Route path="/order-success" component={OrderSuccess} />
            <Route path="/manage-subscription" component={ManageSubscription} />
          </>
        )}

        {/* Admin */}
        <Route path="/admin" component={AdminDashboard} />

        {/* Put the more specific route BEFORE /wholesale */}
        <Route path="/wholesale/apply" component={WholesaleApply} />
        <Route path="/wholesale" component={Wholesale} />

        {/* Content. Specific before parameterised, same rule as /wholesale
            above: wouter takes the first match in the Switch, and "/learn/:slug"
            would happily swallow "/learn" if the segment were optional — it
            isn't, but the ordering is the convention here and cheap to keep.
            An unknown slug renders NotFound from inside Article, so a bad URL
            under /learn behaves like any other 404. */}
        <Route path="/learn" component={Learn} />
        <Route path="/learn/:slug" component={Article} />

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