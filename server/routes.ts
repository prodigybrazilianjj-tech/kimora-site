import type { Express } from "express";
import type { Server } from "http";
import { stripe } from "./stripe";

type CheckoutItem = {
  flavor: string; // e.g. "strawberry-guava"
  type: "onetime" | "subscribe";
  frequency?: "2" | "4" | "6"; // required when type === "subscribe"
  quantity: number;
};

function slugToEnvKey(slug: string) {
  // "strawberry-guava" -> "STRAWBERRY_GUAVA"
  return slug.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

function getSiteUrl(req: any) {
  // Use Render env in prod; fallback for dev
  return (
    process.env.PUBLIC_SITE_URL ||
    req.headers.origin ||
    "http://localhost:5173"
  );
}

function getPriceId(item: CheckoutItem) {
  const flavorKey = slugToEnvKey(item.flavor);

  if (item.type === "onetime") {
    const envName = `STRIPE_PRICE_${flavorKey}_ONETIME`;
    const priceId = process.env[envName];
    if (!priceId) throw new Error(`Missing env var: ${envName}`);
    return priceId;
  }

  // subscribe
  if (!item.frequency) throw new Error("Missing frequency for subscription.");
  const envName = `STRIPE_PRICE_${flavorKey}_SUB_${item.frequency}W`;
  const priceId = process.env[envName];
  if (!priceId) throw new Error(`Missing env var: ${envName}`);
  return priceId;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Health check (optional)
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // Create Stripe Checkout Session
  app.post("/api/checkout", async (req, res) => {
    try {
      const body = req.body ?? {};

      // Allow either { item: {...} } or { items: [...] }
      const items: CheckoutItem[] = Array.isArray(body.items)
        ? body.items
        : body.item
          ? [body.item]
          : [];

      if (!items.length) {
        return res.status(400).json({ message: "No checkout items provided." });
      }

      // Validate
      for (const it of items) {
        if (!it.flavor) return res.status(400).json({ message: "Missing flavor." });
        if (it.type !== "onetime" && it.type !== "subscribe") {
          return res.status(400).json({ message: "Invalid type." });
        }
        if (!Number.isInteger(it.quantity) || it.quantity < 1 || it.quantity > 20) {
          return res.status(400).json({ message: "Invalid quantity." });
        }
        if (it.type === "subscribe") {
          if (it.frequency !== "2" && it.frequency !== "4" && it.frequency !== "6") {
            return res.status(400).json({ message: "Invalid frequency." });
          }
        }
      }

      // Stripe Checkout cannot mix payment + subscription in one session
      const hasSub = items.some((i) => i.type === "subscribe");
      const hasOne = items.some((i) => i.type === "onetime");
      if (hasSub && hasOne) {
        return res.status(400).json({
          message:
            "You can’t checkout subscription and one-time items together. Please checkout separately.",
        });
      }

      const mode: "payment" | "subscription" = hasSub ? "subscription" : "payment";
      const siteUrl = getSiteUrl(req);

      const session = await stripe.checkout.sessions.create({
        mode,
        line_items: items.map((it) => ({
          price: getPriceId(it),
          quantity: it.quantity,
        })),

        billing_address_collection: "required",
        shipping_address_collection: { allowed_countries: ["US"] },

        // Adjust these routes if you want different pages
        success_url: `${siteUrl}/checkout?success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/cart`,

        // Helpful for debugging / later fulfillment
        metadata: {
          source: "kimora-site",
          mode,
        },
      });

      if (!session.url) {
        return res.status(500).json({ message: "Stripe session created, but no URL returned." });
      }

      return res.json({ url: session.url });
    } catch (err: any) {
      console.error("POST /api/checkout error:", err);
      return res.status(500).json({ message: err?.message || "Checkout failed." });
    }
  });

  return httpServer;
}
