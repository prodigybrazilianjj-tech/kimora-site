// server/services/pdfService.ts
import { eq, desc } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { db } from "../db";
import { orderItems } from "../../shared/schema";
import { trackingUrlFor } from "./shippingService";

function safeString(v: any, maxLen = 20000) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}

function titleizeSlug(value: string | null | undefined) {
  return String(value || "")
    .split(/[-\s]+/g)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .filter(Boolean)
    .join(" ");
}

function formatMoney(amountCents: number | null | undefined, currency: string | null | undefined) {
  if (amountCents === null || amountCents === undefined) return "";
  const ccy = String(currency || "usd").toUpperCase();
  const dollars = amountCents / 100;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: ccy,
    }).format(dollars);
  } catch {
    return `${ccy} ${dollars.toFixed(2)}`;
  }
}

function normalizeFulfillment(v: any) {
  const allowed = new Set([
    "unfulfilled",
    "allocated",
    "packed",
    "shipped",
    "delivered",
    "canceled",
    "backordered",
  ]);

  const s = String(v || "").trim().toLowerCase();
  return allowed.has(s) ? s : "unfulfilled";
}

export async function mergePdfs(pdfs: Uint8Array[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create();

  for (const bytes of pdfs) {
    const doc = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    for (const p of pages) merged.addPage(p);
  }

  const out = await merged.save();
  return new Uint8Array(out);
}

export async function appendErrorsPage(
  existing: Uint8Array,
  errors: Array<{ orderId: string; message: string }>
) {
  const doc = await PDFDocument.load(existing);
  let page = doc.addPage();
  let { height } = page.getSize();

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  page.drawText(`Label generation errors (${errors.length})`, {
    x: 40,
    y: height - 60,
    size: 18,
    font: fontBold,
  });

  let y = height - 90;
  const lineHeight = 14;

  for (const e of errors) {
    const line = `${e.orderId}: ${e.message}`;
    const maxChars = 110;
    const chunks: string[] = [];

    for (let i = 0; i < line.length; i += maxChars) {
      chunks.push(line.slice(i, i + maxChars));
    }

    for (const c of chunks) {
      if (y < 40) {
        page = doc.addPage();
        ({ height } = page.getSize());
        y = height - 60;
      }

      page.drawText(c, { x: 40, y, size: 10, font });
      y -= lineHeight;
    }
  }

  const out = await doc.save();
  return new Uint8Array(out);
}

export async function buildPackingSlipsPdf(args: {
  orderIds: string[];
  byOrderId: Record<
    string,
    {
      id: string;
      createdAt?: Date | string | null;
      customerEmail?: string | null;
      shippingName?: string | null;
      shippingAddress?: any | null;
      amountTotal?: number | null;
      currency?: string | null;
      shippingCarrier?: string | null;
      shippingTrackingNumber?: string | null;
      isSubscription?: boolean | null;
    }
  >;
}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  for (const orderId of args.orderIds) {
    const order = args.byOrderId[orderId];
    if (!order) continue;

    const items = await db
      .select({
        flavor: orderItems.flavor,
        purchaseType: orderItems.purchaseType,
        frequencyWeeks: orderItems.frequencyWeeks,
        quantity: orderItems.quantity,
        fulfillmentStatus: orderItems.fulfillmentStatus,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .orderBy(desc(orderItems.createdAt))
      .limit(200);

    let page = doc.addPage([612, 792]);
    let y = 750;

    const drawLine = () => {
      page.drawLine({
        start: { x: 40, y },
        end: { x: 572, y },
        thickness: 1,
        color: rgb(0.82, 0.82, 0.82),
      });
      y -= 16;
    };

    page.drawText("Kimora Co. Packing Slip", { x: 40, y, size: 20, font: fontBold });
    y -= 28;

    page.drawText(`Order ID: ${orderId}`, { x: 40, y, size: 11, font: fontBold });
    y -= 16;

    page.drawText(`Created: ${order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}`, {
      x: 40,
      y,
      size: 10,
      font,
    });
    y -= 16;

    page.drawText(`Customer Email: ${safeString(order.customerEmail || "—", 200)}`, {
      x: 40,
      y,
      size: 10,
      font,
    });
    y -= 16;

    page.drawText(`Type: ${order.isSubscription ? "Subscription" : "One-time"}`, {
      x: 40,
      y,
      size: 10,
      font,
    });
    y -= 16;

    page.drawText(
      `Total: ${formatMoney(order.amountTotal ?? null, order.currency ?? "usd") || "—"}`,
      {
        x: 40,
        y,
        size: 10,
        font,
      }
    );
    y -= 12;
    drawLine();

    page.drawText("Ship To", { x: 40, y, size: 12, font: fontBold });
    y -= 16;

    page.drawText(safeString(order.shippingName || "—", 200), { x: 40, y, size: 10, font });
    y -= 14;

    const addrLines = [
      safeString(order.shippingAddress?.line1 || "", 100),
      safeString(order.shippingAddress?.line2 || "", 100),
      [order.shippingAddress?.city, order.shippingAddress?.state, order.shippingAddress?.postal_code]
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .join(", "),
      safeString(order.shippingAddress?.country || "", 20),
    ].filter(Boolean);

    for (const line of addrLines) {
      page.drawText(line, { x: 40, y, size: 10, font });
      y -= 14;
    }

    y -= 4;
    drawLine();

    page.drawText("Items", { x: 40, y, size: 12, font: fontBold });
    y -= 18;

    page.drawText("Product", { x: 40, y, size: 10, font: fontBold });
    page.drawText("Qty", { x: 300, y, size: 10, font: fontBold });
    page.drawText("Type", { x: 350, y, size: 10, font: fontBold });
    page.drawText("Status", { x: 470, y, size: 10, font: fontBold });
    y -= 14;
    drawLine();

    for (const item of items) {
      if (y < 80) {
        page = doc.addPage([612, 792]);
        y = 750;
      }

      const typeLabel =
        item.purchaseType === "subscribe" && item.frequencyWeeks
          ? `Subscription / ${item.frequencyWeeks}w`
          : "One-time";

      page.drawText(titleizeSlug(item.flavor), { x: 40, y, size: 10, font });
      page.drawText(String(item.quantity ?? 1), { x: 300, y, size: 10, font });
      page.drawText(typeLabel, { x: 350, y, size: 10, font });
      page.drawText(normalizeFulfillment(item.fulfillmentStatus), { x: 470, y, size: 10, font });
      y -= 16;
    }

    y -= 8;
    drawLine();

    const trackUrl = trackingUrlFor(order.shippingCarrier, order.shippingTrackingNumber);

    page.drawText("Shipment", { x: 40, y, size: 12, font: fontBold });
    y -= 16;

    page.drawText(`Carrier: ${safeString(order.shippingCarrier || "—", 80) || "—"}`, {
      x: 40,
      y,
      size: 10,
      font,
    });
    y -= 14;

    page.drawText(`Tracking: ${safeString(order.shippingTrackingNumber || "—", 120) || "—"}`, {
      x: 40,
      y,
      size: 10,
      font,
    });
    y -= 14;

    if (trackUrl) {
      page.drawText(`Track: ${trackUrl}`, { x: 40, y, size: 10, font });
      y -= 14;
    }

    page.drawText("Thank you for training with Kimora Co.", {
      x: 40,
      y: 40,
      size: 10,
      font: fontBold,
    });
  }

  const out = await doc.save();
  return new Uint8Array(out);
}