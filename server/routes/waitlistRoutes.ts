import type { Express } from "express";
import { db } from "../db";
import { waitlistEmails } from "../../shared/schema";
import { eq } from "drizzle-orm";

export function registerWaitlistRoutes(app: Express) {
  app.post("/api/waitlist", async (req, res) => {
    try {
      const emailRaw = String(req.body?.email || "").trim().toLowerCase();

      if (!emailRaw || !emailRaw.includes("@")) {
        return res.status(400).json({ ok: false, message: "Invalid email" });
      }

      // Check if already exists
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

      return res.json({ ok: true });
    } catch (err) {
      console.error("Waitlist error:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });
}