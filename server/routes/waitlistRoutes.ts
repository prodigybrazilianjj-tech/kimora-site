import type { Express } from "express";
import { db } from "../db";
import { waitlistEmails } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { publicEmailLimiter } from "../rateLimit";
import { guardPublicEmailSubmission, takeSendSlot } from "../botGuard";

function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function registerWaitlistRoutes(app: Express) {
  // Rate limited: this endpoint triggers an outbound Resend email on every new
  // address, so it's an email-bombing / signup-flood vector without a brake.
  app.post("/api/waitlist", publicEmailLimiter, async (req, res) => {
    try {
      const verdict = await guardPublicEmailSubmission(req);

      if (!verdict.ok) {
        console.warn(`[waitlist] blocked: ${verdict.reason}`);

        if (verdict.silent) {
          // Indistinguishable from success on purpose.
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
        return res.json({ ok: true, alreadyExists: true });
      }

      // New address => one outbound send. Check the global hourly ceiling.
      const maySend = takeSendSlot();

      await db.insert(waitlistEmails).values({
        email: emailRaw,
        source: "coming-soon",
        status: maySend ? "active" : "quarantined",
        metadata: {
          ip: req.ip,
          userAgent: req.headers["user-agent"] || null,
          referer: req.headers.referer || null,
        },
      });

      if (!maySend) {
        return res.json({ ok: true });
      }

      const resendKey = String(process.env.RESEND_API_KEY || "").trim();
      const fromEmail = String(process.env.RESEND_FROM_EMAIL || "").trim();

      if (resendKey && fromEmail) {
        try {
          const { sendWaitlistConfirmationEmail } = await import("../services/emailService");
          await sendWaitlistConfirmationEmail({ email: emailRaw });
        } catch (emailErr) {
          console.error("Waitlist welcome email error:", emailErr);
        }
      }

      return res.json({ ok: true });
    } catch (err) {
      console.error("Waitlist error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });
}