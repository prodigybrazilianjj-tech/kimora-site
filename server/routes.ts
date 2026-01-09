import type { Express } from "express";
import type { Server } from "http";
import { stripe } from "./stripe";

type Flavor = "strawberry-guava" | "lemon-yuzu" | "raspberry-dragonfruit";
type PurchaseType = "onetime" | "subscribe";
type Frequency = "2" | "4" | "6";

const ONE_TIME_PRICE_ID: Record<Flavor, string> = {
  "strawberry-guava": process.env.STRIPE_PRICE_ONETIME_STRAWBERRY_GUAVA!,
  "lemon-yuzu": process.env.STRIPE_PRICE_ONETIME_LEMON_YUZU!,
  "raspberry-dragonfruit": process.env.STRIPE_PRICE_ONETIME_RASPBERRY_DRAGONFRUIT!,
};

const SUB_PRICE_ID: Record<Flavor, Record<Frequency, string>> = {
  "strawberry-guava": {
    "2": process.env.STRIPE_PRICE_SUB_STRAWBERRY_GUAVA_2W!,
    "4": process.env.STRIPE_PRICE_SUB_STRAWBERRY_GUAVA_4W!,
    "6": process.env.STRIPE_PRICE_SUB_STRAWBERRY_GUAVA_6W!,
  },
  "lemon-yuzu": {
    "2": process.env.STRIPE_PRICE_SUB_LEMON_YUZU_2W!,
    "4": process.env.STRIPE_PRICE_SUB_LEMON_YUZU_4W!,
    "6": process.env.STRIPE_PRICE_SUB_LEMON_YUZU_6W!,
  },
  "raspberry-dragonfruit": {
    "2": process.env.STRIPE_PRICE_SUB_RASPBERRY_DRAGONFRUIT_2W!,
    "4": process.env.STRIPE_PRICE_SUB_RASPBERRY_DRAGONFRUIT_4W!,
    "6": process.env.STRIPE_PRICE_SUB_RASPBERRY_DRAGONFRUIT_6W!,
  },
};

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.post("/api/stripe/checkout", async (req, res) => {
    try {
      const { flavor, purchaseType, frequency, quantity } = req.body as {
        flavor: Flavor;
        purchaseType: PurchaseType;
        frequency?: Frequency;
        quantity?: number;
      };

      if (!flavor || !purchaseType) {
        return res.status(400).json({ message: "Missing flavor or purchaseType" });
      }

      const qty = Math.max(1, Math.min(6, Number(quantity ?? 1)));

      const siteUrl = requiredEnv("PUBLIC_SITE_URL"); // e.g. https://www.kimoraco.com
      const successUrl = `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${siteUrl}/shop`;

      if (purchaseType === "onetime") {
        const priceId = ONE_TIME_PRICE_ID[flavor];
        if (!priceId) return res.status(400).json({ message: "Invalid flavor" });

        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          line_items: [{ price: priceId, quantity: qty }],
          success_url: successUrl,
          cancel_url: cancelUrl,
          automatic_tax: { enabled: false },
        });

        return res.json({ url: session.url });
      }

      // subscribe
      const freq = frequency ?? "4";
      if (!["2", "4", "6"].includes(freq)) {
        return res.status(400).json({ message: "Invalid frequency" });
      }

      const subPriceId = SUB_PRICE_ID[flavor]?.[freq as Frequency];
      if (!subPriceId) return res.status(400).json({ message: "Invalid subscription price" });

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: subPriceId, quantity: qty }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        automatic_tax: { enabled: false },
        // optional: collects phone/address
        // customer_creation: "always",
      });

      return res.json({ url: session.url });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ message: err?.message ?? "Server error" });
    }
  });

  return httpServer;
}
