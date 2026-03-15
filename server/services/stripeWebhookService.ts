// server/services/stripeWebhookService.ts
import { eq } from "drizzle-orm";
import { Resend } from "resend";

import { stripe } from "../stripe";
import { db } from "../db";
import { orders, orderItems } from "../../shared/schema";
import { applyInventoryForOrderItem } from "./inventoryService";

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

function getSiteUrl() {
  return (
    process.env.PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === "production" ? "https://kimoraco.com" : "http://localhost:5173")
  );
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeString(v: any, maxLen = 20000) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function safeErrSummary(err: any) {
  const message = String(err?.message || "unknown error");
  const code = err?.code || err?.cause?.code || err?.cause?.errno || err?.errno || null;
  const shortMsg = message.length > 180 ? message.slice(0, 180) + "…" : message;
  return { code, message: shortMsg };
}

function titleizeSlug(value: string | null | undefined) {
  return String(value || "")
    .split(/[-\s]+/g)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .filter(Boolean)
    .join(" ");
}

function toOrderNumber(sessionId: string | null | undefined) {
  const s = safeString(sessionId || "", 200);
  return s.replace(/^cs_/, "");
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

async function getStripeCustomerIdFromCheckoutSession(session: any): Promise<string | null> {
  let stripeCustomerId: string | null =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  if (!stripeCustomerId && session.subscription) {
    try {
      const subId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

      if (subId) {
        const subscription = await stripe.subscriptions.retrieve(subId);
        stripeCustomerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id ?? null;
      }
    } catch (err) {
      console.warn("Failed to retrieve subscription to backfill stripe customer id:", err);
    }
  }

  return stripeCustomerId;
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

function formatMoney(amountCents: number | null | undefined, currency: string | null | undefined) {
  if (amountCents === null || amountCents === undefined) return "";
  const ccy = String(currency || "usd").toUpperCase();
  const dollars = amountCents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: ccy,
    }).format(dollars);
  } catch {
    return `${ccy} ${dollars.toFixed(2)}`;
  }
}

function addressToOneLine(addr: any): string {
  if (!addr) return "";
  const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country]
    .map((x: any) => String(x || "").trim())
    .filter(Boolean);
  return parts.join(", ");
}

async function sendOrderConfirmationEmail(args: {
  session: any;
  lineItems: any[];
  isSubscription: boolean;
}) {
  const resendKey = String(process.env.RESEND_API_KEY || "").trim();
  const fromEmail = String(process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "").trim();
  if (!resendKey || !fromEmail) {
    console.warn(
      "[order-email] Resend not configured (missing RESEND_API_KEY or RESEND_FROM_EMAIL/EMAIL_FROM)."
    );
    return;
  }

  const resend = new Resend(resendKey);
  const from = fromEmail.includes("<") ? fromEmail : `Kimora Co <${fromEmail}>`;

  const siteUrl = getSiteUrl();

  const email =
    normalizeEmail(
      String(args.session?.customer_details?.email ?? args.session?.customer_email ?? "")
    ) || "";

  if (!email || !isValidEmail(email)) {
    console.warn("[order-email] Missing/invalid customer email; skipping send.");
    return;
  }

  const name = safeString(args.session?.customer_details?.name, 200);
  const shippingName = safeString(args.session?.shipping_details?.name, 200) || name;
  const shippingAddr = args.session?.shipping_details?.address || null;

  const currency = String(args.session?.currency || "usd");
  const amountSubtotal = args.session?.amount_subtotal ?? null;
  const amountTotal = args.session?.amount_total ?? null;

  const sessionId = String(args.session?.id || "").trim();
  const orderNumber = toOrderNumber(sessionId);

  const lines = (args.lineItems || []).map((li: any) => {
    const qty = Number(li?.quantity ?? 1) || 1;
    const priceId = li?.price?.id ?? null;
    const mapped = priceId
      ? mapPriceIdToItem(String(priceId))
      : {
          flavor: "unknown",
          purchaseType: args.isSubscription ? "subscribe" : "onetime",
          frequencyWeeks: null,
        };

    const unit = li?.price?.unit_amount ?? null;
    const lineTotal = unit !== null && unit !== undefined ? unit * qty : null;

    return {
      qty,
      flavor: mapped.flavor,
      purchaseType: mapped.purchaseType,
      frequencyWeeks: mapped.frequencyWeeks,
      unitAmount: unit,
      lineTotal,
    };
  });

  const subject = args.isSubscription
    ? "Kimora Co — Subscription confirmed"
    : "Kimora Co — Order confirmed";

  const manageLink = `${siteUrl}/manage-subscription`;
  const supportEmail = "support@kimoraco.com";

  const itemsText = lines
    .map((l: any) => {
      const flavor = titleizeSlug(l.flavor);
      const cadence =
        l.purchaseType === "subscribe" && l.frequencyWeeks
          ? ` (Subscription — every ${l.frequencyWeeks} weeks)`
          : "";
      const money = l.unitAmount != null ? ` @ ${formatMoney(l.unitAmount, currency)}` : "";
      const total = l.lineTotal != null ? ` = ${formatMoney(l.lineTotal, currency)}` : "";
      return `- ${flavor} x${l.qty}${cadence}${money}${total}`;
    })
    .join("\n");

  const text =
    `Thanks${shippingName ? `, ${shippingName}` : ""} — your Kimora order is confirmed.\n\n` +
    (orderNumber ? `Order: ${orderNumber}\n` : "") +
    (itemsText ? `\nItems:\n${itemsText}\n` : "") +
    (amountSubtotal != null ? `\nSubtotal: ${formatMoney(amountSubtotal, currency)}\n` : "") +
    (amountTotal != null ? `Total: ${formatMoney(amountTotal, currency)}\n` : "") +
    (shippingAddr
      ? `\nShipping to:\n${shippingName || "(name)"}\n${addressToOneLine(shippingAddr)}\n`
      : "") +
    (args.isSubscription ? `\nManage your subscription anytime:\n${manageLink}\n` : "") +
    `\nNeed help? Reply to this email or contact ${supportEmail}.\n\n` +
    `OUT-TRAIN. OUT-SMART. OUT-LAST.\n`;

  const itemsHtml = lines
    .map((l: any) => {
      const flavor = escapeHtml(titleizeSlug(l.flavor));
      const cadence =
        l.purchaseType === "subscribe" && l.frequencyWeeks
          ? ` <span style="color:#666;">(Subscription — every ${l.frequencyWeeks} weeks)</span>`
          : "";
      const money =
        l.unitAmount != null
          ? ` <span style="color:#666;">@ ${escapeHtml(formatMoney(l.unitAmount, currency))}</span>`
          : "";
      const total =
        l.lineTotal != null
          ? ` <span style="color:#111;font-weight:600;">${escapeHtml(
              formatMoney(l.lineTotal, currency)
            )}</span>`
          : "";
      return `<li style="margin:6px 0;">${flavor} <b>x${l.qty}</b>${cadence}${money}${
        total ? ` — ${total}` : ""
      }</li>`;
    })
    .join("");

  const html = `<div style="font-family: ui-sans-serif, system-ui; line-height:1.5; color:#111;">
  <h2 style="margin:0 0 10px;">Order confirmed 🎉</h2>
  <p style="margin:0 0 14px;">
    Thanks${shippingName ? `, <b>${escapeHtml(shippingName)}</b>` : ""}. Your Kimora order is confirmed.
  </p>

  ${
    orderNumber
      ? `<div style="margin:0 0 12px;color:#444;"><b>Order:</b> ${escapeHtml(orderNumber)}</div>`
      : ""
  }

  ${
    itemsHtml
      ? `<div style="margin:0 0 10px;"><b>Items</b></div>
  <ul style="margin:0 0 14px;padding-left:18px;">${itemsHtml}</ul>`
      : ""
  }

  <div style="margin:0 0 12px;">
    ${
      amountSubtotal != null
        ? `<div><b>Subtotal:</b> ${escapeHtml(formatMoney(amountSubtotal, currency))}</div>`
        : ""
    }
    ${
      amountTotal != null
        ? `<div><b>Total:</b> ${escapeHtml(formatMoney(amountTotal, currency))}</div>`
        : ""
    }
  </div>

  ${
    shippingAddr
      ? `<div style="margin:0 0 14px;">
          <div><b>Shipping to</b></div>
          <div style="color:#444;">${escapeHtml(shippingName || "(name)")}</div>
          <div style="color:#444;">${escapeHtml(addressToOneLine(shippingAddr))}</div>
        </div>`
      : ""
  }

  ${
    args.isSubscription
      ? `<div style="margin:16px 0 12px;">
          <a href="${manageLink}" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#111;color:#fff;text-decoration:none;">
            Manage subscription
          </a>
          <div style="margin-top:8px;font-size:12px;color:#666;">
            Pause, cancel, or change frequency anytime.
          </div>
        </div>`
      : ""
  }

  <div style="margin:16px 0 0;font-size:12px;color:#666;">
    Need help? Reply to this email or contact
    <a href="mailto:${supportEmail}">${supportEmail}</a>.
  </div>

  <div style="margin:14px 0 0;font-size:12px;letter-spacing:0.08em;color:#999;text-transform:uppercase;">
    OUT-TRAIN. OUT-SMART. OUT-LAST.
  </div>
</div>`;

  try {
    await resend.emails.send({
      from,
      to: email,
      subject,
      text,
      html,
      replyTo: supportEmail,
    } as any);
  } catch (e: any) {
    const s = safeErrSummary(e);
    console.error("[order-email] send failed:", s);
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