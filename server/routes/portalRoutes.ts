// server/routes/portalRoutes.ts
import type { Express } from "express";
import crypto from "crypto";
import { desc, eq } from "drizzle-orm";
import { Resend } from "resend";

import { stripe } from "../stripe";
import { db } from "../db";
import { orders } from "../../shared/schema";

function safeString(v: any, maxLen = 20000) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeErrSummary(err: any) {
  const message = String(err?.message || "unknown error");
  const code = err?.code || err?.cause?.code || err?.cause?.errno || err?.errno || null;
  const shortMsg = message.length > 180 ? message.slice(0, 180) + "…" : message;
  return { code, message: shortMsg };
}

function getSiteUrl() {
  return (
    process.env.PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === "production" ? "https://kimoraco.com" : "http://localhost:5173")
  );
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

export function registerPortalRoutes(app: Express) {
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
      const supportEmail = String(process.env.SUPPORT_EMAIL || "support@kimoraco.com").trim();

      const subject = "Manage your Kimora subscription";
      const text = `Manage your Kimora subscription\n\nSecure link (expires in 15 minutes):\n${portalLink}\n\nIf your link expired, request a fresh one here:\n${fallbackLink}\n\nNeed help? Reply to this email or contact ${supportEmail}\n`;

      const { render } = await import("@react-email/render");
      const React = await import("react");
      const { PortalLinkEmail } = await import("../emails/PortalLinkEmail");
      const html = await render(
        React.createElement(PortalLinkEmail, {
          siteUrl,
          supportEmail,
          portalUrl: portalLink,
          expiresMinutes: 15,
        })
      );

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
}