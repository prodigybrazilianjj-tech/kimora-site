// server/services/shippingService.ts
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { orders, orderItems } from "../../shared/schema";
import { reconcileInventoryReservationForOrderItem } from "./inventoryService";
import { sendShippingNotificationEmail, maybeSendShippingEmailForOrder } from "./emailService";

export { maybeSendShippingEmailForOrder };

function safeString(v: any, maxLen = 20000) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}

function safeErrSummary(err: any) {
  const message = String(err?.message || "unknown error");
  const code = err?.code || err?.cause?.code || err?.cause?.errno || err?.errno || null;
  const shortMsg = message.length > 180 ? message.slice(0, 180) + "…" : message;
  return { code, message: shortMsg };
}

function numEnv(name: string, fallback: number) {
  const raw = process.env[name];
  const n = raw == null ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function normalizeOrderIds(orderIds?: string[]) {
  return Array.isArray(orderIds)
    ? orderIds
        .map((x) => String(x || "").trim())
        .filter(Boolean)
    : [];
}

export function trackingUrlFor(
  carrier: string | null | undefined,
  trackingNumber: string | null | undefined
) {
  const tracking = safeString(trackingNumber || "", 120);
  if (!tracking) return null;

  const carrierKey = safeString(carrier || "", 40).toLowerCase();

  if (carrierKey.includes("usps")) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(tracking)}`;
  }

  if (carrierKey.includes("ups")) {
    return `https://www.ups.com/track?tracknum=${encodeURIComponent(tracking)}`;
  }

  if (carrierKey.includes("fedex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(tracking)}`;
  }

  if (carrierKey.includes("dhl")) {
    return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${encodeURIComponent(
      tracking
    )}`;
  }

  return null;
}

export function getShipFromAddress() {
  return {
    name: safeString(process.env.SHIP_FROM_NAME || "Kimora Co", 80) || "Kimora Co",
    street1: safeString(process.env.SHIP_FROM_STREET1 || "PO Box 20024", 80) || "PO Box 20024",
    street2: safeString(process.env.SHIP_FROM_STREET2 || "", 80) || undefined,
    city:
      safeString(process.env.SHIP_FROM_CITY || "Village of Oak Creek", 60) ||
      "Village of Oak Creek",
    state: safeString(process.env.SHIP_FROM_STATE || "AZ", 20) || "AZ",
    zip: safeString(process.env.SHIP_FROM_ZIP || "86341", 20) || "86341",
    country: safeString(process.env.SHIP_FROM_COUNTRY || "US", 2) || "US",
    phone: safeString(process.env.SHIP_FROM_PHONE || "", 30) || undefined,
  };
}

export function getParcelForPouchCount(pouchCount: number) {
  const count = Number.isFinite(pouchCount) ? Math.max(1, Math.floor(pouchCount)) : 1;
  const weightOzPerPouch = numEnv("WEIGHT_OZ_PER_POUCH", 16);
  const totalWeightOz = Math.max(1, Math.round(count * weightOzPerPouch));

  if (count <= 2) {
    return {
      weight: totalWeightOz,
      length: numEnv("MAILER_LENGTH_IN", 13),
      width: numEnv("MAILER_WIDTH_IN", 10),
      height: numEnv("MAILER_HEIGHT_IN", 2),
      kind: "mailer" as const,
    };
  }

  if (count <= 4) {
    return {
      weight: totalWeightOz,
      length: numEnv("BOX_SM_LENGTH_IN", 10),
      width: numEnv("BOX_SM_WIDTH_IN", 8),
      height: numEnv("BOX_SM_HEIGHT_IN", 6),
      kind: "box_sm" as const,
    };
  }

  return {
    weight: totalWeightOz,
    length: numEnv("BOX_MD_LENGTH_IN", 12),
    width: numEnv("BOX_MD_WIDTH_IN", 10),
    height: numEnv("BOX_MD_HEIGHT_IN", 8),
    kind: "box_md" as const,
  };
}

function stripUndefined(obj: any) {
  const out: any = {};
  for (const k of Object.keys(obj || {})) {
    const v = (obj as any)[k];
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

async function easyPostRequest(path: string, init?: RequestInit) {
  const apiKey = String(process.env.EASYPOST_API_KEY || "").trim();
  if (!apiKey) throw new Error("Missing EASYPOST_API_KEY");

  const url = `https://api.easypost.com${path}`;
  const auth = Buffer.from(`${apiKey}:`).toString("base64");

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg =
      json?.error?.message ||
      json?.message ||
      `EasyPost error (${res.status}) on ${path}: ${text?.slice?.(0, 200) || ""}`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.payload = json;
    throw err;
  }

  return json;
}

function stripeAddrToEasyPost(toName: string | null | undefined, addr: any) {
  const name = safeString(toName || "", 80);
  const street1 = safeString(addr?.line1 || "", 100);
  const street2 = safeString(addr?.line2 || "", 100);
  const city = safeString(addr?.city || "", 60);
  const state = safeString(addr?.state || "", 60);
  const zip = safeString(addr?.postal_code || "", 20);
  const country = safeString(addr?.country || "US", 2) || "US";

  return stripUndefined({
    name: name || undefined,
    street1: street1 || undefined,
    street2: street2 || undefined,
    city: city || undefined,
    state: state || undefined,
    zip: zip || undefined,
    country: country || "US",
  });
}

async function getPackedOrderCandidateIds(args: {
  orderIds?: string[];
  requireMissingTracking?: boolean;
}) {
  const orderIdsIn = normalizeOrderIds(args.orderIds);
  const requireMissingTracking = Boolean(args.requireMissingTracking);

  const whereOrderIds =
    orderIdsIn.length > 0 ? inArray(orderItems.orderId, orderIdsIn as any) : undefined;

  const packedAgg = await db
    .select({
      orderId: orderItems.orderId,
      packedCount: sql<number>`sum(case when ${orderItems.fulfillmentStatus} = 'packed' then 1 else 0 end)`.mapWith(
        Number
      ),
      packedWithoutTracking: sql<number>`sum(case when ${orderItems.fulfillmentStatus} = 'packed' and (${orderItems.trackingNumber} is null or ${orderItems.trackingNumber} = '') then 1 else 0 end)`.mapWith(
        Number
      ),
    })
    .from(orderItems)
    .where(whereOrderIds as any)
    .groupBy(orderItems.orderId);

  return (packedAgg || [])
    .filter((r: any) => {
      const packedCount = Number(r.packedCount) || 0;
      const packedWithoutTracking = Number(r.packedWithoutTracking) || 0;
      if (packedCount <= 0) return false;
      if (requireMissingTracking) return packedWithoutTracking > 0;
      return true;
    })
    .map((r: any) => String(r.orderId || "").trim())
    .filter(Boolean);
}

export async function getPackedOrderIds(args?: { orderIds?: string[] }) {
  return getPackedOrderCandidateIds({
    orderIds: args?.orderIds,
    requireMissingTracking: false,
  });
}

export async function createAndBuyEasyPostShipment(args: {
  toAddress: any;
  fromAddress: any;
  parcel: { weight: number; length: number; width: number; height: number };
}) {
  const created = await easyPostRequest("/v2/shipments", {
    method: "POST",
    body: JSON.stringify({
      shipment: {
        to_address: args.toAddress,
        from_address: args.fromAddress,
        parcel: {
          weight: args.parcel.weight,
          length: args.parcel.length,
          width: args.parcel.width,
          height: args.parcel.height,
        },
        options: {
          label_format: "PDF",
        },
      },
    }),
  });

  const shipment = created?.shipment ?? created;
  const shipmentId = shipment?.id;
  if (!shipmentId) throw new Error("EasyPost: missing shipment id");

  const rates: any[] = Array.isArray(shipment?.rates) ? shipment.rates : [];
  if (!rates.length) throw new Error("EasyPost: no rates returned for shipment");

  const rate = rates
    .map((r) => ({
      id: r?.id,
      rate: Number(r?.rate),
      carrier: String(r?.carrier || ""),
      service: String(r?.service || ""),
    }))
    .filter((r) => r.id && Number.isFinite(r.rate))
    .sort((a, b) => a.rate - b.rate)[0];

  if (!rate?.id) throw new Error("EasyPost: could not select a rate to buy");

  const bought = await easyPostRequest(`/v2/shipments/${encodeURIComponent(shipmentId)}/buy`, {
    method: "POST",
    body: JSON.stringify({
      rate: { id: rate.id },
    }),
  });

  const boughtShipment = bought?.shipment ?? bought;
  const tracking = safeString(boughtShipment?.tracking_code || "", 120) || "";
  const carrier =
    safeString(boughtShipment?.selected_rate?.carrier || rate.carrier || "", 80) || "";

  const labelUrl =
    safeString(boughtShipment?.postage_label?.label_url || "", 1000) ||
    safeString(boughtShipment?.postage_label?.label_pdf_url || "", 1000) ||
    "";

  return {
    shipmentId: String(shipmentId),
    carrier,
    trackingNumber: tracking || null,
    labelUrl: labelUrl || null,
    selectedRate: {
      carrier,
      service: safeString(boughtShipment?.selected_rate?.service || rate.service || "", 80),
      rate: safeString(boughtShipment?.selected_rate?.rate || String(rate.rate) || "", 40),
    },
  };
}

export async function fetchPdfBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch label PDF (${res.status})`);
  const ab = await res.arrayBuffer();
  return new Uint8Array(ab);
}

export async function getOrderLabelByOrderId(orderId: string) {
  const row = await db
    .select({
      id: orders.id,
      shippingLabelUrl: orders.shippingLabelUrl,
      shippingTrackingNumber: orders.shippingTrackingNumber,
      shippingCarrier: orders.shippingCarrier,
      shippingShipmentId: orders.shippingShipmentId,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  const order = row?.[0];
  if (!order) return null;

  return {
    ok: true as const,
    labelUrl: order.shippingLabelUrl,
    trackingNumber: order.shippingTrackingNumber,
    carrier: order.shippingCarrier,
    shipmentId: order.shippingShipmentId,
    trackingUrl: trackingUrlFor(
      order.shippingCarrier ?? null,
      order.shippingTrackingNumber ?? null
    ),
  };
}

export async function createBatchLabels(args: { orderIds?: string[] }) {
  const apiKey = String(process.env.EASYPOST_API_KEY || "").trim();
  if (!apiKey) {
    const err: any = new Error("Missing EASYPOST_API_KEY");
    err.statusCode = 500;
    throw err;
  }

  const candidateOrderIds = await getPackedOrderCandidateIds({
    orderIds: args.orderIds,
    requireMissingTracking: true,
  });

  if (!candidateOrderIds.length) {
    const err: any = new Error("No packed orders without tracking were found.");
    err.statusCode = 404;
    throw err;
  }

  const orderRows = await db
    .select({
      id: orders.id,
      customerEmail: orders.customerEmail,
      shippingName: orders.shippingName,
      shippingAddress: orders.shippingAddress,
    })
    .from(orders)
    .where(inArray(orders.id, candidateOrderIds as any))
    .limit(500);

  const byId: Record<string, any> = {};
  for (const o of orderRows as any[]) byId[String(o.id)] = o;

  const qtyAgg = await db
    .select({
      orderId: orderItems.orderId,
      totalQty: sql<number>`sum(${orderItems.quantity})`.mapWith(Number),
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, candidateOrderIds as any))
    .groupBy(orderItems.orderId);

  const qtyByOrderId: Record<string, number> = {};
  for (const r of qtyAgg as any[]) {
    const oid = String(r.orderId || "").trim();
    if (!oid) continue;
    qtyByOrderId[oid] = Math.max(1, Number(r.totalQty ?? 1) || 1);
  }

  const fromAddress = getShipFromAddress();
  const labelPdfs: Uint8Array[] = [];
  const errors: Array<{ orderId: string; message: string }> = [];
  const processedOrderIds: string[] = [];

  for (const orderId of candidateOrderIds) {
    const o = byId[String(orderId)];
    if (!o) {
      errors.push({ orderId, message: "Order not found." });
      continue;
    }

    const shipAddr = o.shippingAddress;
    if (
      !shipAddr ||
      !shipAddr.line1 ||
      !shipAddr.city ||
      !shipAddr.state ||
      !shipAddr.postal_code
    ) {
      errors.push({ orderId, message: "Missing shipping address on order." });
      continue;
    }

    const toAddress = stripeAddrToEasyPost(o.shippingName || null, shipAddr);
    const pouchCount = qtyByOrderId[String(orderId)] ?? 1;
    const parcel = getParcelForPouchCount(pouchCount);

    try {
      const existingItems = await db
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          flavor: orderItems.flavor,
          quantity: orderItems.quantity,
          fulfillmentStatus: orderItems.fulfillmentStatus,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId))
        .limit(500);

      const result = await createAndBuyEasyPostShipment({
        toAddress,
        fromAddress,
        parcel,
      });

      if (!result.labelUrl) {
        errors.push({ orderId, message: "EasyPost returned no label URL." });
        continue;
      }

      const pdfBytes = await fetchPdfBytes(result.labelUrl);
      labelPdfs.push(pdfBytes);

      const now = new Date();

      await db
        .update(orders)
        .set({
          shippingCarrier: result.carrier || null,
          shippingTrackingNumber: result.trackingNumber || null,
          shippingLabelUrl: result.labelUrl || null,
          shippingShipmentId: result.shipmentId || null,
        })
        .where(eq(orders.id, orderId));

      await db
        .update(orderItems)
        .set({
          carrier: result.carrier || null,
          trackingNumber: result.trackingNumber || null,
          fulfillmentStatus: "shipped",
          shippedAt: now,
        } as any)
        .where(eq(orderItems.orderId, orderId));

      for (const item of existingItems) {
        await reconcileInventoryReservationForOrderItem({
          orderId,
          orderItemId: String(item.id),
          flavor: String(item.flavor || ""),
          quantity: Number(item.quantity ?? 0) || 0,
          fromStatus: item.fulfillmentStatus,
          toStatus: "shipped",
        });
      }

      if (o.customerEmail) {
        await sendShippingNotificationEmail({
          customerEmail: String(o.customerEmail),
          shippingName: o.shippingName ?? null,
          orderId,
          carrier: result.carrier || null,
          trackingNumber: result.trackingNumber || null,
        });
      }

      processedOrderIds.push(orderId);
    } catch (e: any) {
      const s = safeErrSummary(e);
      errors.push({ orderId, message: s.message || "Failed to create label." });
    }
  }

  if (!labelPdfs.length) {
    const err: any = new Error(
      errors.length
        ? `No labels created. Example: ${errors[0].orderId}: ${errors[0].message}`
        : "No labels created."
    );
    err.statusCode = 400;
    err.errors = errors;
    throw err;
  }

  return {
    labelPdfs,
    errors,
    processedOrderIds,
  };
}

export async function fulfillPackedOrders(args: { orderIds?: string[] }) {
  const result = await createBatchLabels({ orderIds: args.orderIds });

  return {
    labelPdfs: result.labelPdfs,
    errors: result.errors,
    processedOrderIds: result.processedOrderIds,
    packingSlipOrderIds: [...result.processedOrderIds],
  };
}
