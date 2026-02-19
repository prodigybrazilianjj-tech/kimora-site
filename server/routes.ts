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
  const sig = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}
function verifyToken<T extends { exp?: number }>(
  token: string,
  secret: string,
): T | null {
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
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
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

async function findStripeCustomerIdByEmail(
  email: string,
): Promise<string | null> {
  const normalized = normalizeEmail(email);
  if (!normalized || !isValidEmail(normalized)) return null;

  // 1) DB lookup (fast + consistent)
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

  // 2) Stripe fallback
  try {
    const list = await stripe.customers.list({
      email: normalized,
      limit: 1,
    });
    const stripeCustomerId = list.data?.[0]?.id ?? null;
    return stripeCustomerId;
  } catch (e) {
    console.warn("[checkout] Stripe customer lookup failed:", e);
    return null;
  }
}

function safeString(v: any, maxLen = 20000) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Simple validations to match your DB constraints */
function isValidPhoneDigits(digits: string) {
  // DB CHECK: length(regexp_replace(phone, '\D', '', 'g')) >= 10
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

  // Truncate message so logs don’t become a data leak
  const shortMsg = message.length > 180 ? message.slice(0, 180) + "…" : message;

  return { code, message: shortMsg };
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

  return null; // ok
}

function isFrequency(v: unknown): v is CheckoutItem["frequency"] {
  return v === "2" || v === "4" || v === "6";
}

function isCheckoutType(v: unknown): v is CheckoutItem["type"] {
  return v === "onetime" || v === "subscribe";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  /**
   * ✅ CREATE STRIPE CHECKOUT SESSION
   * Body: { email, items: CheckoutItem[] }
   * Returns: { url, id }
   */
  app.post("/api/checkout", async (req, res) => {
    try {
      const email = normalizeEmail(String(req.body?.email ?? ""));
      const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];

      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ message: "Valid email is required." });
      }
      if (!rawItems.length) {
        return res.status(400).json({ message: "No items to checkout." });
      }

      const items: CheckoutItem[] = rawItems
        .map((it: any) => ({
          flavor: safeString(it?.flavor, 200).toLowerCase(),
          type: it?.type === "subscribe" ? "subscribe" : "onetime",
          frequency: it?.frequency,
          quantity: Math.max(1, Math.floor(Number(it?.quantity) || 1)),
        }))
        .filter((it: any) => {
          if (!it.flavor) return false;
          if (!isCheckoutType(it.type)) return false;
          if (it.type === "subscribe" && !isFrequency(it.frequency)) return false;
          if (!Number.isInteger(it.quantity) || it.quantity < 1) return false;
          return true;
        });

      if (!items.length) {
        return res.status(400).json({ message: "No valid items to checkout." });
      }

      const hasSub = items.some((i) => i.type === "subscribe");
      const hasOne = items.some((i) => i.type === "onetime");

      if (hasSub && hasOne) {
        return res.status(400).json({
          message: "Subscriptions and one-time items must be checked out separately.",
        });
      }

      const mode: "payment" | "subscription" = hasSub ? "subscription" : "payment";

      // Stripe expects subscription items to share interval; enforce it
      if (mode === "subscription") {
        const freqs = new Set(items.map((i) => i.frequency).filter(Boolean));
        if (freqs.size > 1) {
          return res.status(400).json({
            message: "Subscription items must share the same billing frequency.",
          });
        }
      }

      const siteUrl = getSiteUrl();
      const cancelModeParam = mode === "subscription" ? "subscription" : "onetime";

      const successUrl = `${siteUrl}/order-success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${siteUrl}/checkout?resume=1&mode=${encodeURIComponent(
        cancelModeParam,
      )}`;

      const line_items = items.map((item) => ({
        price: getPriceId(item),
        quantity: item.quantity,
      }));

      const existingCustomerId = await findStripeCustomerIdByEmail(email);

      const session = await stripe.checkout.sessions.create({
        mode,
        line_items,
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: email,
        ...(existingCustomerId ? { customer: existingCustomerId } : {}),
        shipping_address_collection: { allowed_countries: ["US"] },
        allow_promotion_codes: true,
        metadata: { source: "kimoraco.com", mode, email },
        ...(mode === "subscription"
          ? { subscription_data: { metadata: { email } } }
          : {}),
      });

      return res.json({ url: session.url, id: session.id });
    } catch (err: any) {
      const s = safeErrSummary(err);

      // Stripe errors usually include message and sometimes raw.message
      const stripeMsg =
        safeString(err?.raw?.message, 500) ||
        safeString(err?.message, 500) ||
        safeString(s?.message, 500) ||
        "Checkout failed (unknown error).";

      const code = err?.code || err?.raw?.code || s?.code || undefined;
      const type = err?.type || err?.raw?.type || undefined;

      console.error("POST /api/checkout error:", {
        ...s,
        stripe_code: code,
        stripe_type: type,
      });

      return res.status(500).json({
        message: stripeMsg,
        code,
        type,
      });
    }
  });

  // ---------------- ADMIN: wholesale applications ----------------

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
      return res
        .status(500)
        .json({ ok: false, message: "Failed to update status." });
    }
  });

  // ---------------- WHOLESALE APPLY ----------------

  app.post("/api/wholesale/apply", async (req, res) => {
    try {
      const body = req.body ?? {};

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

      const interestedIn = body.interestedIn ?? {};
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

      // Email notifications
      const resendKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "";
      const notifyTo = process.env.WHOLESALE_NOTIFY_TO || "alex@kimoraco.com";
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
          `Business type: ${businessType}${businessType === "other" ? ` (${businessTypeOther})` : ""}\n` +
          `Member count: ${memberCount}\n` +
          `Retail setup: ${retailSetup || "(not provided)"}\n` +
          `Interested: onShelf=${interestedOnShelf}, coachAffiliate=${interestedCoachAffiliate}, eventSponsorship=${interestedEventSponsorship}\n\n` +
          `Notes:\n${notes || "(none)"}\n\n` +
          `Wholesale page: ${siteUrl}/wholesale\n`;

        const internalHtml = `<div style="font-family: ui-sans-serif, system-ui; line-height:1.5; color:#111;">
  <h2 style="margin:0 0 10px;">New wholesale application</h2>
  <div style="margin:0 0 8px;"><b>Application ID:</b> ${escapeHtml(safeString(applicationId ?? "(unknown)"))}</div>
  <div style="margin:0 0 8px;"><b>Business:</b> ${escapeHtml(safeString(businessName))}</div>
  <div style="margin:0 0 8px;"><b>Contact:</b> ${escapeHtml(safeString(contactName))}</div>
  <div style="margin:0 0 8px;"><b>Email:</b> ${escapeHtml(safeString(email))}</div>
  <div style="margin:0 0 8px;"><b>Phone:</b> ${escapeHtml(safeString(phoneDigits))}</div>
  <div style="margin:0 0 8px;"><b>Website/IG:</b> ${escapeHtml(safeString(websiteOrInstagram || "(not provided)"))}</div>
  <div style="margin:0 0 8px;"><b>City/State:</b> ${escapeHtml(safeString(city))}, ${escapeHtml(safeString(state))}</div>
  <div style="margin:0 0 8px;"><b>Business type:</b> ${escapeHtml(safeString(businessType))}${
          businessType === "other" && businessTypeOther
            ? ` (${escapeHtml(safeString(businessTypeOther))})`
            : ""
        }</div>
  <div style="margin:0 0 8px;"><b>Member count:</b> ${escapeHtml(safeString(memberCount))}</div>
  <div style="margin:0 0 8px;"><b>Retail setup:</b> ${escapeHtml(safeString(retailSetup || "(not provided)"))}</div>
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
    Thanks${contactName ? `, ${escapeHtml(safeString(contactName))}` : ""}! We received your wholesale application for <b>${escapeHtml(
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
          });
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
          });
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
          message: "Please check required fields (phone + member count) and try again.",
        });
      }

      return res
        .status(500)
        .json({ ok: false, message: "Failed to submit wholesale application." });
    }
  });

  // ---------------- CHECKOUT SESSION LOOKUP (ORDER SUCCESS) ----------------

  app.get("/api/checkout/session", async (req, res) => {
    try {
      const sessionId = String(req.query?.session_id ?? "").trim();
      if (!sessionId) {
        return res.status(400).json({ message: "session_id is required" });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);

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

  // ---------------- STRIPE WEBHOOK ----------------

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
        const stripeCustomerId = await getStripeCustomerIdFromCheckoutSession(
          session,
        );

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
        sessionSecret,
      );

      const portalLink = `${siteUrl}/manage-subscription?token=${encodeURIComponent(
        token,
      )}`;
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
        const from = fromEmail.includes("<") ? fromEmail : `Kimora Co <${fromEmail}>`;
        await resend.emails.send({ from, to: email, subject, text, html });
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

  return httpServer;
}
