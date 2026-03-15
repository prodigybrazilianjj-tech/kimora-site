// server/routes/adminRoutes.ts
import type { Express } from "express";
import { eq, desc, sql, and, inArray } from "drizzle-orm";

import { db } from "../db";
import { orders, orderItems } from "../../shared/schema";

import {
  reconcileInventoryReservationForOrderItem,
  getAdminInventoryHandler,
  getAdminInventoryItemHandler,
  adjustAdminInventoryHandler,
} from "../services/inventoryService";

function safeString(v: any, maxLen = 20000) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}

function safeErrSummary(err: any) {
  const message = String(err?.message || "unknown error");
  const shortMsg = message.length > 180 ? message.slice(0, 180) + "…" : message;
  return { message: shortMsg };
}

function toOrderNumber(sessionId: string | null | undefined) {
  const s = safeString(sessionId || "", 200);
  return s.replace(/^cs_/, "");
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

export function registerAdminRoutes(app: Express) {
  /*
  INVENTORY ROUTES
  */

  app.get("/api/admin/inventory", getAdminInventoryHandler);
  app.get("/api/admin/inventory/:id", getAdminInventoryItemHandler);
  app.post("/api/admin/inventory/:id/adjust", adjustAdminInventoryHandler);

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
  ADMIN ORDER LIST
  */

  app.get("/api/admin/orders", async (req, res) => {
    const denied = requireAdmin(req, res);
    if (denied) return;

    try {
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
        })
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(500);

      return res.json({
        ok: true,
        rows: rows.map((r) => ({
          ...r,
          orderNumber: toOrderNumber(r.stripeCheckoutSessionId ?? null),
        })),
      });
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
        },
        items,
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
      const status = String(req.body?.fulfillmentStatus ?? "").trim();

      const existingItems = await db
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          flavor: orderItems.flavor,
          quantity: orderItems.quantity,
          fulfillmentStatus: orderItems.fulfillmentStatus,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      if (!existingItems.length) {
        return res.status(404).json({ ok: false, message: "No items found for that order." });
      }

      await db
        .update(orderItems)
        .set({
          fulfillmentStatus: status,
        })
        .where(eq(orderItems.orderId, orderId));

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

      return res.json({ ok: true });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("PATCH /api/admin/orders/:id/fulfillment error:", s);
      return res.status(500).json({ ok: false, message: "Failed to update order fulfillment." });
    }
  });
}