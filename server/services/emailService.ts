// server/services/emailService.ts
import { eq } from "drizzle-orm";
import { Resend } from "resend";

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
  const supportEmail = getSupportEmail();

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

export async function sendShippingNotificationEmail(args: {
  customerEmail: string;
  shippingName?: string | null;
  orderId?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
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

  const html = `<div style="font-family: ui-sans-serif, system-ui; line-height:1.5; color:#111;">
  <h2 style="margin:0 0 10px;">You’re on the list 🔥</h2>
  <p style="margin:0 0 14px;">
    Thanks${firstName ? `, <b>${escapeHtml(firstName)}</b>` : ""}. You’ve joined the Kimora Co waitlist.
  </p>
  <p style="margin:0 0 14px;color:#444;">
    We’re dialing in flavor, performance, and the full launch experience. You’ll be among the first to hear when early access opens.
  </p>
  <div style="margin:16px 0 12px;">
    <a href="${siteUrl}" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#111;color:#fff;text-decoration:none;">
      Visit Kimora Co
    </a>
  </div>
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
  const discountBlockText = discountCode ? `Discount code: ${discountCode}\n` : "";
  const discountBlockHtml = discountCode
    ? `<div style="margin:0 0 14px;color:#111;"><b>Discount code:</b> <span style="letter-spacing:0.04em;">${escapeHtml(
        discountCode
      )}</span></div>`
    : "";

  const text =
    `Early access is live${firstName ? `, ${firstName}` : ""}.\n\n` +
    `${windowText}\n\n` +
    `${discountBlockText}` +
    `Shop now: ${launchUrl}\n\n` +
    `Need help? Reply to this email or contact ${supportEmail}.\n\n` +
    `OUT-TRAIN. OUT-SMART. OUT-LAST.\n`;

  const html = `<div style="font-family: ui-sans-serif, system-ui; line-height:1.5; color:#111;">
  <h2 style="margin:0 0 10px;">Early access is live 🚀</h2>
  <p style="margin:0 0 14px;">
    ${firstName ? `Hey <b>${escapeHtml(firstName)}</b>, ` : ""}${escapeHtml(windowText)}
  </p>
  ${discountBlockHtml}
  <div style="margin:16px 0 12px;">
    <a href="${launchUrl}" style="display:inline-block;padding:12px 16px;border-radius:10px;background:#111;color:#fff;text-decoration:none;">
      Shop early access
    </a>
  </div>
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