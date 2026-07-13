// server/routes/emailCaptureRoutes.ts
import type { Express } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { waitlistEmails } from "../../shared/schema";
import { publicEmailLimiter } from "../rateLimit";

function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function registerEmailCaptureRoutes(app: Express) {
  // Rate limited — same email-flood reasoning as /api/waitlist.
  app.post("/api/email-capture", publicEmailLimiter, async (req, res) => {
    try {
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
        // Already captured — still send the code so they can use it
        return res.json({ ok: true, alreadyExists: true });
      }

      await db.insert(waitlistEmails).values({
        email: emailRaw,
        source: "marketing-capture",
        metadata: {
          ip: req.ip,
          userAgent: req.headers["user-agent"] || null,
          referer: req.headers.referer || null,
        },
      });

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
