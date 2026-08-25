// server/routes/adminRoutes.ts
import type { Express } from "express";
import { eq, desc, inArray, sql } from "drizzle-orm";

import { db } from "../db";
import { orders, orderItems, waitlistEmails } from "../../shared/schema";
import { bearerTokenFromRequest, adminToken, matchesAny } from "../security";

import {
  reconcileInventoryReservationForOrderItem,
  getAdminInventoryHandler,
  getAdminInventoryItemHandler,
  adjustAdminInventoryHandler,
  recordInPersonSaleHandler,
} from "../services/inventoryService";

import {
  getOrderLabelByOrderId,
  createBatchLabels,
  fulfillPackedOrders,
  trackingUrlFor,
} from "../services/shippingService";

import {
  mergePdfs,
  appendErrorsPage,
  buildPackingSlipsPdf,
} from "../services/pdfService";

import { maybeSendShippingEmailForOrder } from "../services/emailService";

const ALLOWED_FULFILLMENT = new Set([
  "unfulfilled",
  "allocated",
  "packed",
  "shipped",
  "delivered",
  "canceled",
  "backordered",
]);

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

function toOrderNumber(sessionId: string | null | undefined) {
  const s = safeString(sessionId || "", 200);
  return s.replace(/^cs_/, "");
}

/*
Previously this file carried its OWN token reader that looked at headers only.
That silently broke the contract documented on bearerTokenFromRequest() in
server/security.ts: unlocking the /tools gate sets a SameSite=Strict cookie
that the API is supposed to accept, so an operator who had just unlocked
/tools/dtc still got a bare 401 from every /api/admin/* route with no hint why.

One reader now, shared with the wholesale routes. The cookie is safe to accept
here for the same reason it is there: SameSite=Strict means a cross-site form
or fetch cannot ride it.
*/
function requireAdmin(req: any, res: any) {
  const expected = adminToken();

  if (!expected) {
    return res.status(500).json({
      ok: false,
      message: "ADMIN_DASHBOARD_TOKEN is not set on the server.",
    });
  }

  if (!matchesAny(bearerTokenFromRequest(req), expected)) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  return null;
}

function parseDateOnlyInput(value: any): Date | null {
  const s = safeString(value, 32);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;

  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function normalizeFulfillment(v: any) {
  const s = String(v || "").trim().toLowerCase();
  return ALLOWED_FULFILLMENT.has(s) ? s : "unfulfilled";
}

function rollupOrderFulfillment(counts: Record<string, number>) {
  const get = (k: string) => Number(counts[k] ?? 0) || 0;

  const backordered = get("backordered");
  const unfulfilled = get("unfulfilled");
  const allocated = get("allocated");
  const packed = get("packed");
  const shipped = get("shipped");
  const delivered = get("delivered");
  const canceled = get("canceled");

  let top = "unfulfilled";
  if (backordered > 0) top = "backordered";
  else if (unfulfilled > 0) top = "unfulfilled";
  else if (allocated > 0) top = "allocated";
  else if (packed > 0) top = "packed";
  else if (shipped > 0) top = "shipped";
  else if (delivered > 0) top = "delivered";
  else if (canceled > 0) top = "canceled";

  return { fulfillmentStatus: top, fulfillmentCounts: counts };
}

function pickOrderSearchWhere(q: string) {
  const needle = `%${q}%`;
  return sql`(
    ${orders.id}::text ILIKE ${needle}
    OR ${orders.customerEmail} ILIKE ${needle}
    OR ${orders.stripeCheckoutSessionId} ILIKE ${needle}
    OR replace(${orders.stripeCheckoutSessionId}, 'cs_', '') ILIKE ${needle}
    OR ${orders.stripePaymentIntentId} ILIKE ${needle}
    OR ${orders.stripeSubscriptionId} ILIKE ${needle}
    OR ${orders.shippingName} ILIKE ${needle}
    OR ${orders.shippingTrackingNumber} ILIKE ${needle}
  )`;
}

async function getPackedOrderIds(orderIdsIn: string[]) {
  let selectedOrderIds: string[] = [];

  if (orderIdsIn.length > 0) {
    const packedAgg = await db
      .select({
        orderId: orderItems.orderId,
        packedCount: sql<number>`sum(case when ${orderItems.fulfillmentStatus} = 'packed' then 1 else 0 end)`.mapWith(
          Number
        ),
      })
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIdsIn as any))
      .groupBy(orderItems.orderId);

    selectedOrderIds = (packedAgg || [])
      .filter((r: any) => (Number(r.packedCount) || 0) > 0)
      .map((r: any) => String(r.orderId || "").trim())
      .filter(Boolean);
  } else {
    const packedAgg = await db
      .select({
        orderId: orderItems.orderId,
        packedCount: sql<number>`sum(case when ${orderItems.fulfillmentStatus} = 'packed' then 1 else 0 end)`.mapWith(
          Number
        ),
      })
      .from(orderItems)
      .groupBy(orderItems.orderId);

    selectedOrderIds = (packedAgg || [])
      .filter((r: any) => (Number(r.packedCount) || 0) > 0)
      .map((r: any) => String(r.orderId || "").trim())
      .filter(Boolean);
  }

  return selectedOrderIds;
}

async function getPackingSlipRowsByOrderIds(selectedOrderIds: string[]) {
  const orderRows = await db
    .select({
      id: orders.id,
      createdAt: orders.createdAt,
      customerEmail: orders.customerEmail,
      shippingName: orders.shippingName,
      shippingAddress: orders.shippingAddress,
      amountTotal: orders.amountTotal,
      currency: orders.currency,
      shippingCarrier: orders.shippingCarrier,
      shippingTrackingNumber: orders.shippingTrackingNumber,
      isSubscription: orders.isSubscription,
    })
    .from(orders)
    .where(inArray(orders.id, selectedOrderIds as any))
    .orderBy(desc(orders.createdAt))
    .limit(500);

  const byOrderId: Record<string, any> = {};
  for (const row of orderRows as any[]) {
    byOrderId[String(row.id)] = row;
  }

  const orderedIds = selectedOrderIds.filter((id) => byOrderId[id]);

  return { byOrderId, orderedIds };
}

export function registerAdminRoutes(app: Express) {
  /*
  INVENTORY ROUTES
  */

  app.get("/api/admin/inventory", getAdminInventoryHandler);
  app.get("/api/admin/inventory/:id", getAdminInventoryItemHandler);
  app.post("/api/admin/inventory/:id/adjust", adjustAdminInventoryHandler);
  app.post("/api/admin/inventory/:id/in-person-sale", recordInPersonSaleHandler);

  /*
  SUMMARY
  */

  app.get("/api/admin/summary", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const rows = await db
        .select({
          id: orders.id,
          status: orders.status,
          amountTotal: orders.amountTotal,
          isSubscription: orders.isSubscription,
        })
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(5000);

      const paid = rows.filter((r) => String(r.status || "").toLowerCase() === "paid");
      const refunded = rows.filter((r) => String(r.status || "").toLowerCase() === "refunded");

      const totalRevenueCents = paid.reduce((acc, r) => acc + (r.amountTotal ?? 0), 0);
      const aovCents = paid.length ? Math.round(totalRevenueCents / paid.length) : 0;

      const subscriptionOrders = rows.filter((r) => Boolean(r.isSubscription)).length;
      const onetimeOrders = rows.length - subscriptionOrders;

      return res.json({
        ok: true,
        summary: {
          totalOrders: rows.length,
          totalRevenueCents,
          aovCents,
          paidOrders: paid.length,
          refundedOrders: refunded.length,
          subscriptionOrders,
          onetimeOrders,
        },
      });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("GET /api/admin/summary error:", s);
      return res.status(500).json({ ok: false, message: "Failed to load summary." });
    }
  });

  /*
  WAITLIST
  */

  app.get("/api/admin/waitlist", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    // Quarantined rows (bot flood, breaker overflow) are hidden by default so
    // the headline count means "people", not "rows". ?includeQuarantined=1
    // shows everything; ?status=quarantined shows only the parked ones.
    const statusFilter = String(req.query.status ?? "").trim();
    const includeQuarantined =
      String(req.query.includeQuarantined ?? "") === "1";

    try {
      const where = statusFilter
        ? eq(waitlistEmails.status, statusFilter)
        : includeQuarantined
          ? undefined
          : eq(waitlistEmails.status, "active");

      const rows = await db
        .select({
          id: waitlistEmails.id,
          email: waitlistEmails.email,
          source: waitlistEmails.source,
          status: waitlistEmails.status,
          createdAt: waitlistEmails.createdAt,
        })
        .from(waitlistEmails)
        .where(where)
        .orderBy(desc(waitlistEmails.createdAt))
        .limit(5000);

      const counts = await db
        .select({
          status: waitlistEmails.status,
          n: sql<number>`count(*)::int`,
        })
        .from(waitlistEmails)
        .groupBy(waitlistEmails.status);

      return res.json({ ok: true, rows, counts });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("GET /api/admin/waitlist error:", s);
      return res.status(500).json({ ok: false, message: "Failed to load waitlist." });
    }
  });

  /*
  ADMIN ORDER LIST
  */

  app.get("/api/admin/orders", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const q = safeString(req.query?.q, 200).trim();
      const status = safeString(req.query?.status, 32).trim();
      const mode = safeString(req.query?.mode, 32).trim();
      const fulfillment = safeString(req.query?.fulfillment, 32).trim().toLowerCase();
      const dateFrom = parseDateOnlyInput(req.query?.dateFrom);
      const dateTo = parseDateOnlyInput(req.query?.dateTo);

      const whereParts: any[] = [];

      if (q) whereParts.push(pickOrderSearchWhere(q));
      if (status) whereParts.push(eq(orders.status, status));

      if (mode === "subscription") whereParts.push(eq(orders.isSubscription, true));
      if (mode === "payment") whereParts.push(eq(orders.isSubscription, false));

      if (dateFrom) {
        whereParts.push(sql`${orders.createdAt} >= ${dateFrom.toISOString()}`);
      }

      if (dateTo) {
        const endExclusive = new Date(dateTo);
        endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
        whereParts.push(sql`${orders.createdAt} < ${endExclusive.toISOString()}`);
      }

      const where =
        whereParts.length === 0
          ? undefined
          : whereParts.length === 1
            ? whereParts[0]
            : sql`${whereParts.reduce(
                (acc, part, i) => (i === 0 ? part : sql`${acc} AND ${part}`),
                whereParts[0]
              )}`;

      const rows = await db
        .select({
          id: orders.id,
          createdAt: orders.createdAt,
          customerEmail: orders.customerEmail,
          status: orders.status,
          currency: orders.currency,
          amountSubtotal: orders.amountSubtotal,
          amountTotal: orders.amountTotal,
          isSubscription: orders.isSubscription,
          stripeCheckoutSessionId: orders.stripeCheckoutSessionId,
          stripePaymentIntentId: orders.stripePaymentIntentId,
          stripeSubscriptionId: orders.stripeSubscriptionId,
          stripeCustomerId: orders.stripeCustomerId,
          shippingName: orders.shippingName,
          shippingAddress: orders.shippingAddress,
          shippingCarrier: orders.shippingCarrier,
          shippingTrackingNumber: orders.shippingTrackingNumber,
          shippingLabelUrl: orders.shippingLabelUrl,
          shippingShipmentId: orders.shippingShipmentId,
        })
        .from(orders)
        .where(where as any)
        .orderBy(desc(orders.createdAt))
        .limit(5000);

      const orderIds = rows.map((r) => r.id).filter(Boolean);
      const rollupByOrderId: Record<
        string,
        { fulfillmentStatus: string; fulfillmentCounts: Record<string, number> }
      > = {};

      if (orderIds.length) {
        const agg = await db
          .select({
            orderId: orderItems.orderId,
            status: orderItems.fulfillmentStatus,
            count: sql<number>`count(*)`.mapWith(Number),
          })
          .from(orderItems)
          .where(inArray(orderItems.orderId, orderIds as any))
          .groupBy(orderItems.orderId, orderItems.fulfillmentStatus);

        for (const row of agg as any[]) {
          const oid = String(row.orderId || "");
          if (!oid) continue;
          if (!rollupByOrderId[oid]) {
            rollupByOrderId[oid] = { fulfillmentStatus: "unfulfilled", fulfillmentCounts: {} };
          }
          const st = normalizeFulfillment(row.status);
          const n = Number(row.count ?? 0) || 0;
          rollupByOrderId[oid].fulfillmentCounts[st] =
            (rollupByOrderId[oid].fulfillmentCounts[st] || 0) + n;
        }

        for (const oid of Object.keys(rollupByOrderId)) {
          const r = rollupByOrderId[oid];
          const rolled = rollupOrderFulfillment(r.fulfillmentCounts || {});
          rollupByOrderId[oid] = {
            fulfillmentStatus: rolled.fulfillmentStatus,
            fulfillmentCounts: rolled.fulfillmentCounts,
          };
        }
      }

      let withRollup = rows.map((r) => {
        const roll = rollupByOrderId[String(r.id)] || null;
        return {
          ...r,
          orderNumber: toOrderNumber(r.stripeCheckoutSessionId ?? null),
          fulfillmentStatus: roll?.fulfillmentStatus ?? "unfulfilled",
          fulfillmentCounts: roll?.fulfillmentCounts ?? {},
          trackingUrl: trackingUrlFor(r.shippingCarrier ?? null, r.shippingTrackingNumber ?? null),
        };
      });

      if (fulfillment && ALLOWED_FULFILLMENT.has(fulfillment)) {
        withRollup = withRollup.filter(
          (r) => String(r.fulfillmentStatus || "").toLowerCase() === fulfillment
        );
      }

      return res.json({ ok: true, rows: withRollup.slice(0, 500) });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("GET /api/admin/orders error:", s);
      return res.status(500).json({ ok: false, message: "Failed to load orders." });
    }
  });

  /*
  SINGLE ORDER
  */

  app.get("/api/admin/orders/:id", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const id = String(req.params.id || "").trim();
      if (!id) return res.status(400).json({ ok: false, message: "Missing id." });

      const order = await db.select().from(orders).where(eq(orders.id, id)).limit(1);

      if (!order?.length) {
        return res.status(404).json({ ok: false, message: "Not found." });
      }

      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, id))
        .orderBy(desc(orderItems.createdAt))
        .limit(200);

      return res.json({
        ok: true,
        order: {
          ...order[0],
          orderNumber: toOrderNumber(order[0]?.stripeCheckoutSessionId ?? null),
          trackingUrl: trackingUrlFor(
            order[0]?.shippingCarrier ?? null,
            order[0]?.shippingTrackingNumber ?? null
          ),
        },
        items: items.map((it) => ({
          ...it,
          trackingUrl: trackingUrlFor(it.carrier ?? null, it.trackingNumber ?? null),
        })),
      });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("GET /api/admin/orders/:id error:", s);
      return res.status(500).json({ ok: false, message: "Failed to load order." });
    }
  });

  /*
  ORDER FULFILLMENT UPDATE
  */

  app.patch("/api/admin/orders/:id/fulfillment", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const orderId = String(req.params.id || "").trim();
      if (!orderId) return res.status(400).json({ ok: false, message: "Missing id." });

      const status = String(req.body?.fulfillmentStatus ?? "").trim().toLowerCase();
      if (!status || !ALLOWED_FULFILLMENT.has(status)) {
        return res.status(400).json({
          ok: false,
          message:
            "Invalid fulfillmentStatus. Allowed: unfulfilled, allocated, packed, shipped, delivered, canceled, backordered",
        });
      }

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

      if (!existingItems?.length) {
        return res.status(404).json({ ok: false, message: "No items found for that order." });
      }

      const now = new Date();
      const set: any = { fulfillmentStatus: status };

      if (status === "shipped") set.shippedAt = now;
      if (status === "delivered") set.deliveredAt = now;

      const updated = await db
        .update(orderItems)
        .set(set)
        .where(eq(orderItems.orderId, orderId))
        .returning({ id: orderItems.id });

      if (!updated?.length) {
        return res.status(404).json({ ok: false, message: "No items found for that order." });
      }

      for (const item of existingItems) {
        await reconcileInventoryReservationForOrderItem({
          orderId,
          orderItemId: String(item.id),
          flavor: String(item.flavor || ""),
          quantity: Number(item.quantity ?? 0) || 0,
          fromStatus: item.fulfillmentStatus,
          toStatus: status,
        });
      }

      if (status === "shipped") {
        await maybeSendShippingEmailForOrder(orderId);
      }

      return res.json({ ok: true });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("PATCH /api/admin/orders/:id/fulfillment error:", s);
      return res.status(500).json({ ok: false, message: "Failed to update order fulfillment." });
    }
  });

  /*
  ORDER ITEM FULFILLMENT UPDATE
  */

  app.patch("/api/admin/order-items/:id/fulfillment", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const id = String(req.params.id || "").trim();
      if (!id) return res.status(400).json({ ok: false, message: "Missing id." });

      const status = String(req.body?.fulfillmentStatus ?? "").trim().toLowerCase();
      const carrier = safeString(req.body?.carrier, 80) || null;
      const trackingNumber = safeString(req.body?.trackingNumber, 120) || null;

      if (!status || !ALLOWED_FULFILLMENT.has(status)) {
        return res.status(400).json({
          ok: false,
          message:
            "Invalid fulfillmentStatus. Allowed: unfulfilled, allocated, packed, shipped, delivered, canceled, backordered",
        });
      }

      const existingRows = await db
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          flavor: orderItems.flavor,
          quantity: orderItems.quantity,
          fulfillmentStatus: orderItems.fulfillmentStatus,
        })
        .from(orderItems)
        .where(eq(orderItems.id, id))
        .limit(1);

      const existing = existingRows?.[0];
      if (!existing) {
        return res.status(404).json({ ok: false, message: "Not found." });
      }

      const now = new Date();

      const set: any = {
        fulfillmentStatus: status,
        carrier,
        trackingNumber,
      };

      if (status === "shipped") set.shippedAt = now;
      if (status === "delivered") set.deliveredAt = now;

      const updated = await db
        .update(orderItems)
        .set(set)
        .where(eq(orderItems.id, id))
        .returning({ id: orderItems.id, orderId: orderItems.orderId });

      if (!updated?.length) {
        return res.status(404).json({ ok: false, message: "Not found." });
      }

      await reconcileInventoryReservationForOrderItem({
        orderId: String(existing.orderId),
        orderItemId: String(existing.id),
        flavor: String(existing.flavor || ""),
        quantity: Number(existing.quantity ?? 0) || 0,
        fromStatus: existing.fulfillmentStatus,
        toStatus: status,
      });

      if (status === "shipped") {
        await maybeSendShippingEmailForOrder(String(updated[0].orderId));
      }

      return res.json({ ok: true });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("PATCH /api/admin/order-items/:id/fulfillment error:", s);
      return res.status(500).json({ ok: false, message: "Failed to update item." });
    }
  });

  /*
  SINGLE ORDER LABEL
  */

  app.get("/api/admin/orders/:id/label", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const id = String(req.params.id || "").trim();
      if (!id) return res.status(400).json({ ok: false, message: "Missing id." });

      const result = await getOrderLabelByOrderId(id);

      if (!result) {
        return res.status(404).json({ ok: false, message: "Order not found." });
      }

      if (!result.labelUrl) {
        return res.status(404).json({ ok: false, message: "No label found for this order." });
      }

      return res.json(result);
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("GET /api/admin/orders/:id/label error:", s);
      return res.status(500).json({ ok: false, message: "Failed to load label." });
    }
  });

  /*
  BATCH LABELS
  */

  app.post("/api/admin/labels/batch", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const orderIdsIn: string[] = Array.isArray(req.body?.orderIds)
        ? req.body.orderIds.map((x: any) => String(x || "").trim()).filter(Boolean)
        : [];

      const { labelPdfs, errors } = await createBatchLabels({ orderIds: orderIdsIn });

      let merged = await mergePdfs(labelPdfs);

      if (errors.length) {
        merged = await appendErrorsPage(merged, errors);
        res.setHeader("X-Label-Errors", String(errors.length));
      } else {
        res.setHeader("X-Label-Errors", "0");
      }

      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const filename = `kimora-labels-packed-${stamp}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.status(200).send(Buffer.from(merged));
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("POST /api/admin/labels/batch error:", s);

      if (Number(err?.statusCode) === 404) {
        return res.status(404).json({ ok: false, message: err.message || "Not found." });
      }

      if (Number(err?.statusCode) === 400) {
        return res.status(400).json({
          ok: false,
          message: err.message || "Failed to create labels.",
          errors: err?.errors || undefined,
        });
      }

      if (Number(err?.statusCode) === 500 && String(err?.message || "").includes("EASYPOST")) {
        return res.status(500).json({ ok: false, message: err.message });
      }

      return res.status(500).json({ ok: false, message: "Failed to create labels." });
    }
  });

  /*
  BATCH PACKING SLIPS
  */

  app.post("/api/admin/packing-slips/batch", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const orderIdsIn: string[] = Array.isArray(req.body?.orderIds)
        ? req.body.orderIds.map((x: any) => String(x || "").trim()).filter(Boolean)
        : [];

      const selectedOrderIds = await getPackedOrderIds(orderIdsIn);

      if (!selectedOrderIds.length) {
        return res.status(404).json({
          ok: false,
          message: "No packed orders were found for packing slips.",
        });
      }

      const { byOrderId, orderedIds } = await getPackingSlipRowsByOrderIds(selectedOrderIds);

      if (!orderedIds.length) {
        return res.status(404).json({
          ok: false,
          message: "No matching orders found for packing slips.",
        });
      }

      const pdf = await buildPackingSlipsPdf({
        orderIds: orderedIds,
        byOrderId,
      });

      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const filename = `kimora-packing-slips-${stamp}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.status(200).send(Buffer.from(pdf));
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("POST /api/admin/packing-slips/batch error:", s);
      return res.status(500).json({ ok: false, message: "Failed to generate packing slips." });
    }
  });

  /*
  ONE-CLICK FULFILLMENT PACKET
  */

  app.post("/api/admin/fulfill/batch", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
      const orderIdsIn: string[] = Array.isArray(req.body?.orderIds)
        ? req.body.orderIds.map((x: any) => String(x || "").trim()).filter(Boolean)
        : [];

      const { labelPdfs, errors, processedOrderIds, packingSlipOrderIds } =
        await fulfillPackedOrders({
          orderIds: orderIdsIn,
        });

      if (!labelPdfs.length) {
        return res.status(400).json({
          ok: false,
          message: errors.length
            ? `No labels created. Example: ${errors[0].orderId}: ${errors[0].message}`
            : "No labels created.",
          errors,
        });
      }

      const { byOrderId, orderedIds } = await getPackingSlipRowsByOrderIds(
        packingSlipOrderIds || processedOrderIds || []
      );

      if (!orderedIds.length) {
        return res.status(404).json({
          ok: false,
          message: "No matching orders found for packing slips.",
        });
      }

      const packingSlipsPdf = await buildPackingSlipsPdf({
        orderIds: orderedIds,
        byOrderId,
      });

      let merged = await mergePdfs([packingSlipsPdf, ...labelPdfs]);

      if (errors.length) {
        merged = await appendErrorsPage(merged, errors);
        res.setHeader("X-Fulfillment-Errors", String(errors.length));
      } else {
        res.setHeader("X-Fulfillment-Errors", "0");
      }

      res.setHeader("X-Fulfilled-Orders", String((processedOrderIds || []).length));

      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const filename = `kimora-fulfillment-packet-${stamp}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.status(200).send(Buffer.from(merged));
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("POST /api/admin/fulfill/batch error:", s);

      if (Number(err?.statusCode) === 404) {
        return res.status(404).json({ ok: false, message: err.message || "Not found." });
      }

      if (Number(err?.statusCode) === 400) {
        return res.status(400).json({
          ok: false,
          message: err.message || "Failed to fulfill orders.",
          errors: err?.errors || undefined,
        });
      }

      if (Number(err?.statusCode) === 500 && String(err?.message || "").includes("EASYPOST")) {
        return res.status(500).json({ ok: false, message: err.message });
      }

      return res.status(500).json({ ok: false, message: "Failed to fulfill orders." });
    }
  });
}