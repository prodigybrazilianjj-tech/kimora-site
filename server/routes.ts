import type { Express } from "express";
import type { Server } from "http";
import { eq, desc } from "drizzle-orm";
import { stripe } from "./stripe";
import { db } from "./db";
import { orders, orderItems } from "../shared/schema";
import crypto from "crypto";
import { Resend } from "resend";

type CheckoutItem = {
  flavor: string; // e.g. "strawberry-guava"
  type: "onetime" | "subscribe";
  frequency?: "2" | "4" | "6"; // required when type === "subscribe"
  quantity: number;
};

function slugToEnvKey(slug: string) {
  return slug.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

function getSiteUrl(req: any) {
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

  return { flavor: "unknown", purchaseType: "onetime", frequencyWeeks: null };
}

/**
 * Stripe customer id is sometimes missing from checkout.session.completed in subscription mode.
 * This helper backfills via the subscription if necessary.
 */
async function getStripeCustomerIdFromCheckoutSession(
  session: any,
): Promise<string | null> {
  let stripeCustomerId: string | null =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;

  if (!stripeCustomerId && session.subscription) {
    try {
      const subId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (subId) {
        const subscription = await stripe.subscriptions.retrieve(subId);
        stripeCustomerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id ?? null;
      }
    } catch (err) {
      console.warn(
        "Failed to retrieve subscription to backfill stripe customer id:",
        err,
      );
    }
  }

  return stripeCustomerId;
}

/**
 * Magic link token (HMAC signed). No DB changes.
 */
function base64url(input: string) {
  return Buffer.from(input).toString("base64url");
}
function unbase64url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}
function signToken(payload: object, secret: string) {
  const body = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}
function verifyToken<T extends { exp?: number }>(
  token: string,
  secret: string,
): T | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [body, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!ok) return null;

  try {
    const payload = JSON.parse(unbase64url(body)) as T;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // Stripe Webhook (Order persistence)
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
        return res.status(400).send("Missing rawBody for webhook verification");
      }

      const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;
        const stripeCustomerId = await getStripeCustomerIdFromCheckoutSession(session);

        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
          limit: 100,
        });

        const inserted = await db
          .insert(orders)
          .values({
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: session.payment_intent ?? null,
            stripeSubscriptionId: session.subscription ?? null,
            stripeCustomerId,
            customerEmail:
              session.customer_details?.email ?? session.customer_email ?? null,
            currency: session.currency ?? "usd",
            amountSubtotal: session.amount_subtotal ?? null,
            amountTotal: session.amount_total ?? null,
            isSubscription: session.mode === "subscription",
            status: session.payment_status || "paid",
            shippingName: session.shipping_details?.name ?? null,
            shippingAddress: session.shipping_details?.address ?? null,
          })
          .onConflictDoNothing({
            target: orders.stripeCheckoutSessionId,
          })
          .returning({ id: orders.id });

        let orderId = inserted?.[0]?.id;

        if (!orderId) {
          const existing = await db
            .select({ id: orders.id })
            .from(orders)
            .where(eq(orders.stripeCheckoutSessionId, session.id))
            .limit(1);

          orderId = existing?.[0]?.id;

          if (stripeCustomerId) {
            await db
              .update(orders)
              .set({ stripeCustomerId })
              .where(eq(orders.stripeCheckoutSessionId, session.id));
          }
        }

        if (orderId) {
          for (const li of lineItems.data) {
            const priceId = li.price?.id ?? null;
            const qty = li.quantity ?? 1;

            const mapped = priceId
              ? mapPriceIdToItem(priceId)
              : {
                  flavor: "unknown",
                  purchaseType: "onetime" as const,
                  frequencyWeeks: null,
                };

            await db
              .insert(orderItems)
              .values({
                orderId,
                stripePriceId: priceId,
                stripeLineItemId: li.id ?? null,
                flavor: mapped.flavor,
                purchaseType: mapped.purchaseType,
                frequencyWeeks: mapped.frequencyWeeks,
                quantity: qty,
                unitAmount: li.price?.unit_amount ?? null,
              })
              .onConflictDoNothing();
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

  /**
   * STEP 1: Request a magic link to manage subscription
   * Body: { email }
   */
  app.post("/api/customer-portal/request", async (req, res) => {
    try {
      const email = String(req.body?.email ?? "").trim().toLowerCase();
      if (!email) return res.status(400).json({ message: "Email is required." });

      const sessionSecret = process.env.SESSION_SECRET;
      if (!sessionSecret) {
        return res.status(500).json({ message: "Missing SESSION_SECRET" });
      }

      // Don’t reveal whether an email exists (prevents enumeration)
      // But we only send if we have a customer id
      const found = await db
        .select({ stripeCustomerId: orders.stripeCustomerId })
        .from(orders)
        .where(eq(orders.customerEmail, email))
        .orderBy(desc(orders.createdAt))
        .limit(1);

      const stripeCustomerId = found?.[0]?.stripeCustomerId ?? null;

      // Always respond 200, but only send if valid customer exists
      if (stripeCustomerId) {
        const siteUrl = getSiteUrl(req);

        const token = signToken(
          {
            email,
            // 15 minute expiry
            exp: Math.floor(Date.now() / 1000) + 15 * 60,
            v: 1,
          },
          sessionSecret,
        );

        const manageUrl = `${siteUrl}/manage-subscription?token=${encodeURIComponent(
          token,
        )}`;

        const resendKey = process.env.RESEND_API_KEY;
        const from = process.env.EMAIL_FROM;

        if (!resendKey || !from) {
          console.warn("Resend not configured (missing RESEND_API_KEY or EMAIL_FROM)");
        } else {
          const resend = new Resend(resendKey);

          await resend.emails.send({
            from,
            to: email,
            subject: "Manage your Kimora subscription",
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.4;">
                <p>Here’s your secure link to manage your Kimora subscription:</p>
                <p><a href="${manageUrl}">Manage Subscription</a></p>
                <p>This link expires in 15 minutes.</p>
                <p>If you didn’t request this, you can ignore this email.</p>
              </div>
            `,
          });
        }
      }

      return res.json({
        ok: true,
        message: "If that email is in our system, you’ll receive a link shortly.",
      });
    } catch (err: any) {
      console.error("POST /api/customer-portal/request error:", err);
      return res.status(500).json({
        message: err?.message || "Failed to send portal link.",
      });
    }
  });

  /**
   * STEP 2: Exchange token for a Stripe Billing Portal session URL
   * Body: { token }
   */
  app.post("/api/customer-portal", async (req, res) => {
    try {
      const token = String(req.body?.token ?? "").trim();
      if (!token) return res.status(400).json({ message: "Token is required." });

      const sessionSecret = process.env.SESSION_SECRET;
      if (!sessionSecret) {
        return res.status(500).json({ message: "Missing SESSION_SECRET" });
      }

      const payload = verifyToken<{ email: string; exp: number; v: number }>(
        token,
        sessionSecret,
      );
      if (!payload?.email) {
        return res.status(401).json({ message: "Invalid or expired link." });
      }

      const email = payload.email.trim().toLowerCase();
      const siteUrl = getSiteUrl(req);

      const found = await db
        .select({ stripeCustomerId: orders.stripeCustomerId })
        .from(orders)
        .where(eq(orders.customerEmail, email))
        .orderBy(desc(orders.createdAt))
        .limit(1);

      const stripeCustomerId = found?.[0]?.stripeCustomerId ?? null;
      if (!stripeCustomerId) {
        return res.status(404).json({ message: "No customer found for that link." });
      }

      const portal = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${siteUrl}/account`,
      });

      return res.json({ url: portal.url });
    } catch (err: any) {
      console.error("POST /api/customer-portal error:", err);
      return res
        .status(500)
        .json({ message: err?.message || "Failed to create portal session." });
    }
  });

  // Create Stripe Checkout Session (unchanged)
  app.post("/api/checkout", async (req, res) => {
    try {
      const body = req.body ?? {};

      const items: CheckoutItem[] = Array.isArray(body.items)
        ? body.items
        : body.item
          ? [body.item]
          : [];

      if (!items.length) {
        return res.status(400).json({ message: "No checkout items provided." });
      }

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
        ...(mode === "payment" ? { customer_creation: "always" } : {}),
        line_items: items.map((it) => ({
          price: getPriceId(it),
          quantity: it.quantity,
        })),
        billing_address_collection: "required",
        shipping_address_collection: { allowed_countries: ["US"] },
        success_url: `${siteUrl}/order-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/cart`,
        metadata: { source: "kimora-site", mode },
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
