import type { Express } from "express";
import { db } from "../db";
import { waitlistEmails } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { Resend } from "resend";

function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function registerWaitlistRoutes(app: Express) {
  app.post("/api/waitlist", async (req, res) => {
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
        return res.json({ ok: true, alreadyExists: true });
      }

      await db.insert(waitlistEmails).values({
        email: emailRaw,
        source: "coming-soon",
        metadata: {
          ip: req.ip,
          userAgent: req.headers["user-agent"] || null,
          referer: req.headers.referer || null,
        },
      });

      const resendKey = String(process.env.RESEND_API_KEY || "").trim();
      const fromEmail = String(process.env.RESEND_FROM_EMAIL || "").trim();

      if (resendKey && fromEmail) {
        try {
          const resend = new Resend(resendKey);

          await resend.emails.send({
            from: fromEmail.includes("<") ? fromEmail : `Kimora Co <${fromEmail}>`,
            to: emailRaw,
            subject: "You're on the Kimora waitlist 🐙",
            html: `
              <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111;">
                <h2 style="margin:0 0 12px;">You're in.</h2>
                <p style="margin:0 0 12px;">
                  You’ve been added to the Kimora Co waitlist.
                </p>
                <p style="margin:0 0 12px;">
                  We’ll let you know as soon as early access opens.
                </p>
                <p style="margin:0 0 12px;">
                  Built for performance. Built for fighters.
                </p>
                <div style="margin-top:20px;font-size:12px;letter-spacing:0.08em;color:#666;text-transform:uppercase;">
                  OUT-TRAIN. OUT-SMART. OUT-LAST.
                </div>
              </div>
            `,
            text:
              "You're in.\n\n" +
              "You’ve been added to the Kimora Co waitlist.\n\n" +
              "We’ll let you know as soon as early access opens.\n\n" +
              "Built for performance. Built for fighters.\n\n" +
              "OUT-TRAIN. OUT-SMART. OUT-LAST.",
          } as any);
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