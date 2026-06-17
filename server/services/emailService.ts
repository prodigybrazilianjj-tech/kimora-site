// server/services/emailService.ts
import * as React from "react";
import { render } from "@react-email/render";
import { eq } from "drizzle-orm";
import { Resend } from "resend";

import { OrderConfirmationEmail } from "../emails/OrderConfirmationEmail";
import { ShippingNotificationEmail } from "../emails/ShippingNotificationEmail";
import { WaitlistWelcomeEmail } from "../emails/WaitlistWelcomeEmail";
import { EarlyAccessDropEmail } from "../emails/EarlyAccessDropEmail";
import { MarketingWelcomeEmail } from "../emails/MarketingWelcomeEmail";

import { db } from "../db";
import { stripe } from "../stripe";
import { orders, orderItems } from "../../shared/schema";
import { trackingUrlFor } from "./shippingService";

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

function getSiteUrl() {
  return (
    process.env.PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === "production" ? "https://kimoraco.com" : "http://localhost:5173")
  );
}

function getSupportEmail() {
  return String(process.env.SUPPORT_EMAIL || "support@kimoraco.com").trim();
}

function getWaitlistNotifyEmail() {
  return String(
    process.env.WAITLIST_NOTIFY_EMAIL ||
      process.env.RESEND_INTERNAL_TO_EMAIL ||
      process.env.SUPPORT_EMAIL ||
      "support@kimoraco.com"
  ).trim();
}

function getLaunchDiscountCode() {
  return String(process.env.EARLY_ACCESS_DISCOUNT_CODE || "").trim();
}

function getLaunchWindowText() {
  return String(process.env.EARLY_ACCESS_WINDOW_TEXT || "Early access is now open.").trim();
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

function flavorFromDescription(description: string | null | undefined): string | null {
  const desc = String(description || "").toLowerCase();
  if (desc.includes("strawberry")) return "strawberry-guava";
  if (desc.includes("lemon") || desc.includes("lychee") || desc.includes("yuzu")) return "lemon-yuzu";
  if (desc.includes("raspberry") || desc.includes("dragonfruit")) return "raspberry-dragonfruit";
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

function getResendClient() {
  const resendKey = String(process.env.RESEND_API_KEY || "").trim();
  const fromEmail = String(process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "").trim();

  if (!resendKey || !fromEmail) return null;

  return {
    resend: new Resend(resendKey),
    from: fromEmail.includes("<") ? fromEmail : `Kimora Co <${fromEmail}>`,
  };
}

export async function sendOrderConfirmationEmail(args: {
  session: any;
  lineItems: any[];
  isSubscription: boolean;
}) {
  const client = getResendClient();
  if (!client) {
    console.warn(
      "[order-email] Resend not configured (missing RESEND_API_KEY or RESEND_FROM_EMAIL/EMAIL_FROM)."
    );
    return;
  }

  const { resend, from } = client;
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
    const mappedByPrice = priceId ? mapPriceIdToItem(String(priceId)) : null;
    const flavorFallback = flavorFromDescription(li?.description ?? li?.price?.product?.name);
    const mapped = mappedByPrice && mappedByPrice.flavor !== "unknown"
      ? mappedByPrice
      : {
          flavor: flavorFallback ?? mappedByPrice?.flavor ?? "unknown",
          purchaseType: (mappedByPrice?.purchaseType ?? (args.isSubscription ? "subscribe" : "onetime")) as "onetime" | "subscribe",
          frequencyWeeks: mappedByPrice?.frequencyWeeks ?? null,
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
  const supportEmail = getSupportEmail();

  const EMAIL_IMAGE_BASE = "https://kimoraco.com";

  function flavorImageUrl(slug: string): string | null {
    const known = ["strawberry-guava", "lemon-yuzu", "raspberry-dragonfruit"];
    const normalized = normalizeFlavorSlug(slug);
    return known.includes(normalized)
      ? `${EMAIL_IMAGE_BASE}/assets/products/${normalized}/pouch.png`
      : null;
  }

  const formattedLines = lines.map((l: any) => ({
    qty: l.qty,
    flavor: titleizeSlug(l.flavor),
    imageUrl: flavorImageUrl(l.flavor),
    purchaseType: l.purchaseType,
    frequencyWeeks: l.frequencyWeeks,
    unitAmount: l.unitAmount,
    lineTotal: l.lineTotal != null ? formatMoney(l.lineTotal, currency) : null,
  }));

  const itemsText = lines
    .map((l: any) => {
      const flavor = titleizeSlug(l.flavor);
      const cadence =
        l.purchaseType === "subscribe"
          ? ` (Monthly subscription)`
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
    `\nNeed help? Reply to this email or contact ${supportEmail}.\n\nOUT-TRAIN. OUT-SMART. OUT-LAST.\n`;

  const html = await render(
    React.createElement(OrderConfirmationEmail, {
      siteUrl,
      supportEmail,
      shippingName,
      orderNumber,
      lines: formattedLines,
      subtotal: amountSubtotal != null ? formatMoney(amountSubtotal, currency) : "",
      total: amountTotal != null ? formatMoney(amountTotal, currency) : "",
      shippingAddress: shippingAddr
        ? `${shippingName || ""}, ${addressToOneLine(shippingAddr)}`.replace(/^,\s*/, "")
        : "",
      isSubscription: args.isSubscription,
      manageLink,
    })
  );

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

export async function sendShippingNotificationEmail(args: {
  customerEmail: string;
  shippingName?: string | null;
  orderId?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
  isSubscription?: boolean;
}) {
  const client = getResendClient();
  if (!client) return;

  const { resend, from } = client;

  const email = normalizeEmail(String(args.customerEmail || ""));
  if (!email || !isValidEmail(email)) return;

  const supportEmail = getSupportEmail();
  const carrier = safeString(args.carrier || "", 40);
  const tracking = safeString(args.trackingNumber || "", 120);
  const name = safeString(args.shippingName || "", 200);
  const trackingUrl = trackingUrlFor(carrier, tracking);
  const isSubscription = Boolean(args.isSubscription);
  const manageLink = `${getSiteUrl()}/manage-subscription`;

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
    (isSubscription
      ? `\nWant a different flavor next time? Change it before your next shipment:\n${manageLink}\n`
      : "") +
    `\nNeed help? Reply to this email or contact ${supportEmail}.\nOUT-TRAIN. OUT-SMART. OUT-LAST.\n`;

  const html = await render(
    React.createElement(ShippingNotificationEmail, {
      siteUrl: getSiteUrl(),
      supportEmail,
      name,
      orderId: String(args.orderId || ""),
      carrier,
      trackingNumber: tracking,
      trackingUrl,
      isSubscription,
      manageLink,
    })
  );

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

export async function sendWaitlistConfirmationEmail(args: {
  email: string;
  firstName?: string | null;
}) {
  const client = getResendClient();
  if (!client) {
    console.warn(
      "[waitlist-email] Resend not configured (missing RESEND_API_KEY or RESEND_FROM_EMAIL/EMAIL_FROM)."
    );
    return;
  }

  const { resend, from } = client;

  const email = normalizeEmail(String(args.email || ""));
  if (!email || !isValidEmail(email)) {
    console.warn("[waitlist-email] Missing/invalid email; skipping send.");
    return;
  }

  const firstName = safeString(args.firstName || "", 120);
  const siteUrl = getSiteUrl();
  const supportEmail = getSupportEmail();

  const subject = "Kimora Co — You're on the list";
  const text =
    `You're in${firstName ? `, ${firstName}` : ""}.\n\n` +
    `Thanks for joining the Kimora Co waitlist.\n` +
    `We’re getting everything dialed in and you’ll be among the first to hear when early access opens.\n\n` +
    `Site: ${siteUrl}\n` +
    `Need help? Reply to this email or contact ${supportEmail}.\n\n` +
    `OUT-TRAIN. OUT-SMART. OUT-LAST.\n`;

  const html = await render(
    React.createElement(WaitlistWelcomeEmail, {
      siteUrl,
      supportEmail,
      firstName: firstName || null,
    })
  );

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
    console.error("[waitlist-email] confirmation send failed:", s);
  }
}

export async function sendWaitlistAdminNotificationEmail(args: {
  email: string;
  source?: string | null;
  metadata?: any;
}) {
  const client = getResendClient();
  if (!client) return;

  const { resend, from } = client;
  const notifyTo = getWaitlistNotifyEmail();
  if (!notifyTo || !isValidEmail(notifyTo)) return;

  const email = normalizeEmail(String(args.email || ""));
  if (!email || !isValidEmail(email)) return;

  const source = safeString(args.source || "unknown", 120) || "unknown";
  const ip = safeString(args.metadata?.ip || "", 120) || "—";
  const userAgent = safeString(args.metadata?.userAgent || "", 500) || "—";
  const referer = safeString(args.metadata?.referer || "", 500) || "—";

  const subject = "Kimora Co — New waitlist signup";
  const text =
    `New waitlist signup\n\n` +
    `Email: ${email}\n` +
    `Source: ${source}\n` +
    `IP: ${ip}\n` +
    `User-Agent: ${userAgent}\n` +
    `Referer: ${referer}\n`;

  const html = `<div style="font-family: ui-sans-serif, system-ui; line-height:1.5; color:#111;">
  <h2 style="margin:0 0 10px;">New waitlist signup</h2>
  <div style="margin:0 0 8px;"><b>Email:</b> ${escapeHtml(email)}</div>
  <div style="margin:0 0 8px;"><b>Source:</b> ${escapeHtml(source)}</div>
  <div style="margin:0 0 8px;"><b>IP:</b> ${escapeHtml(ip)}</div>
  <div style="margin:0 0 8px;"><b>User-Agent:</b> ${escapeHtml(userAgent)}</div>
  <div style="margin:0 0 8px;"><b>Referer:</b> ${escapeHtml(referer)}</div>
</div>`;

  try {
    await resend.emails.send({
      from,
      to: notifyTo,
      subject,
      text,
      html,
      replyTo: getSupportEmail(),
    } as any);
  } catch (e: any) {
    const s = safeErrSummary(e);
    console.error("[waitlist-email] admin notification send failed:", s);
  }
}

export async function sendEarlyAccessDropEmail(args: {
  email: string;
  firstName?: string | null;
  launchUrl?: string | null;
  discountCode?: string | null;
  windowText?: string | null;
}) {
  const client = getResendClient();
  if (!client) {
    console.warn(
      "[early-access-email] Resend not configured (missing RESEND_API_KEY or RESEND_FROM_EMAIL/EMAIL_FROM)."
    );
    return;
  }

  const { resend, from } = client;

  const email = normalizeEmail(String(args.email || ""));
  if (!email || !isValidEmail(email)) {
    console.warn("[early-access-email] Missing/invalid email; skipping send.");
    return;
  }

  const firstName = safeString(args.firstName || "", 120);
  const launchUrl = safeString(args.launchUrl || `${getSiteUrl()}/shop`, 1000) || `${getSiteUrl()}/shop`;
  const discountCode = safeString(args.discountCode || getLaunchDiscountCode(), 120);
  const windowText = safeString(args.windowText || getLaunchWindowText(), 300) || "Early access is now open.";
  const supportEmail = getSupportEmail();

  const subject = "Kimora Co — Early access is live";
  const text =
    `Early access is live${firstName ? `, ${firstName}` : ""}.\n\n` +
    `${windowText}\n\n` +
    (discountCode ? `Discount code: ${discountCode}\n` : "") +
    `Shop now: ${launchUrl}\n\n` +
    `Need help? Reply to this email or contact ${supportEmail}.\n\n` +
    `OUT-TRAIN. OUT-SMART. OUT-LAST.\n`;

  const html = await render(
    React.createElement(EarlyAccessDropEmail, {
      siteUrl: getSiteUrl(),
      supportEmail,
      firstName: firstName || null,
      launchUrl,
      discountCode: discountCode || null,
      windowText,
    })
  );

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
    console.error("[early-access-email] send failed:", s);
  }
}

export async function maybeSendShippingEmailForOrder(orderId: string) {
  try {
    const row = await db
      .select({
        id: orders.id,
        customerEmail: orders.customerEmail,
        shippingName: orders.shippingName,
        shippingCarrier: orders.shippingCarrier,
        shippingTrackingNumber: orders.shippingTrackingNumber,
        isSubscription: orders.isSubscription,
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
        isSubscription: Boolean(order.isSubscription),
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
        isSubscription: Boolean(order.isSubscription),
      });
    }
  } catch (e) {
    console.warn("[shipping-email] maybeSendShippingEmailForOrder failed:", safeErrSummary(e));
  }
}

export async function sendMarketingWelcomeEmail(args: {
  email: string;
  discountCode: string;
}) {
  const client = getResendClient();
  if (!client) return;

  const { resend, from } = client;
  const email = normalizeEmail(String(args.email || ""));
  if (!email || !isValidEmail(email)) return;

  const siteUrl = getSiteUrl();
  const supportEmail = getSupportEmail();
  const shopUrl = `${siteUrl}/shop`;

  const subject = "Kimora Co — Here's your 10% off";
  const text =
    `Welcome to Kimora Co.\n\n` +
    `Your discount code: ${args.discountCode}\n\n` +
    `Shop now: ${shopUrl}\n\n` +
    `Creatine + electrolytes in a single daily stick. Clean formula, three flavors, nothing artificial.\n\n` +
    `OUT-TRAIN. OUT-SMART. OUT-LAST.\n`;

  const html = await render(
    React.createElement(MarketingWelcomeEmail, {
      siteUrl,
      supportEmail,
      discountCode: args.discountCode,
      shopUrl,
    })
  );

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
    console.error("[marketing-email] send failed:", s);
  }
}

export async function getStripeCustomerIdFromCheckoutSession(
  session: any
): Promise<string | null> {
  let stripeCustomerId: string | null =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  if (!stripeCustomerId && session.subscription) {
    try {
      const subId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        stripeCustomerId =
          typeof sub.customer === "string" ? sub.customer : (sub.customer as any)?.id ?? null;
      }
    } catch {
      // best-effort; return what we have
    }
  }

  return stripeCustomerId;
}
