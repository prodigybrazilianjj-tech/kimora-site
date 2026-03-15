// server/routes/wholesaleRoutes.ts
import type { Express } from "express";
import { eq, desc } from "drizzle-orm";
import { Resend } from "resend";

import { db } from "../db";
import { wholesaleApplications } from "../../shared/schema";

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

function onlyDigits(s: string) {
  return s.replace(/[^\d]/g, "");
}

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

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

export function registerWholesaleRoutes(app: Express) {
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
      return res.status(500).json({ ok: false, message: "Failed to load applications." });
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
      return res.status(500).json({ ok: false, message: "Failed to update status." });
    }
  });

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
        (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
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
      const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "";
      const notifyTo = process.env.WHOLESALE_NOTIFY_TO || "support@kimoraco.com";
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
    safeString(applicationId ?? "(unknown)")
  )}</div>
  <div style="margin:0 0 8px;"><b>Business:</b> ${escapeHtml(safeString(businessName))}</div>
  <div style="margin:0 0 8px;"><b>Contact:</b> ${escapeHtml(safeString(contactName))}</div>
  <div style="margin:0 0 8px;"><b>Email:</b> ${escapeHtml(safeString(email))}</div>
  <div style="margin:0 0 8px;"><b>Phone:</b> ${escapeHtml(safeString(phoneDigits))}</div>
  <div style="margin:0 0 8px;"><b>Website/IG:</b> ${escapeHtml(
    safeString(websiteOrInstagram || "(not provided)")
  )}</div>
  <div style="margin:0 0 8px;"><b>City/State:</b> ${escapeHtml(
    safeString(city)
  )}, ${escapeHtml(safeString(state))}</div>
  <div style="margin:0 0 8px;"><b>Business type:</b> ${escapeHtml(
    safeString(businessType)
  )}${
          businessType === "other" && businessTypeOther
            ? ` (${escapeHtml(safeString(businessTypeOther))})`
            : ""
        }</div>
  <div style="margin:0 0 8px;"><b>Member count:</b> ${escapeHtml(safeString(memberCount))}</div>
  <div style="margin:0 0 8px;"><b>Retail setup:</b> ${escapeHtml(
    safeString(retailSetup || "(not provided)")
  )}</div>
  <div style="margin:0 0 8px;"><b>Interested:</b>
    onShelf=${String(interestedOnShelf)},
    coachAffiliate=${String(interestedCoachAffiliate)},
    eventSponsorship=${String(interestedEventSponsorship)}
  </div>
  <hr style="border:none;border-top:1px solid #eee;margin:14px 0;" />
  <div style="margin:0 0 6px;"><b>Notes</b></div>
  <pre style="white-space:pre-wrap;background:#f7f7f7;padding:12px;border-radius:10px;font-size:12px;">${escapeHtml(
    safeString(notes || "(none)")
  )}</pre>
</div>`;

        const applicantSubject = "Kimora Co — wholesale application received";
        const applicantText =
          `Thanks for applying to Kimora Co wholesale.\n\n` +
          `We received your application for ${businessName} and will review it shortly.\n\n` +
          `If you need to add anything, reply to this email or contact support@kimoraco.com.\n`;

        const applicantHtml = `<div style="font-family: ui-sans-serif, system-ui; line-height:1.5; color:#111;">
  <h2 style="margin:0 0 10px;">Wholesale application received</h2>
  <p style="margin:0 0 12px;">
    Thanks${
      contactName ? `, ${escapeHtml(safeString(contactName))}` : ""
    }! We received your wholesale application for <b>${escapeHtml(
          safeString(businessName)
        )}</b>.
  </p>
  <p style="margin:0 0 12px;">We’ll review it and get back to you shortly.</p>
  <p style="margin:16px 0 0;font-size:12px;color:#666;">
    Need to add something? Reply to this email or contact
    <a href="mailto:support@kimoraco.com">support@kimoraco.com</a>.
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
          "[wholesale] Resend not configured (missing RESEND_API_KEY or RESEND_FROM_EMAIL/EMAIL_FROM). Stored application without emailing."
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
}