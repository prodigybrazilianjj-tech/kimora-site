// server/routes/emailCaptureRoutes.ts
import type { Express } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { waitlistEmails } from "../../shared/schema";
import { publicEmailLimiter } from "../rateLimit";
import { guardPublicEmailSubmission, takeSendSlot } from "../botGuard";

function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function registerEmailCaptureRoutes(app: Express) {
  // Rate limited per IP, and additionally screened by botGuard — see the
  // comment block at the top of server/botGuard.ts for why per-IP alone was
  // not enough (Aug 2026: 388 bot signups, 388 outbound emails).
  app.post("/api/email-capture", publicEmailLimiter, async (req, res) => {
    try {
      const verdict = await guardPublicEmailSubmission(req);

      if (!verdict.ok) {
        console.warn(`[email-capture] blocked: ${verdict.reason}`);

        if (verdict.silent) {
          // Look identical to success. Do not teach the script what tripped.
          return res.json({ ok: true });
        }

        return res
          .status(verdict.status)
          .json({ ok: false, message: verdict.message });
      }

      const emailRaw = normalizeEmail(req.body?.email);

      if (!isValidEmail(emailRaw)) {
        return res.status(400).json({ ok: false, message: "Invalid email" });
      }

      const existing = await db
        .select()
        .from(waitlistEmails)
        .where(eq(waitlistEmails.email, emailRaw))
        .limit(1);

      if (existing.length > 0) {
        // Already captured — still report success so they can use the code.
        return res.json({ ok: true, alreadyExists: true });
      }

      // A NEW address is about to cost us an outbound send. Ask the breaker.
      // If the hour's ceiling is spent we still keep the address (a real
      // signup lost is worse than an email sent late) but park it as
      // quarantined and send nothing.
      const maySend = takeSendSlot();

      await db.insert(waitlistEmails).values({
        email: emailRaw,
        source: "marketing-capture",
        status: maySend ? "active" : "quarantined",
        metadata: {
          ip: req.ip,
          userAgent: req.headers["user-agent"] || null,
          referer: req.headers.referer || null,
        },
      });

      if (!maySend) {
        // Deliberately still 200: a human caught in an overflow hour sees the
        // discount code on the page regardless. Only the email is suppressed.
        return res.json({ ok: true });
      }

      const resendKey = String(process.env.RESEND_API_KEY || "").trim();
      const fromEmail = String(process.env.RESEND_FROM_EMAIL || "").trim();
      const discountCode = String(process.env.MARKETING_DISCOUNT_CODE || "MAT15").trim();

      if (resendKey && fromEmail) {
        try {
          const { sendMarketingWelcomeEmail } = await import("../services/emailService");
          await sendMarketingWelcomeEmail({ email: emailRaw, discountCode });
        } catch (emailErr) {
          console.error("[email-capture] welcome email error:", emailErr);
        }
      }

      return res.json({ ok: true });
    } catch (err) {
      console.error("[email-capture] error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });
}
