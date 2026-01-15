import type { Express } from "express";
import type { Server } from "http";
import { stripe } from "./stripe";

import { db } from "./db";
import { orders, orderItems } from "../shared/schema";

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

function envPriceId(
  flavor: string,
  type: "onetime" | "subscribe",
  frequency?: "2" | "4" | "6",
) {
  const flavorKey = slugToEnvKey(flavor);
  const envName =
    type === "onetime"
      ? `STRIPE_PRICE_${flavorKey}_ONETIME`
      : `STRIPE_PRICE_${flavorKey}_SUB_${frequency}W`;

  return process.env[envName] || null;
}

function mapPriceIdToItem(priceId: string): {
  flavor: string;
  purchaseType: "onetime" | "subscribe";
  frequencyWeeks: number | null;
} {
  const flavors = [
    "strawberry-guava",
    "lemon-yuzu",
    "raspberry-dragonfruit",
  ] as const;

  for (const flavor of flavors) {
    const onetime = envPriceId(flavor, "onetime");
    if (onetime === priceId) {
      return { flavor, purchaseType: "onetime", frequencyWeeks: null };
    }

    for (const f of ["2", "4", "6"] as const) {
      const sub = envPriceId(flavor, "subscribe", f);
      if (sub === priceId) {
        return { flavor, purchaseType: "subscribe", frequencyWeeks: Number(f) };
      }
    }
  }

  // Fallback so we still store something instead of failing the webhook
  return { flavor: "unknown", purchaseType: "onetime", frequencyWeeks: null };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Health check (optional)
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // Stripe Webhook (Order persistence)
  // NOTE: This expects req.rawBody (Buffer) to be captured in server/index.ts via express.json({ verify })
  app.post("/api/stripe/webhook", async (req, res) => {
    try {
      const sig = req.headers["stripe-signature"];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!sig || typeof sig !== "string") {
        return res.status(400).send("Missing Stripe-Signature header");
      }
      if (!webhookSecret) {
        return res.status(500).send("Missing STRIPE_WEBHOOK_SECRET");
      }

      const rawBody = (req as any).rawBody as Buffer | undefined;
      if (!rawBody) {
        return res
          .status(400)
          .send("Missing rawBody for webhook verification");
      }

      const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;

        // Pull line items from Stripe
        const lineItems = await stripe.checkout.sessions.listLineItems(
          session.id,
          { limit: 100 },
        );

        // Create order row
        const inserted = await db
          .insert(orders)
          .values({
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: session.payment_intent ?? null,
            stripeSubscriptionId: session.subscription ?? null,

            customerEmail:
              session.customer_details?.email ??
              session.customer_email ??
              null,

            currency: session.currency ?? "usd",
            amountSubtotal: session.amount_subtotal ?? null,
            amountTotal: session.amount_total ?? null,

            isSubscription: session.mode === "subscription",
            status: session.payment_status || "paid",

            shippingName: session.shipping_details?.name ?? null,
            shippingAddress: session.shipping_details?.address ?? null,
          })
          .returning({ id: orders.id });

        const orderId = inserted?.[0]?.id;

        if (orderId) {
          for (const li of lineItems.data) {
            const priceId = li.price?.id;
            const qty = li.quantity ?? 1;

            const mapped = priceId
              ? mapPriceIdToItem(priceId)
              : {
                  flavor: "unknown",
                  purchaseType: "onetime" as const,
                  frequencyWeeks: null,
                };

            await db.insert(orderItems).values({
              orderId,
              flavor: mapped.flavor,
              purchaseType: mapped.purchaseType,
              frequencyWeeks: mapped.frequencyWeeks,
              quantity: qty,
              unitAmount: li.price?.unit_amount ?? null,
            });
          }
        }
      }

      return res.json({ received: true });
    } catch (err: any) {
      console.error("Stripe webhook error:", err?.message || err);
      return res
        .status(400)
        .send(`Webhook Error: ${err?.message || "Unknown error"}`);
    }
  });

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
        if (!it.flavor)
          return res.status(400).json({ message: "Missing flavor." });
        if (it.type !== "onetime" && it.type !== "subscribe") {
          return res.status(400).json({ message: "Invalid type." });
        }
        if (
          !Number.isInteger(it.quantity) ||
          it.quantity < 1 ||
          it.quantity > 20
        ) {
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

      const mode: "payment" | "subscription" = hasSub
        ? "subscription"
        : "payment";

      const siteUrl = getSiteUrl(req);

      const session = await stripe.checkout.sessions.create({
        mode,
        line_items: items.map((it) => ({
          price: getPriceId(it),
          quantity: it.quantity,
        })),

        billing_address_collection: "required",
        shipping_address_collection: { allowed_countries: ["US"] },

        // Redirects
        success_url: `${siteUrl}/checkout?success=1&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/cart`,

        metadata: {
          source: "kimora-site",
          mode,
        },
      });

      if (!session.url) {
        return res.status(500).json({
          message: "Stripe session created, but no URL returned.",
        });
      }

      return res.json({ url: session.url });
    } catch (err: any) {
      console.error("POST /api/checkout error:", err);
      return res
        .status(500)
        .json({ message: err?.message || "Checkout failed." });
    }
  });

  return httpServer;
}
