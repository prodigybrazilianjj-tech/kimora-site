import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { stripe } from "./stripe";

type CheckoutBody = {
  flavor: string; // "Strawberry Guava" etc
  frequency?: "2" | "4" | "6"; // weeks between shipments (UI selection)
  quantity?: number; // number of pouches per shipment
};

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // -----------------------------
  // Helpers
  // -----------------------------
  const siteUrl = process.env.PUBLIC_SITE_URL;
  if (!siteUrl) {
    throw new Error("PUBLIC_SITE_URL is not set");
  }

  const clampInt = (n: unknown, min: number, max: number, fallback: number) => {
    const x = typeof n === "number" ? n : parseInt(String(n ?? ""), 10);
    if (!Number.isFinite(x)) return fallback;
    return Math.max(min, Math.min(max, x));
  };

  const normalizeFrequency = (f: unknown): "2" | "4" | "6" => {
    const v = String(f ?? "4");
    return v === "2" || v === "6" ? v : "4";
  };

  // -----------------------------
  // SUBSCRIPTION CHECKOUT
  // -----------------------------
  app.post("/api/checkout", async (req: Request, res: Response) => {
    try {
      const body = req.body as CheckoutBody;

      const flavor = String(body.flavor || "").trim();
      if (!flavor) {
        return res.status(400).json({ error: "Missing flavor" });
      }

      const frequency = normalizeFrequency(body.frequency);
      const quantity = clampInt(body.quantity, 1, 6, 1);

      // Your pricing:
      // - Subscription base = $44.99 per pouch shipment
      const unitAmount = 4499;

      // Stripe can't do "every 2 weeks" natively for subs in all configs.
      // So we map:
      // - every 2 weeks  => bill every 1 month, quantity 2  (2 shipments per month)
      // - every 4 weeks  => bill every 1 month, quantity 1
      // - every 6 weeks  => bill every 2 months, quantity 1 (closest clean fit)
      //
      // This keeps "what they receive" aligned with billing and is easy to reason about.
      const recurring =
        frequency === "2"
          ? { interval: "month" as const, interval_count: 1 }
          : frequency === "6"
            ? { interval: "month" as const, interval_count: 2 }
            : { interval: "month" as const, interval_count: 1 };

      const effectiveQty = frequency === "2" ? quantity * 2 : quantity;

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: unitAmount,
              product_data: {
                name: `Kimora Creatine + Electrolytes — ${flavor}`,
              },
              recurring,
            },
            quantity: effectiveQty,
          },
        ],
        allow_promotion_codes: true,
        // You can switch these pages later
        success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/shop`,
        metadata: {
          flavor,
          frequency_weeks: frequency,
          quantity: String(quantity),
          type: "subscription",
        },
      });

      return res.json({ url: session.url });
    } catch (err: any) {
      console.error("Checkout (subscription) error:", err);
      return res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // -----------------------------
  // ONE-TIME CHECKOUT
  // -----------------------------
  app.post("/api/checkout-onetime", async (req: Request, res: Response) => {
    try {
      const body = req.body as CheckoutBody;

      const flavor = String(body.flavor || "").trim();
      if (!flavor) {
        return res.status(400).json({ error: "Missing flavor" });
      }

      const quantity = clampInt(body.quantity, 1, 6, 1);

      // One-time price = $49.99
      const unitAmount = 4999;

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: unitAmount,
              product_data: {
                name: `Kimora Creatine + Electrolytes — ${flavor}`,
              },
            },
            quantity,
          },
        ],
        allow_promotion_codes: true,
        success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/shop`,
        metadata: {
          flavor,
          quantity: String(quantity),
          type: "onetime",
        },
      });

      return res.json({ url: session.url });
    } catch (err: any) {
      console.error("Checkout (one-time) error:", err);
      return res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  return httpServer;
}
