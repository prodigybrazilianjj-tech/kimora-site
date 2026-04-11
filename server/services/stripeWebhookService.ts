// server/services/stripeWebhookService.ts
import { eq } from "drizzle-orm";

import { stripe } from "../stripe";
import { db } from "../db";
import { orders, orderItems } from "../../shared/schema";
import { applyInventoryForOrderItem } from "./inventoryService";
import {
  sendOrderConfirmationEmail,
  getStripeCustomerIdFromCheckoutSession,
} from "./emailService";

function slugToEnvKey(slug: string) {
  return slug.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

function normalizeFlavorSlug(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function safeErrSummary(err: any) {
  const message = String(err?.message || "unknown error");
  const code = err?.code || err?.cause?.code || err?.cause?.errno || err?.errno || null;
  const shortMsg = message.length > 180 ? message.slice(0, 180) + "…" : message;
  return { code, message: shortMsg };
}

function envPriceId(
  flavor: string,
  type: "onetime" | "subscribe",
  frequency?: "2" | "4" | "6"
) {
  const flavorKey = slugToEnvKey(normalizeFlavorSlug(flavor));
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
  const flavors = ["strawberry-guava", "lemon-yuzu", "raspberry-dragonfruit"] as const;

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

async function resolveShippingForSession(sessionId: string, sessionLike?: any) {
  try {
    const full: any = await stripe.checkout.sessions.retrieve(sessionId);

    const shippingName =
      full?.shipping_details?.name ?? (sessionLike as any)?.shipping_details?.name ?? null;

    const shippingAddress =
      full?.shipping_details?.address ?? (sessionLike as any)?.shipping_details?.address ?? null;

    if (shippingName || shippingAddress) {
      return { shippingName, shippingAddress };
    }

    const piId =
      (typeof full?.payment_intent === "string" ? full.payment_intent : null) ||
      (typeof (sessionLike as any)?.payment_intent === "string"
        ? (sessionLike as any).payment_intent
        : null);

    if (piId) {
      const pi: any = await stripe.paymentIntents.retrieve(
        piId,
        {
          expand: ["latest_charge"],
        } as any
      );

      const ch: any = pi?.latest_charge ?? null;
      const chShipping = ch?.shipping ?? null;

      if (chShipping?.name || chShipping?.address) {
        return {
          shippingName: chShipping?.name ?? null,
          shippingAddress: chShipping?.address ?? null,
        };
      }
    }

    return { shippingName: null, shippingAddress: null };
  } catch (e) {
    console.warn("[shipping] resolveShippingForSession failed:", safeErrSummary(e));
    return { shippingName: null, shippingAddress: null };
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  const resolvedShipping = await resolveShippingForSession(String(session.id), session);
  const stripeCustomerId = await getStripeCustomerIdFromCheckoutSession(session);
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });

  const inserted = await db
    .insert(orders)
    .values({
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: session.payment_intent ?? null,
      stripeSubscriptionId: session.subscription ?? null,
      stripeCustomerId,
      customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
      currency: session.currency ?? "usd",
      amountSubtotal: session.amount_subtotal ?? null,
      amountTotal: session.amount_total ?? null,
      isSubscription: session.mode === "subscription",
      status: session.payment_status || "paid",
      shippingName: resolvedShipping.shippingName ?? null,
      shippingAddress: resolvedShipping.shippingAddress ?? null,
    })
    .onConflictDoNothing({
      target: orders.stripeCheckoutSessionId,
    })
    .returning({ id: orders.id });

  let orderId = inserted?.[0]?.id;

  if (!orderId) {
    const existing = await db
      .select({
        id: orders.id,
        shippingName: orders.shippingName,
        shippingAddress: orders.shippingAddress,
      })
      .from(orders)
      .where(eq(orders.stripeCheckoutSessionId, session.id))
      .limit(1);

    orderId = existing?.[0]?.id;

    const hadName = Boolean(existing?.[0]?.shippingName);
    const hadAddr = Boolean(existing?.[0]?.shippingAddress);

    if (
      (!hadName || !hadAddr) &&
      (resolvedShipping.shippingName || resolvedShipping.shippingAddress)
    ) {
      await db
        .update(orders)
        .set({
          shippingName: resolvedShipping.shippingName ?? existing?.[0]?.shippingName ?? null,
          shippingAddress:
            resolvedShipping.shippingAddress ?? existing?.[0]?.shippingAddress ?? null,
        })
        .where(eq(orders.stripeCheckoutSessionId, session.id));
    }

    if (stripeCustomerId) {
      await db
        .update(orders)
        .set({ stripeCustomerId })
        .where(eq(orders.stripeCheckoutSessionId, session.id));
    }
  }

  const wasNewInsert = Boolean(inserted?.length);

  if (orderId) {
    for (const li of lineItems.data) {
      const priceId = li.price?.id ?? null;
      const qty = li.quantity ?? 1;

      const mapped = priceId
        ? mapPriceIdToItem(String(priceId))
        : {
            flavor: "unknown",
            purchaseType: "onetime" as const,
            frequencyWeeks: null,
          };

      const insertedOrderItem = await db
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
          fulfillmentStatus: "unfulfilled",
          carrier: null,
          trackingNumber: null,
          shippedAt: null,
          deliveredAt: null,
        })
        .onConflictDoNothing()
        .returning({ id: orderItems.id });

      if (wasNewInsert && insertedOrderItem?.[0]?.id) {
        await applyInventoryForOrderItem({
          orderId,
          orderItemId: insertedOrderItem[0].id,
          flavor: mapped.flavor,
          quantity: qty,
        });
      }
    }
  }

  if (wasNewInsert) {
    await sendOrderConfirmationEmail({
      session,
      lineItems: lineItems.data,
      isSubscription: session.mode === "subscription" || Boolean(session.subscription),
    });
  }

  return {
    ok: true as const,
    orderId: orderId ?? null,
    insertedOrder: wasNewInsert,
  };
}

export async function processStripeWebhook(rawBody: Buffer, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    const err: any = new Error("Missing STRIPE_WEBHOOK_SECRET");
    err.statusCode = 500;
    throw err;
  }

  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any;

      const result = await handleCheckoutSessionCompleted(session);

      return {
        received: true as const,
        eventId: event.id,
        eventType: event.type,
        ...result,
      };
    }

    default:
      return {
        received: true as const,
        eventId: event.id,
        eventType: event.type,
        ignored: true as const,
      };
  }
}
