// server/routes.ts
import type { Express } from "express";
import type { Server } from "http";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { Resend } from "resend";

import { stripe } from "./stripe";
import { db } from "./db";
import { orders, orderItems, wholesaleApplications } from "../shared/schema";

type CheckoutItem = {
  flavor: string; // e.g. "strawberry-guava"
  type: "onetime" | "subscribe";
  frequency?: "2" | "4" | "6"; // required when type === "subscribe"
  quantity: number;
};

function slugToEnvKey(slug: string) {
  return slug.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

/**
 * IMPORTANT:
 * Never use req.headers.origin for security/correctness.
 * For emails and Stripe return URLs we want a stable canonical base URL.
 */
function getSiteUrl() {
  return (
    process.env.PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://kimoraco.com"
      : "http://localhost:5173")
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

/**
 * IMPORTANT: never log raw DB errors that include SQL params (PII).
 * Summarize safely.
 */
function safeErrSummary(err: any) {
  const message = String(err?.message || "unknown error");
  const code =
    err?.code ||
    err?.cause?.code ||
    err?.cause?.errno ||
    err?.errno ||
    null;

  const shortMsg = message.length > 180 ? message.slice(0, 180) + "…" : message;

  return { code, message: shortMsg };
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

async function findStripeCustomerIdByEmail(
  email: string,
): Promise<string | null> {
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
    console.warn("[checkout] DB customer lookup failed:", e);
  }

  try {
    const list = await stripe.customers.list({
      email: normalized,
      limit: 1,
    });
    return list.data?.[0]?.id ?? null;
  } catch (e) {
    console.warn("[checkout] Stripe customer lookup failed:", e);
    return null;
  }
}

/** Simple validations to match your DB constraints */
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

function formatMoney(
  amountCents: number | null | undefined,
  currency: string | null | undefined,
) {
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
  const parts = [
    addr.line1,
    addr.line2,
    addr.city,
    addr.state,
    addr.postal_code,
    addr.country,
  ]
    .map((x: any) => String(x || "").trim())
    .filter(Boolean);
  return parts.join(", ");
}

/**
 * Pull shipping from:
 * 1) session.shipping_details
 * 2) payment_intent.latest_charge.shipping (if present)
 *
 * ✅ Important: Stripe typings differ by version/api, so we treat Stripe objects as `any` here.
 */
async function resolveShippingForSession(sessionId: string, sessionLike?: any) {
  try {
    // Step 1: Fetch full session (event payload may be partial)
    const full: any = await stripe.checkout.sessions.retrieve(sessionId);

    const shippingName =
      full?.shipping_details?.name ??
      (sessionLike as any)?.shipping_details?.name ??
      null;

    const shippingAddress =
      full?.shipping_details?.address ??
      (sessionLike as any)?.shipping_details?.address ??
      null;

    if (shippingName || shippingAddress) {
      return { shippingName, shippingAddress };
    }

    // Step 2: Fallback to PaymentIntent -> latest_charge.shipping
    const piId =
      (typeof full?.payment_intent === "string" ? full.payment_intent : null) ||
      (typeof (sessionLike as any)?.payment_intent === "string"
        ? (sessionLike as any).payment_intent
        : null);

    if (piId) {
      const pi: any = await stripe.paymentIntents.retrieve(piId, {
        expand: ["latest_charge"],
      } as any);

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
    console.warn(
      "[shipping] resolveShippingForSession failed:",
      safeErrSummary(e),
    );
    return { shippingName: null, shippingAddress: null };
  }
}

async function sendOrderConfirmationEmail(args: {
  session: any;
  lineItems: any[];
  isSubscription: boolean;
}) {
  const resendKey = String(process.env.RESEND_API_KEY || "").trim();
  const fromEmail = String(
    process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "",
  ).trim();
  if (!resendKey || !fromEmail) {
    console.warn(
      "[order-email] Resend not configured (missing RESEND_API_KEY or RESEND_FROM_EMAIL/EMAIL_FROM).",
    );
    return;
  }

  const resend = new Resend(resendKey);
  const from = fromEmail.includes("<") ? fromEmail : `Kimora Co <${fromEmail}>`;

  const siteUrl = getSiteUrl();

  const email =
    normalizeEmail(
      String(
        args.session?.customer_details?.email ??
          args.session?.customer_email ??
          "",
      ),
    ) || "";

  if (!email || !isValidEmail(email)) {
    console.warn("[order-email] Missing/invalid customer email; skipping send.");
    return;
  }

  const name = safeString(args.session?.customer_details?.name, 200);
  const shippingName =
    safeString(args.session?.shipping_details?.name, 200) || name;
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
  const supportEmail = "alex@kimoraco.com";

  const itemsText = lines
    .map((l: any) => {
      const flavor = String(l.flavor || "")
        .split("-")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      const cadence =
        l.purchaseType === "subscribe" && l.frequencyWeeks
          ? ` (Subscription — every ${l.frequencyWeeks} weeks)`
          : "";
      const money =
        l.unitAmount != null ? ` @ ${formatMoney(l.unitAmount, currency)}` : "";
      const total =
        l.lineTotal != null ? ` = ${formatMoney(l.lineTotal, currency)}` : "";
      return `- ${flavor} x${l.qty}${cadence}${money}${total}`;
    })
    .join("\n");

  const text =
    `Thanks${shippingName ? `, ${shippingName}` : ""} — your Kimora order is confirmed.\n\n` +
    (orderNumber ? `Order: ${orderNumber}\n` : "") +
    (itemsText ? `\nItems:\n${itemsText}\n` : "") +
    (amountSubtotal != null
      ? `\nSubtotal: ${formatMoney(amountSubtotal, currency)}\n`
      : "") +
    (amountTotal != null ? `Total: ${formatMoney(amountTotal, currency)}\n` : "") +
    (shippingAddr
      ? `\nShipping to:\n${shippingName || "(name)"}\n${addressToOneLine(
          shippingAddr,
        )}\n`
      : "") +
    (args.isSubscription
      ? `\nManage your subscription anytime:\n${manageLink}\n`
      : "") +
    `\nNeed help? Reply to this email or contact ${supportEmail}.\n\n` +
    `OUT-TRAIN. OUT-SMART. OUT-LAST.\n`;

  const itemsHtml = lines
    .map((l: any) => {
      const flavor = escapeHtml(
        String(l.flavor || "")
          .split("-")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
      );
      const cadence =
        l.purchaseType === "subscribe" && l.frequencyWeeks
          ? ` <span style="color:#666;">(Subscription — every ${l.frequencyWeeks} weeks)</span>`
          : "";
      const money =
        l.unitAmount != null
          ? ` <span style="color:#666;">@ ${escapeHtml(
              formatMoney(l.unitAmount, currency),
            )}</span>`
          : "";
      const total =
        l.lineTotal != null
          ? ` <span style="color:#111;font-weight:600;">${escapeHtml(
              formatMoney(l.lineTotal, currency),
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
    Thanks${
      shippingName ? `, <b>${escapeHtml(shippingName)}</b>` : ""
    }. Your Kimora order is confirmed.
  </p>

  ${
    orderNumber
      ? `<div style="margin:0 0 12px;color:#444;"><b>Order:</b> ${escapeHtml(
          orderNumber,
        )}</div>`
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
        ? `<div><b>Subtotal:</b> ${escapeHtml(
            formatMoney(amountSubtotal, currency),
          )}</div>`
        : ""
    }
    ${
      amountTotal != null
        ? `<div><b>Total:</b> ${escapeHtml(
            formatMoney(amountTotal, currency),
          )}</div>`
        : ""
    }
  </div>

  ${
    shippingAddr
      ? `<div style="margin:0 0 14px;">
          <div><b>Shipping to</b></div>
          <div style="color:#444;">${escapeHtml(shippingName || "(name)")}</div>
          <div style="color:#444;">${escapeHtml(
            addressToOneLine(shippingAddr),
          )}</div>
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

/**
 * Shipping strategy:
 * - Subscriptions: FREE shipping
 * - One-time:
 *    - $5 flat under $50
 *    - FREE at $50+
 */
async function computeCartSubtotalCentsFromStripePrices(
  lineItems: Array<{ price: string; quantity: number }>,
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

function buildShippingOptions(params: {
  mode: "payment" | "subscription";
  currency: string;
  subtotalCents: number;
}): any[] {
  const currency = params.currency || "usd";

  if (params.mode === "subscription") {
    return [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 0, currency },
          display_name: "Free Shipping",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 3 },
            maximum: { unit: "business_day", value: 7 },
          },
        },
      },
    ];
  }

  const FREE_THRESHOLD_CENTS = 5000; // $50.00
  const isFree = params.subtotalCents >= FREE_THRESHOLD_CENTS;

  if (isFree) {
    return [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 0, currency },
          display_name: "Free Shipping (orders $50+)",
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
        fixed_amount: { amount: 500, currency }, // $5.00
        display_name: "Standard Shipping",
        delivery_estimate: {
          minimum: { unit: "business_day", value: 3 },
          maximum: { unit: "business_day", value: 7 },
        },
      },
    },
  ];
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
  const sig = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken<T>(token: string, secret: string): T | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [body, sig] = parts;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");

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

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // -----------------------------
  // Admin: Orders
  // -----------------------------
  app.get("/api/admin/orders", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const limitRaw = String(req.query?.limit ?? "").trim();
      const limit = Math.min(
        500,
        Math.max(1, Number.isFinite(Number(limitRaw)) ? Math.floor(Number(limitRaw)) : 50),
      );

      const rows = await db
        .select()
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(limit);

      const ids = rows.map((r: any) => r.id).filter(Boolean);
      const itemsByOrderId = new Map<string, any[]>();

      if (ids.length) {
        // Get items for these orders
        const items = await db
          .select()
          .from(orderItems)
          // drizzle doesn't support "where in" without helpers in some setups,
          // so we group by order by querying per order if needed.
          // But usually Drizzle supports `inArray`. If you have it, replace this block.
          .orderBy(desc(orderItems.createdAt));

        // Filter in-memory safely (small sizes since limit <= 500)
        for (const it of items) {
          if (!ids.includes((it as any).orderId)) continue;
          const k = String((it as any).orderId);
          const list = itemsByOrderId.get(k) || [];
          list.push(it);
          itemsByOrderId.set(k, list);
        }
      }

      const out = rows.map((o: any) => ({
        ...o,
        items: itemsByOrderId.get(String(o.id)) || [],
      }));

      return res.json({ ok: true, rows: out });
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

      const row = await db
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);

      if (!row?.length) return res.status(404).json({ ok: false, message: "Not found." });

      return res.json({ ok: true, order: row[0] });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("GET /api/admin/orders/:id error:", s);
      return res.status(500).json({ ok: false, message: "Failed to load order." });
    }
  });

  app.get("/api/admin/orders/:id/items", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const id = String(req.params.id || "").trim();
      if (!id) return res.status(400).json({ ok: false, message: "Missing id." });

      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, id))
        .orderBy(desc(orderItems.createdAt))
        .limit(500);

      return res.json({ ok: true, rows: items });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("GET /api/admin/orders/:id/items error:", s);
      return res.status(500).json({ ok: false, message: "Failed to load order items." });
    }
  });

  // -----------------------------
  // Admin: wholesale applications
  // -----------------------------
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
      return res
        .status(500)
        .json({ ok: false, message: "Failed to load applications." });
    }
  });

  app.patch("/api/admin/wholesale-applications/:id", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const id = String(req.params.id || "").trim();
      const status = String(req.body?.status || "").trim();

      const allowed = new Set([
        "new",
        "reviewing",
        "approved",
        "rejected",
        "closed",
      ]);

      if (!id)
        return res.status(400).json({ ok: false, message: "Missing id." });
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
      return res
        .status(500)
        .json({ ok: false, message: "Failed to update status." });
    }
  });

  // -----------------------------
  // Wholesale apply
  // -----------------------------
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
        return res
          .status(400)
          .json({ ok: false, message: "Business name is required." });
      }
      if (!contactName) {
        return res
          .status(400)
          .json({ ok: false, message: "Contact name is required." });
      }
      if (!email || !isValidEmail(email)) {
        return res
          .status(400)
          .json({ ok: false, message: "Valid email is required." });
      }

      if (!phoneDigits) {
        return res
          .status(400)
          .json({ ok: false, message: "Phone number is required." });
      }
      if (!isValidPhoneDigits(phoneDigits)) {
        return res.status(400).json({
          ok: false,
          message: "Phone number must include at least 10 digits.",
        });
      }

      if (!city)
        return res.status(400).json({ ok: false, message: "City is required." });
      if (!state)
        return res
          .status(400)
          .json({ ok: false, message: "State is required." });

      if (businessType === "other" && !businessTypeOther) {
        return res
          .status(400)
          .json({ ok: false, message: "Please specify business type." });
      }

      if (!memberCount || memberCount <= 0) {
        return res.status(400).json({
          ok: false,
          message:
            "Approx members / active clients is required and must be > 0.",
        });
      }

      const ip =
        (req.headers["x-forwarded-for"] as string | undefined)
          ?.split(",")[0]
          ?.trim() ||
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
      const fromEmail =
        process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "";
      const notifyTo = process.env.WHOLESALE_NOTIFY_TO || "alex@kimoraco.com";
      const siteUrl = getSiteUrl();

      const canSend = Boolean(resendKey && fromEmail);
      if (canSend) {
        const resend = new Resend(resendKey!);
        const from = fromEmail.includes("<")
          ? fromEmail
          : `Kimora Co <${fromEmail}>`;

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
    safeString(applicationId ?? "(unknown)"),
  )}</div>
  <div style="margin:0 0 8px;"><b>Business:</b> ${escapeHtml(
    safeString(businessName),
  )}</div>
  <div style="margin:0 0 8px;"><b>Contact:</b> ${escapeHtml(
    safeString(contactName),
  )}</div>
  <div style="margin:0 0 8px;"><b>Email:</b> ${escapeHtml(safeString(email))}</div>
  <div style="margin:0 0 8px;"><b>Phone:</b> ${escapeHtml(
    safeString(phoneDigits),
  )}</div>
  <div style="margin:0 0 8px;"><b>Website/IG:</b> ${escapeHtml(
    safeString(websiteOrInstagram || "(not provided)"),
  )}</div>
  <div style="margin:0 0 8px;"><b>City/State:</b> ${escapeHtml(
    safeString(city),
  )}, ${escapeHtml(safeString(state))}</div>
  <div style="margin:0 0 8px;"><b>Business type:</b> ${escapeHtml(
    safeString(businessType),
  )}${
          businessType === "other" && businessTypeOther
            ? ` (${escapeHtml(safeString(businessTypeOther))})`
            : ""
        }</div>
  <div style="margin:0 0 8px;"><b>Member count:</b> ${escapeHtml(
    safeString(memberCount),
  )}</div>
  <div style="margin:0 0 8px;"><b>Retail setup:</b> ${escapeHtml(
    safeString(retailSetup || "(not provided)"),
  )}</div>
  <div style="margin:0 0 8px;"><b>Interested:</b>
    onShelf=${String(interestedOnShelf)},
    coachAffiliate=${String(interestedCoachAffiliate)},
    eventSponsorship=${String(interestedEventSponsorship)}
  </div>
  <hr style="border:none;border-top:1px solid #eee;margin:14px 0;" />
  <div style="margin:0 0 6px;"><b>Notes</b></div>
  <pre style="white-space:pre-wrap;background:#f7f7f7;padding:12px;border-radius:10px;font-size:12px;">${escapeHtml(
    safeString(notes || "(none)"),
  )}</pre>
</div>`;

        const applicantSubject = "Kimora Co — wholesale application received";
        const applicantText =
          `Thanks for applying to Kimora Co wholesale.\n\n` +
          `We received your application for ${businessName} and will review it shortly.\n\n` +
          `If you need to add anything, reply to this email or contact alex@kimoraco.com.\n`;

        const applicantHtml = `<div style="font-family: ui-sans-serif, system-ui; line-height:1.5; color:#111;">
  <h2 style="margin:0 0 10px;">Wholesale application received</h2>
  <p style="margin:0 0 12px;">
    Thanks${
      contactName ? `, ${escapeHtml(safeString(contactName))}` : ""
    }! We received your wholesale application for <b>${escapeHtml(
          safeString(businessName),
        )}</b>.
  </p>
  <p style="margin:0 0 12px;">We’ll review it and get back to you shortly.</p>
  <p style="margin:16px 0 0;font-size:12px;color:#666;">
    Need to add something? Reply to this email or contact
    <a href="mailto:alex@kimoraco.com">alex@kimoraco.com</a>.
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
          "[wholesale] Resend not configured (missing RESEND_API_KEY or RESEND_FROM_EMAIL/EMAIL_FROM). Stored application without emailing.",
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
          message:
            "Please check required fields (phone + member count) and try again.",
        });
      }

      return res
        .status(500)
        .json({ ok: false, message: "Failed to submit wholesale application." });
    }
  });

  // -----------------------------
  // Checkout session creation (shipping rules wired)
  // -----------------------------
  app.post("/api/checkout", async (req, res) => {
    try {
      const emailRaw = String(req.body?.email ?? "");
      const email = normalizeEmail(emailRaw);

      const itemsRaw: any[] = Array.isArray(req.body?.items)
        ? req.body.items
        : [];
      const items: CheckoutItem[] = itemsRaw
        .map((it: any) => {
          const flavor = String(it?.flavor ?? "").trim();
          const type: CheckoutItem["type"] =
            it?.type === "subscribe" ? "subscribe" : "onetime";
          const frequency: CheckoutItem["frequency"] | undefined =
            type === "subscribe" &&
            (it?.frequency === "2" ||
              it?.frequency === "4" ||
              it?.frequency === "6")
              ? it.frequency
              : undefined;
          const qRaw = Number(it?.quantity);
          const quantity = Number.isFinite(qRaw)
            ? Math.max(1, Math.floor(qRaw))
            : 1;
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
          message:
            "Subscriptions and one-time items must be checked out separately.",
        });
      }

      const siteUrl = getSiteUrl();
      const successUrl = `${siteUrl}/order-success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${siteUrl}/checkout?canceled=1`;

      const mode: "payment" | "subscription" = hasSub
        ? "subscription"
        : "payment";

      const line_items = items.map((it: CheckoutItem) => ({
        price: getPriceId(it),
        quantity: it.quantity,
      }));

      const currency = "usd";
      const subtotalCents =
        mode === "subscription"
          ? 0
          : await computeCartSubtotalCentsFromStripePrices(line_items);

      const shipping_options = buildShippingOptions({
        mode,
        currency,
        subtotalCents,
      });

      const existingCustomerId = await findStripeCustomerIdByEmail(email);

      const sessionParams: any = {
        mode,
        line_items,
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: false,

        shipping_address_collection: { allowed_countries: ["US"] },
        shipping_options,

        phone_number_collection: { enabled: true },
        automatic_tax: { enabled: true },
      };

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

      const stripeMsg =
        err?.raw?.message ||
        err?.message ||
        "Failed to create checkout session.";

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

  // -----------------------------
  // Checkout session fetch (OrderSuccess uses this)
  // -----------------------------
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
        customer_email:
          session.customer_details?.email ?? session.customer_email ?? null,
        payment_status: session.payment_status ?? null,
        subscription: session.subscription ?? null,
      });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("GET /api/checkout/session error:", s);
      return res.status(500).json({ message: "Failed to load session" });
    }
  });

  // -----------------------------
  // Stripe webhook (DB write + order confirmation email)
  // -----------------------------
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

        // ✅ resolve shipping reliably (refetch session + fallback to charge)
        const resolvedShipping = await resolveShippingForSession(
          String(session.id),
          session,
        );

        const stripeCustomerId =
          await getStripeCustomerIdFromCheckoutSession(session);

        const lineItems = await stripe.checkout.sessions.listLineItems(
          session.id,
          { limit: 100 },
        );

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

            // ✅ use resolved shipping (not event payload shipping_details)
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

          // ✅ backfill shipping if it was blank when first inserted
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
                  resolvedShipping.shippingName ??
                  existing?.[0]?.shippingName ??
                  null,
                shippingAddress:
                  resolvedShipping.shippingAddress ??
                  existing?.[0]?.shippingAddress ??
                  null,
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
              })
              .onConflictDoNothing();
          }
        }

        const wasNewInsert = Boolean(inserted?.length);
        if (wasNewInsert) {
          await sendOrderConfirmationEmail({
            session,
            lineItems: lineItems.data,
            isSubscription:
              session.mode === "subscription" || Boolean(session.subscription),
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

  /**
   * STEP 1: Request a magic link to manage subscription
   * Body: { email }
   */
  app.post("/api/customer-portal/request", async (req, res) => {
    const genericOk = () =>
      res.json({
        ok: true,
        message:
          "If that email is in our system, you’ll receive a link shortly.",
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
        sessionSecret,
      );

      const portalLink = `${siteUrl}/manage-subscription?token=${encodeURIComponent(
        token,
      )}`;
      const fallbackLink = `${siteUrl}/manage-subscription`;

      const resendKey = process.env.RESEND_API_KEY;
      const fromEmail =
        process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "";
      if (!resendKey || !fromEmail) return genericOk();

      const resend = new Resend(resendKey);

      const subject = "Manage your Kimora subscription";
      const text = `Manage your Kimora subscription

Secure link (expires in 15 minutes):
${portalLink}

If your link expired, request a fresh one here:
${fallbackLink}

Need help? Reply to this email or contact alex@kimoraco.com
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
    Need help? Reply to this email or contact <a href="mailto:alex@kimoraco.com">alex@kimoraco.com</a>.
  </p>
</div>`;

      try {
        const from = fromEmail.includes("<")
          ? fromEmail
          : `Kimora Co <${fromEmail}>`;
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

  /**
   * STEP 2: Exchange token for a Stripe Billing Portal URL
   */
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
        return res
          .status(401)
          .json({ ok: false, message: "Invalid or expired token." });
      }

      const stripeCustomerId = await findStripeCustomerIdByEmail(email);
      if (!stripeCustomerId) {
        return res
          .status(404)
          .json({ ok: false, message: "No customer found for that email." });
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
      return res
        .status(500)
        .json({ ok: false, message: "Failed to open subscription portal." });
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
        return res
          .status(401)
          .json({ ok: false, message: "Invalid or expired token." });
      }

      return res.json({ ok: true, email: payload.email });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("GET /api/customer-portal/verify error:", s);
      return res
        .status(500)
        .json({ ok: false, message: "Failed to verify token." });
    }
  });

  return httpServer;
}