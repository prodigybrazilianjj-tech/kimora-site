// server/routes/wholesaleRoutes.ts
import type { Express } from "express";
import { eq, desc } from "drizzle-orm";
import { Resend } from "resend";

import { db } from "../db";
import { wholesaleApplications, wholesaleOrders } from "../../shared/schema";
import { stripe } from "../stripe";
import {
  generateReorderToken,
  validateReorderToken,
  inferUnitPrice,
} from "../services/wholesaleTokenService";
import { consumeWholesaleInventory } from "../services/inventoryService";
import {
  getActiveResaleCertForEmail,
  getResaleCertFileById,
  listResaleCerts,
  upsertResaleCert,
  verifyResaleCert,
  setResaleCertStatus,
} from "../services/resaleCertService";

// Allowed upload types + size cap for an attached resale-cert image/PDF.
const ALLOWED_CERT_FILE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);
// ~6MB of binary → ~8M base64 chars. Body limit (server/index.ts) is 10mb to cover this.
const MAX_CERT_FILE_B64_LEN = 8_400_000;

function certTypeLabel(certType: string | null | undefined): string {
  switch (String(certType || "")) {
    case "az_5000a": return "AZ Form 5000A";
    case "mtc": return "Multistate (MTC) resale cert";
    case "state": return "State resale cert";
    default: return "Resale cert";
  }
}

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

// Access gate for the resale-cert tool ONLY. Accepts either the full
// ADMIN_DASHBOARD_TOKEN or a separate, shorter CERT_TOOL_PASSWORD. This password
// is scoped to the cert endpoints below — it does NOT unlock the other admin tools
// (applications/orders), which stay on requireAdmin.
function requireCertAccess(req: any, res: any) {
  const adminToken = String(process.env.ADMIN_DASHBOARD_TOKEN ?? "").trim();
  const certPassword = String(process.env.CERT_TOOL_PASSWORD ?? "").trim();

  if (!adminToken && !certPassword) {
    return res.status(500).json({
      ok: false,
      message: "No cert-tool credential is configured (set CERT_TOOL_PASSWORD or ADMIN_DASHBOARD_TOKEN).",
    });
  }

  const got = adminTokenFromReq(req);
  const ok =
    !!got &&
    ((adminToken && got === adminToken) || (certPassword && got === certPassword));
  if (!ok) {
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

  // ── Admin: list wholesale orders ─────────────────────────────────────────
  app.get("/api/admin/wholesale-orders", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;
    try {
      const rows = await db
        .select()
        .from(wholesaleOrders)
        .orderBy(desc(wholesaleOrders.createdAt))
        .limit(500);
      return res.json({ ok: true, rows });
    } catch (err: any) {
      console.error("GET /api/admin/wholesale-orders error:", safeErrSummary(err));
      return res.status(500).json({ ok: false, message: "Failed to load wholesale orders." });
    }
  });

  // ── Admin: mark order fulfilled ───────────────────────────────────────────
  app.patch("/api/admin/wholesale-orders/:id/fulfill", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;
    try {
      const id = String(req.params.id || "").trim();
      if (!id) return res.status(400).json({ ok: false, message: "Missing id." });

      // Read current state first so we only draw down inventory on the actual
      // paid -> fulfilled transition (not on a repeat call to an already-fulfilled order).
      const existing = await db
        .select({
          id: wholesaleOrders.id,
          status: wholesaleOrders.status,
          lineItems: wholesaleOrders.lineItems,
        })
        .from(wholesaleOrders)
        .where(eq(wholesaleOrders.id, id))
        .limit(1);

      if (!existing?.length) return res.status(404).json({ ok: false, message: "Not found." });
      const prevStatus = existing[0].status;

      const updated = await db
        .update(wholesaleOrders)
        .set({ status: "fulfilled", fulfilledAt: new Date(), updatedAt: new Date() })
        .where(eq(wholesaleOrders.id, id))
        .returning({ id: wholesaleOrders.id });

      if (!updated?.length) return res.status(404).json({ ok: false, message: "Not found." });

      // Consume physical stock once, only when transitioning into fulfilled.
      if (prevStatus !== "fulfilled") {
        const items = Array.isArray(existing[0].lineItems) ? existing[0].lineItems : [];
        for (const li of items) {
          await consumeWholesaleInventory({
            wholesaleOrderId: id,
            flavor: li.name, // Kimora flavor == product name
            quantity: Number(li.qty) || 0,
          });
        }
      }

      return res.json({ ok: true });
    } catch (err: any) {
      console.error("PATCH /api/admin/wholesale-orders/:id/fulfill error:", safeErrSummary(err));
      return res.status(500).json({ ok: false, message: "Failed to update order." });
    }
  });

  // ── Admin: resale certificates ────────────────────────────────────────────
  app.get("/api/admin/resale-certs", async (req, res) => {
    const denied = requireCertAccess(req, res);
    if (denied) return;
    try {
      const rows = await listResaleCerts();
      return res.json({ ok: true, rows });
    } catch (err: any) {
      console.error("GET /api/admin/resale-certs error:", safeErrSummary(err));
      return res.status(500).json({ ok: false, message: "Failed to load resale certificates." });
    }
  });

  app.post("/api/admin/resale-certs", async (req, res) => {
    const denied = requireCertAccess(req, res);
    if (denied) return;
    try {
      const b: any = req.body ?? {};
      const email = normalizeEmail(String(b.email ?? ""));
      const businessName = safeString(b.businessName, 300);
      if (!email || !isValidEmail(email)) return res.status(400).json({ ok: false, message: "Valid email required." });
      if (!businessName) return res.status(400).json({ ok: false, message: "Business name required." });

      const parseDate = (v: any) => {
        const s = String(v ?? "").trim();
        if (!s) return null;
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
      };

      // Optional uploaded cert file (base64). Validate type + size before storing.
      const removeFile = Boolean(b.removeFile);
      let fileData: string | null = null;
      let fileMime: string | null = null;
      let fileName: string | null = null;
      if (!removeFile && typeof b.fileData === "string" && b.fileData.length > 0) {
        // Accept either a raw base64 string or a data URL; normalize to raw base64.
        let raw = String(b.fileData);
        const m = raw.match(/^data:([^;]+);base64,(.*)$/s);
        if (m) {
          fileMime = m[1];
          raw = m[2];
        }
        if (typeof b.fileMime === "string" && b.fileMime) fileMime = String(b.fileMime);
        if (!fileMime || !ALLOWED_CERT_FILE_MIMES.has(fileMime)) {
          return res.status(400).json({ ok: false, message: "Unsupported file type. Use JPG, PNG, WebP, GIF, or PDF." });
        }
        if (raw.length > MAX_CERT_FILE_B64_LEN) {
          return res.status(400).json({ ok: false, message: "File too large. Max ~6MB — try a smaller photo or paste a Drive link instead." });
        }
        fileData = raw;
        fileName = safeString(b.fileName, 300) || "cert";
      }

      const cert = await upsertResaleCert({
        id: b.id || null,
        email,
        businessName,
        stripeCustomerId: safeString(b.stripeCustomerId, 100) || null,
        certType: safeString(b.certType, 32) || "az_5000a",
        licenseNumber: safeString(b.licenseNumber, 100) || null,
        issuingState: safeString(b.issuingState, 8) || "AZ",
        resaleDescription: safeString(b.resaleDescription, 500) || null,
        signed: Boolean(b.signed),
        fileUrl: safeString(b.fileUrl, 2000) || null,
        receivedAt: parseDate(b.receivedAt),
        expiresAt: parseDate(b.expiresAt),
        notes: safeString(b.notes, 2000) || null,
        fileData,
        fileMime,
        fileName,
        removeFile,
      });
      // Don't echo the (large) base64 blob back to the client.
      const { fileData: _omit, ...certLite } = (cert as any) ?? {};
      return res.json({ ok: true, cert: certLite });
    } catch (err: any) {
      console.error("POST /api/admin/resale-certs error:", safeErrSummary(err));
      return res.status(500).json({ ok: false, message: "Failed to save resale certificate." });
    }
  });

  app.post("/api/admin/resale-certs/:id/verify", async (req, res) => {
    const denied = requireCertAccess(req, res);
    if (denied) return;
    try {
      const id = String(req.params.id || "").trim();
      if (!id) return res.status(400).json({ ok: false, message: "Missing id." });
      const verifiedBy = safeString(req.body?.verifiedBy, 200) || "admin";
      const verificationResult = safeString(req.body?.verificationResult, 500) || "verified via license lookup";
      const cert = await verifyResaleCert(id, verifiedBy, verificationResult);
      if (!cert) return res.status(404).json({ ok: false, message: "Not found." });
      return res.json({ ok: true, cert });
    } catch (err: any) {
      console.error("POST /api/admin/resale-certs/:id/verify error:", safeErrSummary(err));
      return res.status(500).json({ ok: false, message: "Failed to verify certificate." });
    }
  });

  app.post("/api/admin/resale-certs/:id/status", async (req, res) => {
    const denied = requireCertAccess(req, res);
    if (denied) return;
    try {
      const id = String(req.params.id || "").trim();
      const status = String(req.body?.status || "").trim();
      if (!id) return res.status(400).json({ ok: false, message: "Missing id." });
      if (status !== "active" && status !== "revoked") return res.status(400).json({ ok: false, message: "Invalid status." });
      const cert = await setResaleCertStatus(id, status as "active" | "revoked");
      if (!cert) return res.status(404).json({ ok: false, message: "Not found." });
      return res.json({ ok: true, cert });
    } catch (err: any) {
      console.error("POST /api/admin/resale-certs/:id/status error:", safeErrSummary(err));
      return res.status(500).json({ ok: false, message: "Failed to update certificate." });
    }
  });

  // Serve the uploaded cert file (admin-only). The admin page fetches this with the
  // x-admin-token header and opens the result as a blob, so the token stays off the URL.
  app.get("/api/admin/resale-certs/:id/file", async (req, res) => {
    const denied = requireCertAccess(req, res);
    if (denied) return;
    try {
      const id = String(req.params.id || "").trim();
      if (!id) return res.status(400).json({ ok: false, message: "Missing id." });
      const file = await getResaleCertFileById(id);
      if (!file) return res.status(404).json({ ok: false, message: "No file on file for this certificate." });

      const buf = Buffer.from(file.fileData, "base64");
      const mime = file.fileMime || "application/octet-stream";
      const safeName = (file.fileName || "cert").replace(/[^\w.\-]+/g, "_");
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
      res.setHeader("Cache-Control", "private, no-store");
      return res.send(buf);
    } catch (err: any) {
      console.error("GET /api/admin/resale-certs/:id/file error:", safeErrSummary(err));
      return res.status(500).json({ ok: false, message: "Failed to load certificate file." });
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

        // In-person rep orders (kimora-wholesale.html) are already approved and get an
        // invoice immediately, so they receive a "welcome / you're approved" email.
        // Online applicants (public form) get the "we'll review" email instead.
        const isOnSpot = String((req.body as any)?.source ?? "").toLowerCase() === "rep-onspot";

        const applicantSubject = isOnSpot
          ? "Welcome to Kimora Co. wholesale — you're all set"
          : "Kimora Co — wholesale application received";
        const applicantText = isOnSpot
          ? `Welcome to Kimora Co. wholesale.\n\n` +
            `${businessName} is set up as a wholesale account — your invoice for today's order is on its way.\n\n` +
            `Pay it by card or Apple Pay. After payment you'll get a personal reorder link to restock anytime.\n\n` +
            `Questions? Reply to this email or contact support@kimoraco.com.\n`
          : `Thanks for applying to Kimora Co wholesale.\n\n` +
            `We received your application for ${businessName} and will review it shortly.\n\n` +
            `If you need to add anything, reply to this email or contact support@kimoraco.com.\n`;

        try {
          const { render } = await import("@react-email/render");
          const React = await import("react");
          const wsiteUrl = process.env.PUBLIC_SITE_URL || "https://kimoraco.com";
          const wsupportEmail = String(process.env.SUPPORT_EMAIL || "support@kimoraco.com").trim();

          const EmailComponent = isOnSpot
            ? (await import("../emails/WholesaleWelcomeEmail")).WholesaleWelcomeEmail
            : (await import("../emails/WholesaleApplicantEmail")).WholesaleApplicantEmail;

          const applicantHtml = await render(
            React.createElement(EmailComponent as any, {
              siteUrl: wsiteUrl,
              supportEmail: wsupportEmail,
              businessName: safeString(businessName),
              contactName: safeString(contactName),
            })
          );
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

  // ── Stripe Invoice ────────────────────────────────────────────────────────
  app.post("/api/wholesale/invoice", async (req, res) => {
    try {
      const body: any = req.body ?? {};

      const email = normalizeEmail(String(body.email ?? ""));
      const contactName = safeString(body.contactName, 300);
      const businessName = safeString(body.businessName, 300);
      const tier = safeString(body.tier, 100) || "Wholesale";
      const paymentTerms = safeString(body.paymentTerms, 64) || "Net 30";
      const invoiceNumber = safeString(body.invoiceNumber, 100);
      const notes = safeString(body.notes, 2000);

      type LineItem = { name: string; flavor?: string; qty: number; unitPrice: number; total: number };
      const lineItems: LineItem[] = Array.isArray(body.lineItems)
        ? (body.lineItems as LineItem[]).filter((l) => Number(l.qty) > 0)
        : [];

      const requestedTaxRate = Math.max(0, parseFloat(String(body.taxRate ?? 0)) || 0);
      const subtotal = lineItems.reduce((s, l) => s + Number(l.unitPrice) * Number(l.qty), 0);

      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ ok: false, message: "Valid email is required." });
      }
      if (!lineItems.length) {
        return res.status(400).json({ ok: false, message: "Order must have at least one line item with quantity > 0." });
      }

      // Map payment terms → Stripe days_until_due
      const daysMap: Record<string, number> = {
        "Due on Receipt": 0,
        "Net 15": 15,
        "Net 30": 30,
        "50% Deposit": 7,
      };
      const daysUntilDue = daysMap[paymentTerms] ?? 30;

      // Find or create Stripe customer by email
      const existing = await stripe.customers.list({ email, limit: 1 });
      let customer = existing.data[0];
      if (!customer) {
        customer = await stripe.customers.create({
          email,
          name: contactName || businessName,
          metadata: { businessName, source: "kimora-wholesale" },
        });
      } else if (!customer.name) {
        await stripe.customers.update(customer.id, { name: contactName || businessName });
      }

      // ── Resale-exemption gate ────────────────────────────────────────────
      // A $0 resale-exempt invoice is allowed ONLY when a verified, unexpired,
      // covering cert is on file for this account. Otherwise no exemption claimed.
      const cert = await getActiveResaleCertForEmail(email, safeString(body.shipToState, 8) || undefined);
      let taxStatus: string;
      let resaleCertId: string | null = null;
      let exemptionNote = "";
      let effectiveTaxRate = requestedTaxRate;

      if (cert) {
        taxStatus = "exempt_resale";
        resaleCertId = cert.id;
        effectiveTaxRate = 0;
        exemptionNote =
          `Resale exempt — ${certTypeLabel(cert.certType)}` +
          (cert.licenseNumber ? ` #${cert.licenseNumber}` : "") +
          (cert.receivedAt ? ` on file ${new Date(cert.receivedAt as any).toLocaleDateString("en-US")}` : "");
        try { await stripe.customers.update(customer.id, { tax_exempt: "exempt" } as any); } catch {}
      } else {
        taxStatus = requestedTaxRate > 0 ? "taxed" : "no_cert";
        try { await stripe.customers.update(customer.id, { tax_exempt: "none" } as any); } catch {}
      }

      // When Stripe Tax is enabled (you toggle it in the dashboard) and there's no
      // exemption, let Stripe compute the correct rate instead of a manual line.
      const stripeTaxAuto = process.env.STRIPE_TAX_ENABLED === "true" && !cert;
      const taxAmount = subtotal * (effectiveTaxRate / 100);

      // Build footer memo
      const footerParts: string[] = [];
      if (invoiceNumber) footerParts.push(`Ref: ${invoiceNumber}`);
      if (paymentTerms === "50% Deposit") footerParts.push("50% deposit due within 7 days. Remainder due before shipment.");
      if (exemptionNote) footerParts.push(exemptionNote);
      if (notes) footerParts.push(notes.slice(0, 300));
      footerParts.push("Pricing is confidential — not for resale display. Questions? support@kimoraco.com");

      // Create draft invoice
      const invoice = await stripe.invoices.create({
        customer: customer.id,
        collection_method: "send_invoice",
        days_until_due: daysUntilDue,
        description: `Kimora Co. Wholesale — ${tier} — ${businessName}`,
        footer: footerParts.join(" | "),
        ...(stripeTaxAuto ? { automatic_tax: { enabled: true } } : {}),
        metadata: {
          businessName,
          tier,
          paymentTerms,
          invoiceRef: invoiceNumber || "",
          source: "kimora-wholesale-sheet",
          unitPrice: String(lineItems[0]?.unitPrice ?? inferUnitPrice(tier)),
          taxStatus,
          resaleCertId: resaleCertId || "",
          // Accounting channel tag for the QuickBooks connector → Wholesale Revenue.
          kimora_channel: "wholesale",
        },
      } as any);

      // Attach line items
      for (const item of lineItems) {
        const qty = Math.max(1, Math.round(Number(item.qty)));
        const unitCents = Math.round(Number(item.unitPrice) * 100);
        const description = [
          item.name || "Kimora Co. Product",
          item.flavor ? `— ${item.flavor}` : "",
          `(${tier})`,
        ].filter(Boolean).join(" ");

        await stripe.invoiceItems.create({
          customer: customer.id,
          invoice: invoice.id,
          description,
          quantity: qty,
          // clover API dropped top-level `unit_amount`; `unit_amount_decimal`
          // is multiplied by `quantity` for the same per-unit line semantics.
          unit_amount_decimal: String(unitCents),
          currency: "usd",
        });
      }

      // Add a manual tax line only when Stripe Tax isn't doing it and we're not exempt.
      if (!stripeTaxAuto && taxAmount > 0.005) {
        await stripe.invoiceItems.create({
          customer: customer.id,
          invoice: invoice.id,
          description: `Sales Tax (${effectiveTaxRate}%)`,
          amount: Math.round(taxAmount * 100),
          currency: "usd",
        });
      }

      // Finalize then send
      const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
      const sent = await stripe.invoices.sendInvoice(finalized.id);

      // Log order to DB — on-the-spot fulfillment marks it fulfilled immediately
      const fulfilledOnSpot = Boolean(body.fulfilledOnSpot);
      try {
        await db.insert(wholesaleOrders).values({
          stripeInvoiceId:     sent.id,
          stripeInvoiceNumber: sent.number ?? null,
          stripeCustomerId:    customer.id,
          invoiceUrl:          sent.hosted_invoice_url ?? null,
          businessName,
          email,
          tier,
          amountPaid:   sent.amount_due ?? null,
          currency:     sent.currency ?? "usd",
          paymentTerms,
          invoiceRef:   invoiceNumber || null,
          notes:        notes || null,
          lineItems:    lineItems.map((l) => ({ name: l.name, flavor: l.flavor || undefined, qty: Math.max(1, Math.round(Number(l.qty))) })),
          taxStatus:    taxStatus,
          resaleCertId: resaleCertId,
          status:       fulfilledOnSpot ? "fulfilled" : "pending",
          fulfilledAt:  fulfilledOnSpot ? new Date() : null,
          isReorder:    false,
          source:       "wholesale-sheet",
        }).onConflictDoNothing({ target: wholesaleOrders.stripeInvoiceId });
      } catch (dbErr: any) {
        console.error("[wholesale/invoice] DB log failed:", safeErrSummary(dbErr));
      }

      return res.json({
        ok: true,
        invoiceId: sent.id,
        invoiceNumber: sent.number,
        invoiceUrl: sent.hosted_invoice_url,
        total: (sent.amount_due / 100).toFixed(2),
      });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("POST /api/wholesale/invoice error:", s);
      return res.status(500).json({ ok: false, message: `Stripe invoice failed: ${s.message}` });
    }
  });

  // ── Reorder: validate magic link token ───────────────────────────────────
  app.get("/api/wholesale/reorder/validate", (req, res) => {
    const token = String(req.query.token ?? "").trim();
    if (!token) return res.status(400).json({ ok: false, message: "Missing token." });

    const result = validateReorderToken(token);
    if (!result.valid) {
      return res.status(401).json({ ok: false, message: result.reason });
    }
    return res.json({ ok: true, ...result.payload });
  });

  // ── Reorder: submit re-order and fire Stripe invoice ─────────────────────
  app.post("/api/wholesale/reorder", async (req, res) => {
    try {
      const body: any = req.body ?? {};
      const token = String(body.token ?? "").trim();

      if (!token) return res.status(400).json({ ok: false, message: "Missing token." });

      const result = validateReorderToken(token);
      if (!result.valid) {
        return res.status(401).json({ ok: false, message: result.reason });
      }

      const { email, businessName, tier, unitPrice, stripeCustomerId } = result.payload;

      type LineItem = { name: string; flavor?: string; qty: number };
      const lineItems: LineItem[] = Array.isArray(body.lineItems)
        ? (body.lineItems as LineItem[]).filter((l) => Number(l.qty) > 0)
        : [];

      if (!lineItems.length) {
        return res.status(400).json({ ok: false, message: "Add at least one product with quantity > 0." });
      }

      // Tax is decided by the resale-cert record on file (source of truth), not the
      // token or the client. The token's taxRate is only a fallback when no cert.
      const tokenTaxRate = Math.max(0, Number(result.payload.taxRate) || 0);
      const subtotal = lineItems.reduce((s, l) => s + Number(l.qty) * unitPrice, 0);
      const notes = safeString(body.notes, 2000);

      const daysMap: Record<string, number> = {
        "Due on Receipt": 0, "Net 15": 15, "Net 30": 30, "50% Deposit": 7,
      };
      const paymentTerms = safeString(result.payload.paymentTerms, 64) || "Net 30";
      const daysUntilDue = daysMap[paymentTerms] ?? 30;

      // Use existing customer or re-look up by email
      let customerId = stripeCustomerId;
      if (!customerId) {
        const existing = await stripe.customers.list({ email, limit: 1 });
        customerId = existing.data[0]?.id ?? (await stripe.customers.create({ email, name: businessName, metadata: { businessName, source: "kimora-wholesale" } })).id;
      }

      // ── Resale-exemption gate (same rule as the rep invoice tool) ─────────
      const cert = await getActiveResaleCertForEmail(email);
      let taxStatus: string;
      let resaleCertId: string | null = null;
      let exemptionNote = "";
      let effectiveTaxRate = tokenTaxRate;
      if (cert) {
        taxStatus = "exempt_resale";
        resaleCertId = cert.id;
        effectiveTaxRate = 0;
        exemptionNote =
          `Resale exempt — ${certTypeLabel(cert.certType)}` +
          (cert.licenseNumber ? ` #${cert.licenseNumber}` : "") +
          (cert.receivedAt ? ` on file ${new Date(cert.receivedAt as any).toLocaleDateString("en-US")}` : "");
        try { await stripe.customers.update(customerId, { tax_exempt: "exempt" } as any); } catch {}
      } else {
        // No verified cert for a self-serve reorder → do not claim exemption.
        taxStatus = "no_cert";
        try { await stripe.customers.update(customerId, { tax_exempt: "none" } as any); } catch {}
      }
      const stripeTaxAuto = process.env.STRIPE_TAX_ENABLED === "true" && !cert;
      const taxAmount = subtotal * (effectiveTaxRate / 100);

      const invoice = await stripe.invoices.create({
        customer: customerId,
        collection_method: "send_invoice",
        days_until_due: daysUntilDue,
        description: `Kimora Co. Wholesale Reorder — ${tier} — ${businessName}`,
        footer: ["Reorder", exemptionNote, notes ? notes.slice(0, 300) : "", "Pricing confidential. Questions? support@kimoraco.com"].filter(Boolean).join(" | "),
        ...(stripeTaxAuto ? { automatic_tax: { enabled: true } } : {}),
        metadata: {
          businessName, tier, paymentTerms,
          source: "kimora-wholesale-sheet",
          unitPrice: String(unitPrice),
          reorder: "true",
          taxStatus,
          resaleCertId: resaleCertId || "",
          // Accounting channel tag for the QuickBooks connector → Wholesale Revenue.
          kimora_channel: "wholesale",
        },
      } as any);

      for (const item of lineItems) {
        const qty = Math.max(1, Math.round(Number(item.qty)));
        const desc = [item.name || "Kimora Co. Product", item.flavor ? `— ${item.flavor}` : "", `(${tier})`].filter(Boolean).join(" ");
        await stripe.invoiceItems.create({
          customer: customerId, invoice: invoice.id,
          description: desc, quantity: qty,
          // clover API dropped top-level `unit_amount`; `unit_amount_decimal`
          // is multiplied by `quantity` for the same per-unit line semantics.
          unit_amount_decimal: String(Math.round(unitPrice * 100)), currency: "usd",
        });
      }

      if (!stripeTaxAuto && taxAmount > 0.005) {
        await stripe.invoiceItems.create({
          customer: customerId, invoice: invoice.id,
          description: `Sales Tax (${effectiveTaxRate}%)`,
          amount: Math.round(taxAmount * 100), currency: "usd",
        });
      }

      const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
      const sent = await stripe.invoices.sendInvoice(finalized.id);

      // Log reorder to DB
      try {
        await db.insert(wholesaleOrders).values({
          stripeInvoiceId:     sent.id,
          stripeInvoiceNumber: sent.number ?? null,
          stripeCustomerId:    customerId,
          invoiceUrl:          sent.hosted_invoice_url ?? null,
          businessName,
          email,
          tier,
          amountPaid:   sent.amount_due ?? null,
          currency:     sent.currency ?? "usd",
          paymentTerms,
          invoiceRef:   String(body.invoiceNumber || "") || null,
          notes:        notes || null,
          lineItems:    lineItems.map((l) => ({ name: l.name, flavor: l.flavor || undefined, qty: Math.max(1, Math.round(Number(l.qty))) })),
          taxStatus:    taxStatus,
          resaleCertId: resaleCertId,
          status:       "pending",
          fulfilledAt:  null,
          isReorder:    true,
          source:       "reorder",
        }).onConflictDoNothing({ target: wholesaleOrders.stripeInvoiceId });
      } catch (dbErr: any) {
        console.error("[wholesale/reorder] DB log failed:", safeErrSummary(dbErr));
      }

      return res.json({
        ok: true,
        invoiceId: sent.id,
        invoiceNumber: sent.number,
        invoiceUrl: sent.hosted_invoice_url,
        total: ((sent.amount_due ?? 0) / 100).toFixed(2),
      });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("POST /api/wholesale/reorder error:", s);
      return res.status(500).json({ ok: false, message: `Reorder failed: ${s.message}` });
    }
  });
}
