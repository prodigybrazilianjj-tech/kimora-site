// server/routes.ts
import type { Express } from "express";
import type { Server } from "http";
import { eq, desc, sql, and, or, inArray } from "drizzle-orm";
import crypto from "crypto";
import { Resend } from "resend";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { stripe } from "./stripe";
import { db } from "./db";
import { orders, orderItems, wholesaleApplications } from "../shared/schema";

type CheckoutItem = {
  flavor: string;
  type: "onetime" | "subscribe";
  frequency?: "2" | "4" | "6";
  quantity: number;
};

function slugToEnvKey(slug: string) {
  return slug.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
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

function onlyDigits(s: string) {
  return s.replace(/[^\d]/g, "");
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
    .split("-")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .filter(Boolean)
    .join(" ");
}

function trackingUrlFor(
  carrier: string | null | undefined,
  trackingNumber: string | null | undefined
) {
  const tracking = safeString(trackingNumber || "", 120);
  if (!tracking) return null;

  const carrierKey = safeString(carrier || "", 40).toLowerCase();

  if (carrierKey.includes("usps")) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(tracking)}`;
  }

  if (carrierKey.includes("ups")) {
    return `https://www.ups.com/track?tracknum=${encodeURIComponent(tracking)}`;
  }

  if (carrierKey.includes("fedex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(tracking)}`;
  }

  if (carrierKey.includes("dhl")) {
    return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${encodeURIComponent(
      tracking
    )}`;
  }

  return null;
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
  frequency?: "2" | "4" | "6"
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

async function findStripeCustomerIdByEmail(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email);
  if (!normalized || !isValidEmail(normalized)) return null;

  try {
    const found = await db
      .select({ stripeCustomerId: orders.stripeCustomerId })
      .from(orders)
      .where(eq(orders.customerEmail, normalized))
      .orderBy(desc(orders.createdAt))
      .limit(1);

    const dbCustomerId = found?.[0]?.stripeCustomerId ?? null;
    if (dbCustomerId) return dbCustomerId;
  } catch (e) {
    console.warn("[checkout] DB customer lookup failed:", safeErrSummary(e));
  }

  try {
    const list = await stripe.customers.list({
      email: normalized,
      limit: 1,
    });
    return list.data?.[0]?.id ?? null;
  } catch (e) {
    console.warn("[checkout] Stripe customer lookup failed:", safeErrSummary(e));
    return null;
  }
}

function isValidPhoneDigits(digits: string) {
  return /^\d{10,}$/.test(digits);
}

function parsePositiveInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const n = Math.trunc(value);
    return n > 0 ? n : null;
  }

  const digits = onlyDigits(String(value));
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return i > 0 ? i : null;
}

function adminTokenFromReq(req: any) {
  const header =
    String(req.headers["x-admin-token"] ?? "").trim() ||
    String(req.headers["authorization"] ?? "").trim();

  if (!header) return "";

  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  return header;
}

function requireAdmin(req: any, res: any) {
  const expected = String(process.env.ADMIN_DASHBOARD_TOKEN ?? "").trim();
  if (!expected) {
    return res.status(500).json({
      ok: false,
      message: "ADMIN_DASHBOARD_TOKEN is not set on the server.",
    });
  }

  const got = adminTokenFromReq(req);
  if (!got || got !== expected) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  return null;
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
  const orderNumber = sessionId ? sessionId.replace(/^cs_/, "") : "";

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

async function sendShippingNotificationEmail(args: {
  customerEmail: string;
  shippingName?: string | null;
  orderId?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
}) {
  const resendKey = String(process.env.RESEND_API_KEY || "").trim();
  const fromEmail = String(process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "").trim();
  if (!resendKey || !fromEmail) return;

  const email = normalizeEmail(String(args.customerEmail || ""));
  if (!email || !isValidEmail(email)) return;

  const resend = new Resend(resendKey);
  const from = fromEmail.includes("<") ? fromEmail : `Kimora Co <${fromEmail}>`;
  const supportEmail = "support@kimoraco.com";

  const carrier = safeString(args.carrier || "", 40);
  const tracking = safeString(args.trackingNumber || "", 120);
  const name = safeString(args.shippingName || "", 200);
  const trackingUrl = trackingUrlFor(carrier, tracking);

  const subject = "Kimora Co — Your order is on the way";

  const orderLine = args.orderId ? `Order: ${String(args.orderId)}\n` : "";
  const trackingLine = tracking
    ? `Tracking${carrier ? ` (${carrier})` : ""}: ${tracking}\n`
    : "Tracking: (pending)\n";

  const text =
    `Hey${name ? ` ${name}` : ""}, your Kimora order has shipped.\n\n` +
    orderLine +
    trackingLine +
    (trackingUrl ? `Track package: ${trackingUrl}\n` : "") +
    `\nNeed help? Reply to this email or contact ${supportEmail}.\n` +
    `OUT-TRAIN. OUT-SMART. OUT-LAST.\n`;

  const html = `<div style="font-family: ui-sans-serif, system-ui; line-height:1.5; color:#111;">
  <h2 style="margin:0 0 10px;">Shipped ✅</h2>
  <p style="margin:0 0 14px;">
    Hey${name ? ` <b>${escapeHtml(name)}</b>` : ""}, your Kimora order is on the way.
  </p>

  ${
    args.orderId
      ? `<div style="margin:0 0 8px;color:#444;"><b>Order:</b> ${escapeHtml(
          String(args.orderId)
        )}</div>`
      : ""
  }

  <div style="margin:0 0 14px;color:#444;">
    <b>Tracking${carrier ? ` (${escapeHtml(carrier)})` : ""}:</b>
    ${tracking ? escapeHtml(tracking) : "(pending)"}
  </div>

  ${
    trackingUrl
      ? `<div style="margin:0 0 14px;">
          <a href="${trackingUrl}" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#111;color:#fff;text-decoration:none;">
            Track package
          </a>
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
    console.error("[shipping-email] send failed:", s);
  }
}

async function maybeSendShippingEmailForOrder(orderId: string) {
  try {
    const row = await db
      .select({
        id: orders.id,
        customerEmail: orders.customerEmail,
        shippingName: orders.shippingName,
        shippingCarrier: orders.shippingCarrier,
        shippingTrackingNumber: orders.shippingTrackingNumber,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    const order = row?.[0];
    if (!order?.customerEmail) return;

    if (order.shippingTrackingNumber) {
      await sendShippingNotificationEmail({
        customerEmail: order.customerEmail,
        shippingName: order.shippingName ?? null,
        orderId: order.id,
        carrier: order.shippingCarrier ?? null,
        trackingNumber: order.shippingTrackingNumber ?? null,
      });
      return;
    }

    const itemRow = await db
      .select({
        carrier: orderItems.carrier,
        trackingNumber: orderItems.trackingNumber,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .limit(1);

    const item = itemRow?.[0];
    if (item?.trackingNumber) {
      await sendShippingNotificationEmail({
        customerEmail: order.customerEmail,
        shippingName: order.shippingName ?? null,
        orderId: order.id,
        carrier: item.carrier ?? null,
        trackingNumber: item.trackingNumber ?? null,
      });
    }
  } catch (e) {
    console.warn("[shipping-email] maybeSendShippingEmailForOrder failed:", safeErrSummary(e));
  }
}

async function computeCartSubtotalCentsFromStripePrices(
  lineItems: Array<{ price: string; quantity: number }>
): Promise<number> {
  const cache = new Map<string, any>();
  let subtotal = 0;

  for (const li of lineItems) {
    const priceId = String(li.price || "").trim();
    const qty = Number(li.quantity ?? 1) || 1;
    if (!priceId || qty < 1) continue;

    let price = cache.get(priceId);
    if (!price) {
      price = await stripe.prices.retrieve(priceId);
      cache.set(priceId, price);
    }

    const unit = (price as any)?.unit_amount;
    if (typeof unit === "number" && Number.isFinite(unit)) {
      subtotal += unit * qty;
    }
  }

  return subtotal;
}

function buildShippingOptions(params: { currency: string; subtotalCents: number }): any[] {
  const currency = params.currency || "usd";

  const FREE_THRESHOLD_CENTS = 10000;
  const isFree = params.subtotalCents >= FREE_THRESHOLD_CENTS;

  if (isFree) {
    return [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 0, currency },
          display_name: "Free Shipping (orders $100+)",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 3 },
            maximum: { unit: "business_day", value: 7 },
          },
        },
      },
    ];
  }

  return [
    {
      shipping_rate_data: {
        type: "fixed_amount",
        fixed_amount: { amount: 500, currency },
        display_name: "Standard Shipping",
        delivery_estimate: {
          minimum: { unit: "business_day", value: 3 },
          maximum: { unit: "business_day", value: 7 },
        },
      },
    },
  ];
}

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

function verifyToken<T>(token: string, secret: string): T | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [body, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");

  if (sig.length !== expected.length) return null;

  const ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!ok) return null;

  try {
    const payload = JSON.parse(unbase64url(body)) as T;
    const exp = (payload as any)?.exp as number | undefined;
    const now = Math.floor(Date.now() / 1000);
    if (typeof exp === "number" && now > exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function pickOrderSearchWhere(q: string) {
  const needle = `%${q}%`;
  return or(
    sql`${orders.customerEmail} ILIKE ${needle}`,
    sql`${orders.stripeCheckoutSessionId} ILIKE ${needle}`,
    sql`${orders.stripePaymentIntentId} ILIKE ${needle}`,
    sql`${orders.stripeSubscriptionId} ILIKE ${needle}`,
    sql`${orders.shippingName} ILIKE ${needle}`
  );
}

const ALLOWED_FULFILLMENT = new Set([
  "unfulfilled",
  "allocated",
  "packed",
  "shipped",
  "delivered",
  "canceled",
  "backordered",
]);

function normalizeFulfillment(v: any) {
  const s = String(v || "").trim().toLowerCase();
  return ALLOWED_FULFILLMENT.has(s) ? s : "unfulfilled";
}

function rollupOrderFulfillment(counts: Record<string, number>) {
  const get = (k: string) => Number(counts[k] ?? 0) || 0;

  const backordered = get("backordered");
  const unfulfilled = get("unfulfilled");
  const allocated = get("allocated");
  const packed = get("packed");
  const shipped = get("shipped");
  const delivered = get("delivered");
  const canceled = get("canceled");

  let top = "unfulfilled";
  if (backordered > 0) top = "backordered";
  else if (unfulfilled > 0) top = "unfulfilled";
  else if (allocated > 0) top = "allocated";
  else if (packed > 0) top = "packed";
  else if (shipped > 0) top = "shipped";
  else if (delivered > 0) top = "delivered";
  else if (canceled > 0) top = "canceled";

  return { fulfillmentStatus: top, fulfillmentCounts: counts };
}

function getShipFromAddress() {
  return {
    name: safeString(process.env.SHIP_FROM_NAME || "Kimora Co", 80) || "Kimora Co",
    street1: safeString(process.env.SHIP_FROM_STREET1 || "PO Box 20024", 80) || "PO Box 20024",
    street2: safeString(process.env.SHIP_FROM_STREET2 || "", 80) || undefined,
    city:
      safeString(process.env.SHIP_FROM_CITY || "Village of Oak Creek", 60) ||
      "Village of Oak Creek",
    state: safeString(process.env.SHIP_FROM_STATE || "AZ", 20) || "AZ",
    zip: safeString(process.env.SHIP_FROM_ZIP || "86341", 20) || "86341",
    country: safeString(process.env.SHIP_FROM_COUNTRY || "US", 2) || "US",
    phone: safeString(process.env.SHIP_FROM_PHONE || "", 30) || undefined,
  };
}

function numEnv(name: string, fallback: number) {
  const raw = process.env[name];
  const n = raw == null ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function getParcelForPouchCount(pouchCount: number) {
  const count = Number.isFinite(pouchCount) ? Math.max(1, Math.floor(pouchCount)) : 1;
  const weightOzPerPouch = numEnv("WEIGHT_OZ_PER_POUCH", 16);
  const totalWeightOz = Math.max(1, Math.round(count * weightOzPerPouch));

  if (count <= 2) {
    return {
      weight: totalWeightOz,
      length: numEnv("MAILER_LENGTH_IN", 13),
      width: numEnv("MAILER_WIDTH_IN", 10),
      height: numEnv("MAILER_HEIGHT_IN", 2),
      kind: "mailer" as const,
    };
  }

  if (count <= 4) {
    return {
      weight: totalWeightOz,
      length: numEnv("BOX_SM_LENGTH_IN", 10),
      width: numEnv("BOX_SM_WIDTH_IN", 8),
      height: numEnv("BOX_SM_HEIGHT_IN", 6),
      kind: "box_sm" as const,
    };
  }

  return {
    weight: totalWeightOz,
    length: numEnv("BOX_MD_LENGTH_IN", 12),
    width: numEnv("BOX_MD_WIDTH_IN", 10),
    height: numEnv("BOX_MD_HEIGHT_IN", 8),
    kind: "box_md" as const,
  };
}

function stripUndefined(obj: any) {
  const out: any = {};
  for (const k of Object.keys(obj || {})) {
    const v = (obj as any)[k];
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

async function easyPostRequest(path: string, init?: RequestInit) {
  const apiKey = String(process.env.EASYPOST_API_KEY || "").trim();
  if (!apiKey) throw new Error("Missing EASYPOST_API_KEY");

  const url = `https://api.easypost.com${path}`;
  const auth = Buffer.from(`${apiKey}:`).toString("base64");

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg =
      json?.error?.message ||
      json?.message ||
      `EasyPost error (${res.status}) on ${path}: ${text?.slice?.(0, 200) || ""}`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.payload = json;
    throw err;
  }

  return json;
}

function stripeAddrToEasyPost(toName: string | null | undefined, addr: any) {
  const name = safeString(toName || "", 80);
  const street1 = safeString(addr?.line1 || "", 100);
  const street2 = safeString(addr?.line2 || "", 100);
  const city = safeString(addr?.city || "", 60);
  const state = safeString(addr?.state || "", 60);
  const zip = safeString(addr?.postal_code || "", 20);
  const country = safeString(addr?.country || "US", 2) || "US";

  return stripUndefined({
    name: name || undefined,
    street1: street1 || undefined,
    street2: street2 || undefined,
    city: city || undefined,
    state: state || undefined,
    zip: zip || undefined,
    country: country || "US",
  });
}

async function createAndBuyEasyPostShipment(args: {
  toAddress: any;
  fromAddress: any;
  parcel: { weight: number; length: number; width: number; height: number };
}) {
  const created = await easyPostRequest("/v2/shipments", {
    method: "POST",
    body: JSON.stringify({
      shipment: {
        to_address: args.toAddress,
        from_address: args.fromAddress,
        parcel: {
          weight: args.parcel.weight,
          length: args.parcel.length,
          width: args.parcel.width,
          height: args.parcel.height,
        },
        options: {
          label_format: "PDF",
        },
      },
    }),
  });

  const shipment = created?.shipment ?? created;
  const shipmentId = shipment?.id;
  if (!shipmentId) throw new Error("EasyPost: missing shipment id");

  const rates: any[] = Array.isArray(shipment?.rates) ? shipment.rates : [];
  if (!rates.length) throw new Error("EasyPost: no rates returned for shipment");

  const rate = rates
    .map((r) => ({
      id: r?.id,
      rate: Number(r?.rate),
      carrier: String(r?.carrier || ""),
      service: String(r?.service || ""),
    }))
    .filter((r) => r.id && Number.isFinite(r.rate))
    .sort((a, b) => a.rate - b.rate)[0];

  if (!rate?.id) throw new Error("EasyPost: could not select a rate to buy");

  const bought = await easyPostRequest(`/v2/shipments/${encodeURIComponent(shipmentId)}/buy`, {
    method: "POST",
    body: JSON.stringify({
      rate: { id: rate.id },
    }),
  });

  const boughtShipment = bought?.shipment ?? bought;
  const tracking = safeString(boughtShipment?.tracking_code || "", 120) || "";
  const carrier =
    safeString(boughtShipment?.selected_rate?.carrier || rate.carrier || "", 80) || "";

  const labelUrl =
    safeString(boughtShipment?.postage_label?.label_url || "", 1000) ||
    safeString(boughtShipment?.postage_label?.label_pdf_url || "", 1000) ||
    "";

  return {
    shipmentId: String(shipmentId),
    carrier,
    trackingNumber: tracking || null,
    labelUrl: labelUrl || null,
    selectedRate: {
      carrier,
      service: safeString(boughtShipment?.selected_rate?.service || rate.service || "", 80),
      rate: safeString(boughtShipment?.selected_rate?.rate || String(rate.rate) || "", 40),
    },
  };
}

async function fetchPdfBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch label PDF (${res.status})`);
  const ab = await res.arrayBuffer();
  return new Uint8Array(ab);
}

async function mergePdfs(pdfs: Uint8Array[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create();

  for (const bytes of pdfs) {
    const doc = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    for (const p of pages) merged.addPage(p);
  }

  const out = await merged.save();
  return new Uint8Array(out);
}

async function appendErrorsPage(
  existing: Uint8Array,
  errors: Array<{ orderId: string; message: string }>
) {
  const doc = await PDFDocument.load(existing);
  let page = doc.addPage();
  let { height } = page.getSize();

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  page.drawText(`Label generation errors (${errors.length})`, {
    x: 40,
    y: height - 60,
    size: 18,
    font: fontBold,
  });

  let y = height - 90;
  const lineHeight = 14;

  for (const e of errors) {
    const line = `${e.orderId}: ${e.message}`;
    const maxChars = 110;
    const chunks: string[] = [];
    for (let i = 0; i < line.length; i += maxChars) chunks.push(line.slice(i, i + maxChars));

    for (const c of chunks) {
      if (y < 40) {
        page = doc.addPage();
        ({ height } = page.getSize());
        y = height - 60;
      }
      page.drawText(c, { x: 40, y, size: 10, font });
      y -= lineHeight;
    }
  }

  const out = await doc.save();
  return new Uint8Array(out);
}

async function buildPackingSlipsPdf(args: {
  orderIds: string[];
  byOrderId: Record<
    string,
    {
      id: string;
      createdAt?: Date | string | null;
      customerEmail?: string | null;
      shippingName?: string | null;
      shippingAddress?: any | null;
      amountTotal?: number | null;
      currency?: string | null;
      shippingCarrier?: string | null;
      shippingTrackingNumber?: string | null;
      isSubscription?: boolean | null;
    }
  >;
}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  for (const orderId of args.orderIds) {
    const order = args.byOrderId[orderId];
    if (!order) continue;

    const items = await db
      .select({
        flavor: orderItems.flavor,
        purchaseType: orderItems.purchaseType,
        frequencyWeeks: orderItems.frequencyWeeks,
        quantity: orderItems.quantity,
        fulfillmentStatus: orderItems.fulfillmentStatus,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .orderBy(desc(orderItems.createdAt))
      .limit(200);

    let page = doc.addPage([612, 792]);
    let y = 750;

    const drawLine = () => {
      page.drawLine({
        start: { x: 40, y },
        end: { x: 572, y },
        thickness: 1,
        color: rgb(0.82, 0.82, 0.82),
      });
      y -= 16;
    };

    page.drawText("Kimora Co. Packing Slip", { x: 40, y, size: 20, font: fontBold });
    y -= 28;

    page.drawText(`Order ID: ${orderId}`, { x: 40, y, size: 11, font: fontBold });
    y -= 16;

    page.drawText(`Created: ${order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}`, {
      x: 40,
      y,
      size: 10,
      font,
    });
    y -= 16;

    page.drawText(`Customer Email: ${safeString(order.customerEmail || "—", 200)}`, {
      x: 40,
      y,
      size: 10,
      font,
    });
    y -= 16;

    page.drawText(`Type: ${order.isSubscription ? "Subscription" : "One-time"}`, {
      x: 40,
      y,
      size: 10,
      font,
    });
    y -= 16;

    page.drawText(
      `Total: ${formatMoney(order.amountTotal ?? null, order.currency ?? "usd") || "—"}`,
      {
        x: 40,
        y,
        size: 10,
        font,
      }
    );
    y -= 12;
    drawLine();

    page.drawText("Ship To", { x: 40, y, size: 12, font: fontBold });
    y -= 16;

    page.drawText(safeString(order.shippingName || "—", 200), { x: 40, y, size: 10, font });
    y -= 14;

    const addrLines = [
      safeString(order.shippingAddress?.line1 || "", 100),
      safeString(order.shippingAddress?.line2 || "", 100),
      [order.shippingAddress?.city, order.shippingAddress?.state, order.shippingAddress?.postal_code]
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .join(", "),
      safeString(order.shippingAddress?.country || "", 20),
    ].filter(Boolean);

    for (const line of addrLines) {
      page.drawText(line, { x: 40, y, size: 10, font });
      y -= 14;
    }

    y -= 4;
    drawLine();

    page.drawText("Items", { x: 40, y, size: 12, font: fontBold });
    y -= 18;

    page.drawText("Product", { x: 40, y, size: 10, font: fontBold });
    page.drawText("Qty", { x: 300, y, size: 10, font: fontBold });
    page.drawText("Type", { x: 350, y, size: 10, font: fontBold });
    page.drawText("Status", { x: 470, y, size: 10, font: fontBold });
    y -= 14;
    drawLine();

    for (const item of items) {
      if (y < 80) {
        page = doc.addPage([612, 792]);
        y = 750;
      }

      const typeLabel =
        item.purchaseType === "subscribe" && item.frequencyWeeks
          ? `Subscription / ${item.frequencyWeeks}w`
          : "One-time";

      page.drawText(titleizeSlug(item.flavor), { x: 40, y, size: 10, font });
      page.drawText(String(item.quantity ?? 1), { x: 300, y, size: 10, font });
      page.drawText(typeLabel, { x: 350, y, size: 10, font });
      page.drawText(normalizeFulfillment(item.fulfillmentStatus), { x: 470, y, size: 10, font });
      y -= 16;
    }

    y -= 8;
    drawLine();

    const trackUrl = trackingUrlFor(order.shippingCarrier, order.shippingTrackingNumber);

    page.drawText("Shipment", { x: 40, y, size: 12, font: fontBold });
    y -= 16;

    page.drawText(`Carrier: ${safeString(order.shippingCarrier || "—", 80) || "—"}`, {
      x: 40,
      y,
      size: 10,
      font,
    });
    y -= 14;

    page.drawText(`Tracking: ${safeString(order.shippingTrackingNumber || "—", 120) || "—"}`, {
      x: 40,
      y,
      size: 10,
      font,
    });
    y -= 14;

    if (trackUrl) {
      page.drawText(`Track: ${trackUrl}`, { x: 40, y, size: 10, font });
      y -= 14;
    }

    page.drawText("Thank you for training with Kimora Co.", {
      x: 40,
      y: 40,
      size: 10,
      font: fontBold,
    });
  }

  const out = await doc.save();
  return new Uint8Array(out);
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.get("/api/admin/wholesale-applications", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const rows = await db
        .select()
        .from(wholesaleApplications)
        .orderBy(desc(wholesaleApplications.createdAt))
        .limit(500);
      return res.json({ ok: true, rows });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("GET /api/admin/wholesale-applications error:", s);
      return res.status(500).json({ ok: false, message: "Failed to load applications." });
    }
  });

  app.patch("/api/admin/wholesale-applications/:id", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const id = String(req.params.id || "").trim();
      const status = String(req.body?.status || "").trim();

      const allowed = new Set(["new", "reviewing", "approved", "rejected", "closed"]);

      if (!id) return res.status(400).json({ ok: false, message: "Missing id." });
      if (!allowed.has(status)) {
        return res.status(400).json({ ok: false, message: "Invalid status." });
      }

      const updated = await db
        .update(wholesaleApplications)
        .set({ status })
        .where(eq(wholesaleApplications.id, id))
        .returning({ id: wholesaleApplications.id });

      if (!updated?.length) {
        return res.status(404).json({ ok: false, message: "Not found." });
      }

      return res.json({ ok: true });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("PATCH /api/admin/wholesale-applications/:id error:", s);
      return res.status(500).json({ ok: false, message: "Failed to update status." });
    }
  });

  app.get("/api/admin/summary", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const rows = await db
        .select({
          id: orders.id,
          status: orders.status,
          amountTotal: orders.amountTotal,
          isSubscription: orders.isSubscription,
        })
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(5000);

      const paid = rows.filter((r) => String(r.status || "").toLowerCase() === "paid");
      const refunded = rows.filter((r) => String(r.status || "").toLowerCase() === "refunded");

      const totalRevenueCents = paid.reduce((acc, r) => acc + (r.amountTotal ?? 0), 0);
      const aovCents = paid.length ? Math.round(totalRevenueCents / paid.length) : 0;

      const subscriptionOrders = rows.filter((r) => Boolean(r.isSubscription)).length;
      const onetimeOrders = rows.length - subscriptionOrders;

      return res.json({
        ok: true,
        summary: {
          totalOrders: rows.length,
          totalRevenueCents,
          aovCents,
          paidOrders: paid.length,
          refundedOrders: refunded.length,
          subscriptionOrders,
          onetimeOrders,
        },
      });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("GET /api/admin/summary error:", s);
      return res.status(500).json({ ok: false, message: "Failed to load summary." });
    }
  });

  app.get("/api/admin/orders", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const q = safeString(req.query?.q, 200).trim();
      const status = safeString(req.query?.status, 32).trim();
      const mode = safeString(req.query?.mode, 32).trim();

      const whereParts: any[] = [];

      if (q) whereParts.push(pickOrderSearchWhere(q));
      if (status) whereParts.push(eq(orders.status, status));

      if (mode === "subscription") whereParts.push(eq(orders.isSubscription, true));
      if (mode === "payment") whereParts.push(eq(orders.isSubscription, false));

      const where = whereParts.length === 0 ? undefined : and(...whereParts);

      const rows = await db
        .select({
          id: orders.id,
          createdAt: orders.createdAt,
          customerEmail: orders.customerEmail,
          status: orders.status,
          currency: orders.currency,
          amountSubtotal: orders.amountSubtotal,
          amountTotal: orders.amountTotal,
          isSubscription: orders.isSubscription,

          stripeCheckoutSessionId: orders.stripeCheckoutSessionId,
          stripePaymentIntentId: orders.stripePaymentIntentId,
          stripeSubscriptionId: orders.stripeSubscriptionId,
          stripeCustomerId: orders.stripeCustomerId,

          shippingName: orders.shippingName,
          shippingAddress: orders.shippingAddress,

          shippingCarrier: orders.shippingCarrier,
          shippingTrackingNumber: orders.shippingTrackingNumber,
          shippingLabelUrl: orders.shippingLabelUrl,
          shippingShipmentId: orders.shippingShipmentId,
        })
        .from(orders)
        .where(where as any)
        .orderBy(desc(orders.createdAt))
        .limit(500);

      const orderIds = rows.map((r) => r.id).filter(Boolean);
      const rollupByOrderId: Record<
        string,
        { fulfillmentStatus: string; fulfillmentCounts: Record<string, number> }
      > = {};

      if (orderIds.length) {
        const agg = await db
          .select({
            orderId: orderItems.orderId,
            status: orderItems.fulfillmentStatus,
            count: sql<number>`count(*)`.mapWith(Number),
          })
          .from(orderItems)
          .where(inArray(orderItems.orderId, orderIds as any))
          .groupBy(orderItems.orderId, orderItems.fulfillmentStatus);

        for (const row of agg as any[]) {
          const oid = String(row.orderId || "");
          if (!oid) continue;
          if (!rollupByOrderId[oid]) {
            rollupByOrderId[oid] = { fulfillmentStatus: "unfulfilled", fulfillmentCounts: {} };
          }
          const st = normalizeFulfillment(row.status);
          const n = Number(row.count ?? 0) || 0;
          rollupByOrderId[oid].fulfillmentCounts[st] =
            (rollupByOrderId[oid].fulfillmentCounts[st] || 0) + n;
        }

        for (const oid of Object.keys(rollupByOrderId)) {
          const r = rollupByOrderId[oid];
          const rolled = rollupOrderFulfillment(r.fulfillmentCounts || {});
          rollupByOrderId[oid] = {
            fulfillmentStatus: rolled.fulfillmentStatus,
            fulfillmentCounts: rolled.fulfillmentCounts,
          };
        }
      }

      const withRollup = rows.map((r) => {
        const roll = rollupByOrderId[String(r.id)] || null;
        return {
          ...r,
          fulfillmentStatus: roll?.fulfillmentStatus ?? "unfulfilled",
          fulfillmentCounts: roll?.fulfillmentCounts ?? {},
          trackingUrl: trackingUrlFor(r.shippingCarrier ?? null, r.shippingTrackingNumber ?? null),
        };
      });

      return res.json({ ok: true, rows: withRollup });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("GET /api/admin/orders error:", s);
      return res.status(500).json({ ok: false, message: "Failed to load orders." });
    }
  });

  app.get("/api/admin/orders/:id", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const id = String(req.params.id || "").trim();
      if (!id) return res.status(400).json({ ok: false, message: "Missing id." });

      const order = await db.select().from(orders).where(eq(orders.id, id)).limit(1);

      if (!order?.length) {
        return res.status(404).json({ ok: false, message: "Not found." });
      }

      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, id))
        .orderBy(desc(orderItems.createdAt))
        .limit(200);

      return res.json({
        ok: true,
        order: {
          ...order[0],
          trackingUrl: trackingUrlFor(
            order[0]?.shippingCarrier ?? null,
            order[0]?.shippingTrackingNumber ?? null
          ),
        },
        items: items.map((it) => ({
          ...it,
          trackingUrl: trackingUrlFor(it.carrier ?? null, it.trackingNumber ?? null),
        })),
      });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("GET /api/admin/orders/:id error:", s);
      return res.status(500).json({ ok: false, message: "Failed to load order." });
    }
  });

  app.patch("/api/admin/orders/:id/fulfillment", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const orderId = String(req.params.id || "").trim();
      if (!orderId) return res.status(400).json({ ok: false, message: "Missing id." });

      const status = String(req.body?.fulfillmentStatus ?? "").trim().toLowerCase();
      if (!status || !ALLOWED_FULFILLMENT.has(status)) {
        return res.status(400).json({
          ok: false,
          message:
            "Invalid fulfillmentStatus. Allowed: unfulfilled, allocated, packed, shipped, delivered, canceled, backordered",
        });
      }

      const now = new Date();
      const set: any = { fulfillmentStatus: status };

      if (status === "shipped") set.shippedAt = now;
      if (status === "delivered") set.deliveredAt = now;

      const updated = await db
        .update(orderItems)
        .set(set)
        .where(eq(orderItems.orderId, orderId))
        .returning({ id: orderItems.id });

      if (!updated?.length) {
        return res.status(404).json({ ok: false, message: "No items found for that order." });
      }

      if (status === "shipped") {
        await maybeSendShippingEmailForOrder(orderId);
      }

      return res.json({ ok: true });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("PATCH /api/admin/orders/:id/fulfillment error:", s);
      return res.status(500).json({ ok: false, message: "Failed to update order fulfillment." });
    }
  });

  app.patch("/api/admin/order-items/:id/fulfillment", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const id = String(req.params.id || "").trim();
      if (!id) return res.status(400).json({ ok: false, message: "Missing id." });

      const status = String(req.body?.fulfillmentStatus ?? "").trim().toLowerCase();
      const carrier = safeString(req.body?.carrier, 80) || null;
      const trackingNumber = safeString(req.body?.trackingNumber, 120) || null;

      if (!status || !ALLOWED_FULFILLMENT.has(status)) {
        return res.status(400).json({
          ok: false,
          message:
            "Invalid fulfillmentStatus. Allowed: unfulfilled, allocated, packed, shipped, delivered, canceled, backordered",
        });
      }

      const now = new Date();

      const set: any = {
        fulfillmentStatus: status,
        carrier,
        trackingNumber,
      };

      if (status === "shipped") set.shippedAt = now;
      if (status === "delivered") set.deliveredAt = now;

      const updated = await db
        .update(orderItems)
        .set(set)
        .where(eq(orderItems.id, id))
        .returning({ id: orderItems.id, orderId: orderItems.orderId });

      if (!updated?.length) {
        return res.status(404).json({ ok: false, message: "Not found." });
      }

      if (status === "shipped") {
        await maybeSendShippingEmailForOrder(String(updated[0].orderId));
      }

      return res.json({ ok: true });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("PATCH /api/admin/order-items/:id/fulfillment error:", s);
      return res.status(500).json({ ok: false, message: "Failed to update item." });
    }
  });

  app.get("/api/admin/orders/:id/label", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const id = String(req.params.id || "").trim();
      if (!id) return res.status(400).json({ ok: false, message: "Missing id." });

      const row = await db
        .select({
          id: orders.id,
          shippingLabelUrl: orders.shippingLabelUrl,
          shippingTrackingNumber: orders.shippingTrackingNumber,
          shippingCarrier: orders.shippingCarrier,
          shippingShipmentId: orders.shippingShipmentId,
        })
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);

      const order = row?.[0];
      if (!order) {
        return res.status(404).json({ ok: false, message: "Order not found." });
      }

      if (!order.shippingLabelUrl) {
        return res.status(404).json({ ok: false, message: "No label found for this order." });
      }

      return res.json({
        ok: true,
        labelUrl: order.shippingLabelUrl,
        trackingNumber: order.shippingTrackingNumber,
        carrier: order.shippingCarrier,
        shipmentId: order.shippingShipmentId,
        trackingUrl: trackingUrlFor(
          order.shippingCarrier ?? null,
          order.shippingTrackingNumber ?? null
        ),
      });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("GET /api/admin/orders/:id/label error:", s);
      return res.status(500).json({ ok: false, message: "Failed to load label." });
    }
  });

  app.post("/api/admin/packing-slips/batch", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const orderIdsIn: string[] = Array.isArray(req.body?.orderIds)
        ? req.body.orderIds.map((x: any) => String(x || "").trim()).filter(Boolean)
        : [];

      let selectedOrderIds: string[] = [];

      if (orderIdsIn.length > 0) {
        selectedOrderIds = orderIdsIn;
      } else {
        const packedAgg = await db
          .select({
            orderId: orderItems.orderId,
            packedCount: sql<number>`sum(case when ${orderItems.fulfillmentStatus} = 'packed' then 1 else 0 end)`.mapWith(
              Number
            ),
          })
          .from(orderItems)
          .groupBy(orderItems.orderId);

        selectedOrderIds = (packedAgg || [])
          .filter((r: any) => (Number(r.packedCount) || 0) > 0)
          .map((r: any) => String(r.orderId || "").trim())
          .filter(Boolean);
      }

      if (!selectedOrderIds.length) {
        return res.status(404).json({
          ok: false,
          message: "No packed orders were found for packing slips.",
        });
      }

      const orderRows = await db
        .select({
          id: orders.id,
          createdAt: orders.createdAt,
          customerEmail: orders.customerEmail,
          shippingName: orders.shippingName,
          shippingAddress: orders.shippingAddress,
          amountTotal: orders.amountTotal,
          currency: orders.currency,
          shippingCarrier: orders.shippingCarrier,
          shippingTrackingNumber: orders.shippingTrackingNumber,
          isSubscription: orders.isSubscription,
        })
        .from(orders)
        .where(inArray(orders.id, selectedOrderIds as any))
        .orderBy(desc(orders.createdAt))
        .limit(500);

      const byOrderId: Record<string, any> = {};
      for (const row of orderRows as any[]) {
        byOrderId[String(row.id)] = row;
      }

      const orderedIds = selectedOrderIds.filter((id) => byOrderId[id]);
      if (!orderedIds.length) {
        return res.status(404).json({
          ok: false,
          message: "No matching orders found for packing slips.",
        });
      }

      const pdf = await buildPackingSlipsPdf({
        orderIds: orderedIds,
        byOrderId,
      });

      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const filename = `kimora-packing-slips-${stamp}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.status(200).send(Buffer.from(pdf));
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("POST /api/admin/packing-slips/batch error:", s);
      return res.status(500).json({ ok: false, message: "Failed to generate packing slips." });
    }
  });

  app.post("/api/wholesale/apply", async (req, res) => {
    try {
      const body: any = req.body ?? {};

      const businessName = safeString(body.businessName, 300);
      const contactName = safeString(body.contactName, 300);
      const email = normalizeEmail(String(body.email ?? ""));

      const phoneRaw = safeString(body.phone, 64);
      const phoneDigits = onlyDigits(phoneRaw);

      const websiteOrInstagram = safeString(body.websiteOrInstagram, 500);
      const city = safeString(body.city, 120);
      const state = safeString(body.state, 16);

      const businessType = safeString(body.businessType, 32);
      const businessTypeOther = safeString(body.businessTypeOther, 300);

      const memberCount = parsePositiveInt(body.memberCount);
      const retailSetup = safeString(body.retailSetup, 32);

      const interestedIn: any = body.interestedIn ?? {};
      const interestedOnShelf = Boolean(interestedIn.onShelf);
      const interestedCoachAffiliate = Boolean(interestedIn.coachAffiliate);
      const interestedEventSponsorship = Boolean(interestedIn.eventSponsorship);

      const notes = safeString(body.notes, 5000);

      if (!businessName) {
        return res.status(400).json({ ok: false, message: "Business name is required." });
      }
      if (!contactName) {
        return res.status(400).json({ ok: false, message: "Contact name is required." });
      }
      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ ok: false, message: "Valid email is required." });
      }

      if (!phoneDigits) {
        return res.status(400).json({ ok: false, message: "Phone number is required." });
      }
      if (!isValidPhoneDigits(phoneDigits)) {
        return res.status(400).json({
          ok: false,
          message: "Phone number must include at least 10 digits.",
        });
      }

      if (!city) return res.status(400).json({ ok: false, message: "City is required." });
      if (!state) return res.status(400).json({ ok: false, message: "State is required." });

      if (businessType === "other" && !businessTypeOther) {
        return res.status(400).json({ ok: false, message: "Please specify business type." });
      }

      if (!memberCount || memberCount <= 0) {
        return res.status(400).json({
          ok: false,
          message: "Approx members / active clients is required and must be > 0.",
        });
      }

      const ip =
        (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        null;

      const userAgent = String(req.headers["user-agent"] ?? "") || null;
      const referer = String(req.headers["referer"] ?? "") || null;

      const inserted = await db
        .insert(wholesaleApplications)
        .values({
          businessName,
          contactName,
          email,
          phone: phoneDigits,
          memberCount,
          websiteOrInstagram: websiteOrInstagram || null,
          city,
          state,
          businessType: businessType || "gym",
          businessTypeOther: businessTypeOther || null,
          retailSetup: retailSetup || null,
          interestedOnShelf,
          interestedCoachAffiliate,
          interestedEventSponsorship,
          notes: notes || null,
          status: "new",
          source: "kimoraco.com",
          metadata: { ip, userAgent, referer },
        })
        .returning({ id: wholesaleApplications.id });

      const applicationId = inserted?.[0]?.id ?? null;

      const resendKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "";
      const notifyTo = process.env.WHOLESALE_NOTIFY_TO || "support@kimoraco.com";
      const siteUrl = getSiteUrl();

      const canSend = Boolean(resendKey && fromEmail);
      if (canSend) {
        const resend = new Resend(resendKey!);
        const from = fromEmail.includes("<") ? fromEmail : `Kimora Co <${fromEmail}>`;

        const internalSubject = `New wholesale application — ${businessName}`;

        const internalText =
          `New wholesale application received\n\n` +
          `Application ID: ${applicationId ?? "(unknown)"}\n` +
          `Business: ${businessName}\n` +
          `Contact: ${contactName}\n` +
          `Email: ${email}\n` +
          `Phone: ${phoneDigits}\n` +
          `Website/IG: ${websiteOrInstagram || "(not provided)"}\n` +
          `City/State: ${city}, ${state}\n` +
          `Business type: ${businessType}${
            businessType === "other" ? ` (${businessTypeOther})` : ""
          }\n` +
          `Member count: ${memberCount}\n` +
          `Retail setup: ${retailSetup || "(not provided)"}\n` +
          `Interested: onShelf=${interestedOnShelf}, coachAffiliate=${interestedCoachAffiliate}, eventSponsorship=${interestedEventSponsorship}\n\n` +
          `Notes:\n${notes || "(none)"}\n\n` +
          `Wholesale page: ${siteUrl}/wholesale\n`;

        const internalHtml = `<div style="font-family: ui-sans-serif, system-ui; line-height:1.5; color:#111;">
  <h2 style="margin:0 0 10px;">New wholesale application</h2>
  <div style="margin:0 0 8px;"><b>Application ID:</b> ${escapeHtml(
    safeString(applicationId ?? "(unknown)")
  )}</div>
  <div style="margin:0 0 8px;"><b>Business:</b> ${escapeHtml(safeString(businessName))}</div>
  <div style="margin:0 0 8px;"><b>Contact:</b> ${escapeHtml(safeString(contactName))}</div>
  <div style="margin:0 0 8px;"><b>Email:</b> ${escapeHtml(safeString(email))}</div>
  <div style="margin:0 0 8px;"><b>Phone:</b> ${escapeHtml(safeString(phoneDigits))}</div>
  <div style="margin:0 0 8px;"><b>Website/IG:</b> ${escapeHtml(
    safeString(websiteOrInstagram || "(not provided)")
  )}</div>
  <div style="margin:0 0 8px;"><b>City/State:</b> ${escapeHtml(
    safeString(city)
  )}, ${escapeHtml(safeString(state))}</div>
  <div style="margin:0 0 8px;"><b>Business type:</b> ${escapeHtml(
    safeString(businessType)
  )}${
          businessType === "other" && businessTypeOther
            ? ` (${escapeHtml(safeString(businessTypeOther))})`
            : ""
        }</div>
  <div style="margin:0 0 8px;"><b>Member count:</b> ${escapeHtml(safeString(memberCount))}</div>
  <div style="margin:0 0 8px;"><b>Retail setup:</b> ${escapeHtml(
    safeString(retailSetup || "(not provided)")
  )}</div>
  <div style="margin:0 0 8px;"><b>Interested:</b>
    onShelf=${String(interestedOnShelf)},
    coachAffiliate=${String(interestedCoachAffiliate)},
    eventSponsorship=${String(interestedEventSponsorship)}
  </div>
  <hr style="border:none;border-top:1px solid #eee;margin:14px 0;" />
  <div style="margin:0 0 6px;"><b>Notes</b></div>
  <pre style="white-space:pre-wrap;background:#f7f7f7;padding:12px;border-radius:10px;font-size:12px;">${escapeHtml(
    safeString(notes || "(none)")
  )}</pre>
</div>`;

        const applicantSubject = "Kimora Co — wholesale application received";
        const applicantText =
          `Thanks for applying to Kimora Co wholesale.\n\n` +
          `We received your application for ${businessName} and will review it shortly.\n\n` +
          `If you need to add anything, reply to this email or contact support@kimoraco.com.\n`;

        const applicantHtml = `<div style="font-family: ui-sans-serif, system-ui; line-height:1.5; color:#111;">
  <h2 style="margin:0 0 10px;">Wholesale application received</h2>
  <p style="margin:0 0 12px;">
    Thanks${
      contactName ? `, ${escapeHtml(safeString(contactName))}` : ""
    }! We received your wholesale application for <b>${escapeHtml(
          safeString(businessName)
        )}</b>.
  </p>
  <p style="margin:0 0 12px;">We’ll review it and get back to you shortly.</p>
  <p style="margin:16px 0 0;font-size:12px;color:#666;">
    Need to add something? Reply to this email or contact
    <a href="mailto:support@kimoraco.com">support@kimoraco.com</a>.
  </p>
</div>`;

        try {
          await resend.emails.send({
            from,
            to: notifyTo,
            subject: internalSubject,
            text: internalText,
            html: internalHtml,
            replyTo: email,
          } as any);
        } catch (e: any) {
          const s = safeErrSummary(e);
          console.error("[wholesale] internal email send failed:", s);
        }

        try {
          await resend.emails.send({
            from,
            to: email,
            subject: applicantSubject,
            text: applicantText,
            html: applicantHtml,
          } as any);
        } catch (e: any) {
          const s = safeErrSummary(e);
          console.error("[wholesale] applicant email send failed:", s);
        }
      } else {
        console.warn(
          "[wholesale] Resend not configured (missing RESEND_API_KEY or RESEND_FROM_EMAIL/EMAIL_FROM). Stored application without emailing."
        );
      }

      return res.json({ ok: true, id: applicationId });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("POST /api/wholesale/apply error:", s);

      const msg = String(err?.message || "");
      if (
        msg.includes("wholesale_phone_len_chk") ||
        msg.includes("wholesale_member_count_chk") ||
        msg.includes("violates check constraint") ||
        msg.includes("violates not-null constraint")
      ) {
        return res.status(400).json({
          ok: false,
          message: "Please check required fields (phone + member count) and try again.",
        });
      }

      return res
        .status(500)
        .json({ ok: false, message: "Failed to submit wholesale application." });
    }
  });

  app.post("/api/checkout", async (req, res) => {
    try {
      const emailRaw = String(req.body?.email ?? "");
      const email = normalizeEmail(emailRaw);

      const itemsRaw: any[] = Array.isArray(req.body?.items) ? req.body.items : [];
      const items: CheckoutItem[] = itemsRaw
        .map((it: any) => {
          const flavor = String(it?.flavor ?? "").trim();
          const type: CheckoutItem["type"] = it?.type === "subscribe" ? "subscribe" : "onetime";
          const frequency: CheckoutItem["frequency"] | undefined =
            type === "subscribe" &&
            (it?.frequency === "2" || it?.frequency === "4" || it?.frequency === "6")
              ? it.frequency
              : undefined;
          const qRaw = Number(it?.quantity);
          const quantity = Number.isFinite(qRaw) ? Math.max(1, Math.floor(qRaw)) : 1;
          return { flavor, type, frequency, quantity };
        })
        .filter((it: CheckoutItem) => {
          if (!it.flavor) return false;
          if (it.type === "subscribe" && !it.frequency) return false;
          if (!Number.isInteger(it.quantity) || it.quantity < 1) return false;
          return true;
        });

      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ message: "Valid email is required." });
      }
      if (!items.length) {
        return res.status(400).json({ message: "Cart is empty." });
      }

      const hasSub = items.some((it: CheckoutItem) => it.type === "subscribe");
      const hasOne = items.some((it: CheckoutItem) => it.type === "onetime");
      if (hasSub && hasOne) {
        return res.status(400).json({
          message: "Subscriptions and one-time items must be checked out separately.",
        });
      }

      const siteUrl = getSiteUrl();
      const successUrl = `${siteUrl}/order-success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${siteUrl}/checkout?canceled=1`;

      const mode: "payment" | "subscription" = hasSub ? "subscription" : "payment";

      const line_items = items.map((it: CheckoutItem) => ({
        price: getPriceId(it),
        quantity: it.quantity,
      }));

      const currency = "usd";
      const subtotalCents =
        mode === "payment" ? await computeCartSubtotalCentsFromStripePrices(line_items) : 0;

      const shipping_options =
        mode === "payment" ? buildShippingOptions({ currency, subtotalCents }) : undefined;

      const existingCustomerId = await findStripeCustomerIdByEmail(email);

      const sessionParams: any = {
        mode,
        line_items,
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: false,
        shipping_address_collection: { allowed_countries: ["US"] },
        phone_number_collection: { enabled: true },
        automatic_tax: { enabled: true },
      };

      if (mode === "payment") {
        sessionParams.shipping_options = shipping_options;
      }

      if (existingCustomerId) {
        sessionParams.customer = existingCustomerId;
        sessionParams.customer_update = {
          address: "auto",
          name: "auto",
          shipping: "auto",
        };
      } else {
        sessionParams.customer_email = email;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      return res.json({ url: (session as any).url });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("POST /api/checkout error:", s);

      const stripeMsg = err?.raw?.message || err?.message || "Failed to create checkout session.";

      if (String(stripeMsg).startsWith("Missing env var:")) {
        return res.status(500).json({ message: stripeMsg });
      }

      return res.status(500).json({
        message: stripeMsg,
        code: err?.code || err?.raw?.code || undefined,
        type: err?.type || err?.raw?.type || undefined,
      });
    }
  });

  app.get("/api/checkout/session", async (req, res) => {
    try {
      const sessionId = String(req.query?.session_id ?? "").trim();
      if (!sessionId) {
        return res.status(400).json({ message: "session_id is required" });
      }

      const session: any = await stripe.checkout.sessions.retrieve(sessionId);

      return res.json({
        id: session.id,
        mode: session.mode,
        customer_email: session.customer_details?.email ?? session.customer_email ?? null,
        payment_status: session.payment_status ?? null,
        subscription: session.subscription ?? null,
      });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("GET /api/checkout/session error:", s);
      return res.status(500).json({ message: "Failed to load session" });
    }
  });

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
                shippingName:
                  resolvedShipping.shippingName ?? existing?.[0]?.shippingName ?? null,
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
                fulfillmentStatus: "unfulfilled",
                carrier: null,
                trackingNumber: null,
                shippedAt: null,
                deliveredAt: null,
              })
              .onConflictDoNothing();
          }
        }

        const wasNewInsert = Boolean(inserted?.length);
        if (wasNewInsert) {
          await sendOrderConfirmationEmail({
            session,
            lineItems: lineItems.data,
            isSubscription: session.mode === "subscription" || Boolean(session.subscription),
          });
        }
      }

      return res.json({ received: true });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("Stripe webhook error:", s);
      return res.status(400).send("Webhook Error");
    }
  });

  app.post("/api/admin/labels/batch", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const apiKey = String(process.env.EASYPOST_API_KEY || "").trim();
      if (!apiKey) {
        return res.status(500).json({ ok: false, message: "Missing EASYPOST_API_KEY" });
      }

      const orderIdsIn: string[] = Array.isArray(req.body?.orderIds)
        ? req.body.orderIds.map((x: any) => String(x || "").trim()).filter(Boolean)
        : [];

      const whereOrderIds =
        orderIdsIn.length > 0 ? inArray(orderItems.orderId, orderIdsIn as any) : undefined;

      const packedAgg = await db
        .select({
          orderId: orderItems.orderId,
          packedCount: sql<number>`sum(case when ${orderItems.fulfillmentStatus} = 'packed' then 1 else 0 end)`.mapWith(
            Number
          ),
          packedWithoutTracking: sql<number>`sum(case when ${orderItems.fulfillmentStatus} = 'packed' and (${orderItems.trackingNumber} is null or ${orderItems.trackingNumber} = '') then 1 else 0 end)`.mapWith(
            Number
          ),
        })
        .from(orderItems)
        .where(whereOrderIds as any)
        .groupBy(orderItems.orderId);

      const candidateOrderIds = (packedAgg || [])
        .filter(
          (r: any) =>
            (Number(r.packedCount) || 0) > 0 && (Number(r.packedWithoutTracking) || 0) > 0
        )
        .map((r: any) => String(r.orderId || "").trim())
        .filter(Boolean);

      if (!candidateOrderIds.length) {
        return res.status(404).json({
          ok: false,
          message: "No packed orders without tracking were found.",
        });
      }

      const orderRows = await db
        .select({
          id: orders.id,
          customerEmail: orders.customerEmail,
          shippingName: orders.shippingName,
          shippingAddress: orders.shippingAddress,
        })
        .from(orders)
        .where(inArray(orders.id, candidateOrderIds as any))
        .limit(500);

      const byId: Record<string, any> = {};
      for (const o of orderRows as any[]) byId[String(o.id)] = o;

      const qtyAgg = await db
        .select({
          orderId: orderItems.orderId,
          totalQty: sql<number>`sum(${orderItems.quantity})`.mapWith(Number),
        })
        .from(orderItems)
        .where(inArray(orderItems.orderId, candidateOrderIds as any))
        .groupBy(orderItems.orderId);

      const qtyByOrderId: Record<string, number> = {};
      for (const r of qtyAgg as any[]) {
        const oid = String(r.orderId || "").trim();
        if (!oid) continue;
        qtyByOrderId[oid] = Math.max(1, Number(r.totalQty ?? 1) || 1);
      }

      const fromAddress = getShipFromAddress();

      const labelPdfs: Uint8Array[] = [];
      const errors: Array<{ orderId: string; message: string }> = [];

      for (const orderId of candidateOrderIds) {
        const o = byId[String(orderId)];
        if (!o) {
          errors.push({ orderId, message: "Order not found." });
          continue;
        }

        const shipAddr = o.shippingAddress;
        if (
          !shipAddr ||
          !shipAddr.line1 ||
          !shipAddr.city ||
          !shipAddr.state ||
          !shipAddr.postal_code
        ) {
          errors.push({ orderId, message: "Missing shipping address on order." });
          continue;
        }

        const toAddress = stripeAddrToEasyPost(o.shippingName || null, shipAddr);
        const pouchCount = qtyByOrderId[String(orderId)] ?? 1;
        const parcel = getParcelForPouchCount(pouchCount);

        try {
          const result = await createAndBuyEasyPostShipment({
            toAddress,
            fromAddress,
            parcel,
          });

          if (!result.labelUrl) {
            errors.push({ orderId, message: "EasyPost returned no label URL." });
            continue;
          }

          const pdfBytes = await fetchPdfBytes(result.labelUrl);
          labelPdfs.push(pdfBytes);

          const now = new Date();

          await db
            .update(orders)
            .set({
              shippingCarrier: result.carrier || null,
              shippingTrackingNumber: result.trackingNumber || null,
              shippingLabelUrl: result.labelUrl || null,
              shippingShipmentId: result.shipmentId || null,
            })
            .where(eq(orders.id, orderId));

          await db
            .update(orderItems)
            .set({
              carrier: result.carrier || null,
              trackingNumber: result.trackingNumber || null,
              fulfillmentStatus: "shipped",
              shippedAt: now,
            } as any)
            .where(eq(orderItems.orderId, orderId));

          if (o.customerEmail) {
            await sendShippingNotificationEmail({
              customerEmail: String(o.customerEmail),
              shippingName: o.shippingName ?? null,
              orderId,
              carrier: result.carrier || null,
              trackingNumber: result.trackingNumber || null,
            });
          }
        } catch (e: any) {
          const s = safeErrSummary(e);
          errors.push({ orderId, message: s.message || "Failed to create label." });
          continue;
        }
      }

      if (!labelPdfs.length) {
        return res.status(400).json({
          ok: false,
          message: errors.length
            ? `No labels created. Example: ${errors[0].orderId}: ${errors[0].message}`
            : "No labels created.",
          errors,
        });
      }

      let merged = await mergePdfs(labelPdfs);

      if (errors.length) {
        merged = await appendErrorsPage(merged, errors);
        res.setHeader("X-Label-Errors", String(errors.length));
      } else {
        res.setHeader("X-Label-Errors", "0");
      }

      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const filename = `kimora-labels-packed-${stamp}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.status(200).send(Buffer.from(merged));
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("POST /api/admin/labels/batch error:", s);
      return res.status(500).json({ ok: false, message: "Failed to create labels." });
    }
  });

  app.post("/api/admin/packing-slips/batch", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const orderIdsIn: string[] = Array.isArray(req.body?.orderIds)
        ? req.body.orderIds.map((x: any) => String(x || "").trim()).filter(Boolean)
        : [];

      let selectedOrderIds: string[] = [];

      if (orderIdsIn.length > 0) {
        selectedOrderIds = orderIdsIn;
      } else {
        const packedAgg = await db
          .select({
            orderId: orderItems.orderId,
            packedCount: sql<number>`sum(case when ${orderItems.fulfillmentStatus} = 'packed' then 1 else 0 end)`.mapWith(
              Number
            ),
          })
          .from(orderItems)
          .groupBy(orderItems.orderId);

        selectedOrderIds = (packedAgg || [])
          .filter((r: any) => (Number(r.packedCount) || 0) > 0)
          .map((r: any) => String(r.orderId || "").trim())
          .filter(Boolean);
      }

      if (!selectedOrderIds.length) {
        return res.status(404).json({
          ok: false,
          message: "No packed orders were found for packing slips.",
        });
      }

      const orderRows = await db
        .select({
          id: orders.id,
          createdAt: orders.createdAt,
          customerEmail: orders.customerEmail,
          shippingName: orders.shippingName,
          shippingAddress: orders.shippingAddress,
          amountTotal: orders.amountTotal,
          currency: orders.currency,
          shippingCarrier: orders.shippingCarrier,
          shippingTrackingNumber: orders.shippingTrackingNumber,
          isSubscription: orders.isSubscription,
        })
        .from(orders)
        .where(inArray(orders.id, selectedOrderIds as any))
        .orderBy(desc(orders.createdAt))
        .limit(500);

      const byOrderId: Record<string, any> = {};
      for (const row of orderRows as any[]) {
        byOrderId[String(row.id)] = row;
      }

      const orderedIds = selectedOrderIds.filter((id) => byOrderId[id]);
      if (!orderedIds.length) {
        return res.status(404).json({
          ok: false,
          message: "No matching orders found for packing slips.",
        });
      }

      const pdf = await buildPackingSlipsPdf({
        orderIds: orderedIds,
        byOrderId,
      });

      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const filename = `kimora-packing-slips-${stamp}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.status(200).send(Buffer.from(pdf));
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("POST /api/admin/packing-slips/batch error:", s);
      return res.status(500).json({ ok: false, message: "Failed to generate packing slips." });
    }
  });

  app.post("/api/customer-portal/request", async (req, res) => {
    const genericOk = () =>
      res.json({
        ok: true,
        message: "If that email is in our system, you’ll receive a link shortly.",
      });

    try {
      const emailRaw = String(req.body?.email ?? "");
      const email = normalizeEmail(emailRaw);

      if (!email || !isValidEmail(email)) return genericOk();

      const sessionSecret = process.env.SESSION_SECRET;
      if (!sessionSecret) {
        console.error("[portal] Missing SESSION_SECRET");
        return res.status(500).json({ message: "Missing SESSION_SECRET" });
      }

      const found = await db
        .select({ stripeCustomerId: orders.stripeCustomerId })
        .from(orders)
        .where(eq(orders.customerEmail, email))
        .orderBy(desc(orders.createdAt))
        .limit(1);

      const stripeCustomerId = found?.[0]?.stripeCustomerId ?? null;
      if (!stripeCustomerId) return genericOk();

      const siteUrl = getSiteUrl();

      const token = signToken(
        { email, exp: Math.floor(Date.now() / 1000) + 15 * 60, v: 1 },
        sessionSecret
      );

      const portalLink = `${siteUrl}/manage-subscription?token=${encodeURIComponent(token)}`;
      const fallbackLink = `${siteUrl}/manage-subscription`;

      const resendKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "";
      if (!resendKey || !fromEmail) return genericOk();

      const resend = new Resend(resendKey);

      const subject = "Manage your Kimora subscription";
      const text = `Manage your Kimora subscription

Secure link (expires in 15 minutes):
${portalLink}

If your link expired, request a fresh one here:
${fallbackLink}

Need help? Reply to this email or contact support@kimoraco.com
`;

      const html = `<div style="font-family: ui-sans-serif, system-ui; line-height:1.5; color:#111;">
  <h2 style="margin:0 0 8px;">Manage your Kimora subscription</h2>
  <p style="margin:0 0 16px;">Use the secure link below (expires in <b>15 minutes</b>):</p>
  <p style="margin:0 0 18px;">
    <a href="${portalLink}" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#111;color:#fff;text-decoration:none;">
      Open subscription portal
    </a>
  </p>
  <p style="margin:0 0 10px;font-size:14px;color:#444;">
    If this link expired, request a fresh one here:
    <a href="${fallbackLink}">${fallbackLink}</a>
  </p>
  <p style="margin:18px 0 0;font-size:12px;color:#666;">
    Need help? Reply to this email or contact <a href="mailto:support@kimoraco.com">support@kimoraco.com</a>.
  </p>
</div>`;

      try {
        const from = fromEmail.includes("<") ? fromEmail : `Kimora Co <${fromEmail}>`;
        await resend.emails.send({ from, to: email, subject, text, html } as any);
      } catch (e: any) {
        const s = safeErrSummary(e);
        console.error("[portal] resend send failed:", s);
      }

      return genericOk();
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("POST /api/customer-portal/request error:", s);
      return genericOk();
    }
  });

  app.get("/api/customer-portal", async (req, res) => {
    try {
      const token = String((req.query as any)?.token ?? "").trim();
      const sessionSecret = String(process.env.SESSION_SECRET ?? "").trim();
      if (!token || !sessionSecret) {
        return res.status(400).json({ ok: false, message: "Missing token." });
      }

      const payload = verifyToken<{ email?: string }>(token, sessionSecret);
      const email = normalizeEmail(String(payload?.email ?? ""));
      if (!email || !isValidEmail(email)) {
        return res.status(401).json({ ok: false, message: "Invalid or expired token." });
      }

      const stripeCustomerId = await findStripeCustomerIdByEmail(email);
      if (!stripeCustomerId) {
        return res.status(404).json({ ok: false, message: "No customer found for that email." });
      }

      const siteUrl = getSiteUrl();
      const portal = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${siteUrl}/manage-subscription`,
      });

      return res.json({ ok: true, url: (portal as any).url });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("GET /api/customer-portal error:", s);
      return res.status(500).json({ ok: false, message: "Failed to open subscription portal." });
    }
  });

  app.get("/api/customer-portal/verify", async (req, res) => {
    try {
      const token = String((req.query as any)?.token ?? "").trim();
      const sessionSecret = String(process.env.SESSION_SECRET ?? "").trim();
      if (!token || !sessionSecret) {
        return res.status(400).json({ ok: false, message: "Missing token." });
      }

      const payload = verifyToken<{ email?: string }>(token, sessionSecret);
      if (!payload?.email || !isValidEmail(payload.email)) {
        return res.status(401).json({ ok: false, message: "Invalid or expired token." });
      }

      return res.json({ ok: true, email: payload.email });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("GET /api/customer-portal/verify error:", s);
      return res.status(500).json({ ok: false, message: "Failed to verify token." });
    }
  });

  return httpServer;
}