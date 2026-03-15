// server/routes/webhookRoutes.ts
import type { Express } from "express";

import { processStripeWebhook } from "../services/stripeWebhookService";

function safeErrSummary(err: any) {
  const message = String(err?.message || "unknown error");
  const code = err?.code || err?.cause?.code || err?.cause?.errno || err?.errno || null;
  const shortMsg = message.length > 180 ? message.slice(0, 180) + "…" : message;
  return { code, message: shortMsg };
}

export function registerWebhookRoutes(app: Express) {
  app.post("/api/stripe/webhook", async (req, res) => {
    try {
      const sig = req.headers["stripe-signature"];

      if (!sig || typeof sig !== "string") {
        return res.status(400).send("Missing Stripe-Signature header");
      }

      const rawBody = (req as any).rawBody as Buffer | undefined;
      if (!rawBody) {
        return res.status(400).send("Missing rawBody for webhook verification");
      }

      const result = await processStripeWebhook(rawBody, sig);
      return res.json(result);
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("Stripe webhook error:", s);

      const statusCode =
        Number(err?.statusCode) ||
        Number(err?.status) ||
        (String(err?.message || "").includes("Missing STRIPE_WEBHOOK_SECRET") ? 500 : 400);

      return res.status(statusCode).send("Webhook Error");
    }
  });
}