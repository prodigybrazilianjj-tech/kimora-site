// server/services/inventoryService.ts
import type { Request, Response } from "express";
import { desc, eq, sql } from "drizzle-orm";

import { db } from "../db";
import { inventoryItems, inventoryTransactions } from "../../shared/schema";

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

function parseInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function adminTokenFromReq(req: Request) {
  const header =
    String(req.headers["x-admin-token"] ?? "").trim() ||
    String(req.headers["authorization"] ?? "").trim();

  if (!header) return "";

  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  return header;
}

function requireAdmin(req: Request, res: Response) {
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

export async function applyInventoryForOrderItem(args: {
  orderId: string;
  orderItemId: string;
  flavor: string;
  quantity: number;
}) {
  const flavor = safeString(args.flavor, 120);
  const quantity = Number(args.quantity ?? 0);

  if (!flavor || !Number.isFinite(quantity) || quantity <= 0) return;

  const inventoryRow = await db
    .select({
      id: inventoryItems.id,
      flavor: inventoryItems.flavor,
      onHandQuantity: inventoryItems.onHandQuantity,
      reservedQuantity: inventoryItems.reservedQuantity,
    })
    .from(inventoryItems)
    .where(eq(inventoryItems.flavor, flavor))
    .limit(1);

  const inventoryItem = inventoryRow?.[0];
  if (!inventoryItem?.id) {
    console.warn(
      "[inventory] no inventory item found for flavor:",
      flavor,
      "order:",
      args.orderId,
      "orderItem:",
      args.orderItemId
    );
    return;
  }

  try {
    const updated = await db
      .update(inventoryItems)
      .set({
        reservedQuantity: sql`${inventoryItems.reservedQuantity} + ${quantity}`,
        updatedAt: new Date(),
      })
      .where(
        sql`${inventoryItems.id} = ${inventoryItem.id} and (${inventoryItems.onHandQuantity} - ${inventoryItems.reservedQuantity}) >= ${quantity}`
      )
      .returning({
        id: inventoryItems.id,
      });

    if (!updated?.length) {
      console.warn(
        "[inventory] insufficient available quantity for flavor:",
        flavor,
        "requested:",
        quantity,
        "order:",
        args.orderId,
        "orderItem:",
        args.orderItemId
      );
      return;
    }

    await db.insert(inventoryTransactions).values({
      inventoryItemId: inventoryItem.id,
      orderId: args.orderId,
      orderItemId: args.orderItemId,
      transactionType: "reservation",
      quantityDelta: 0,
      reservedDelta: quantity,
      note: `Order reservation for ${flavor}`,
      metadata: {
        source: "stripe_webhook",
        reason: "checkout.session.completed",
      },
    });
  } catch (e) {
    console.warn("[inventory] applyInventoryForOrderItem failed:", safeErrSummary(e));
  }
}

export async function getAdminInventoryHandler(req: Request, res: Response) {
  const denied = requireAdmin(req, res);
  if (denied) return;

  try {
    const rows = await db
      .select({
        id: inventoryItems.id,
        sku: inventoryItems.sku,
        flavor: inventoryItems.flavor,
        productName: inventoryItems.productName,
        isActive: inventoryItems.isActive,
        onHandQuantity: inventoryItems.onHandQuantity,
        reservedQuantity: inventoryItems.reservedQuantity,
        reorderPoint: inventoryItems.reorderPoint,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
      })
      .from(inventoryItems)
      .orderBy(desc(inventoryItems.updatedAt), inventoryItems.sku)
      .limit(500);

    return res.json({ ok: true, rows });
  } catch (err: any) {
    const s = safeErrSummary(err);
    console.error("GET /api/admin/inventory error:", s);
    return res.status(500).json({ ok: false, message: "Failed to load inventory." });
  }
}

export async function getAdminInventoryItemHandler(req: Request, res: Response) {
  const denied = requireAdmin(req, res);
  if (denied) return;

  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, message: "Missing id." });

    const itemRows = await db
      .select({
        id: inventoryItems.id,
        sku: inventoryItems.sku,
        flavor: inventoryItems.flavor,
        productName: inventoryItems.productName,
        isActive: inventoryItems.isActive,
        onHandQuantity: inventoryItems.onHandQuantity,
        reservedQuantity: inventoryItems.reservedQuantity,
        reorderPoint: inventoryItems.reorderPoint,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
      })
      .from(inventoryItems)
      .where(eq(inventoryItems.id, id))
      .limit(1);

    const item = itemRows?.[0];
    if (!item) {
      return res.status(404).json({ ok: false, message: "Inventory item not found." });
    }

    const transactions = await db
      .select()
      .from(inventoryTransactions)
      .where(eq(inventoryTransactions.inventoryItemId, id))
      .orderBy(desc(inventoryTransactions.createdAt))
      .limit(200);

    return res.json({ ok: true, item, transactions });
  } catch (err: any) {
    const s = safeErrSummary(err);
    console.error("GET /api/admin/inventory/:id error:", s);
    return res.status(500).json({ ok: false, message: "Failed to load inventory item." });
  }
}

export async function adjustAdminInventoryHandler(req: Request, res: Response) {
  const denied = requireAdmin(req, res);
  if (denied) return;

  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, message: "Missing id." });

    const onHandDelta = parseInteger(req.body?.onHandDelta) ?? 0;
    const reservedDelta = parseInteger(req.body?.reservedDelta) ?? 0;
    const reorderPointRaw = parseInteger(req.body?.reorderPoint);
    const note = safeString(req.body?.note, 5000) || null;

    if (reorderPointRaw !== null && reorderPointRaw < 0) {
      return res.status(400).json({ ok: false, message: "Reorder point cannot be negative." });
    }

    const existingRows = await db
      .select({
        id: inventoryItems.id,
        sku: inventoryItems.sku,
        flavor: inventoryItems.flavor,
        productName: inventoryItems.productName,
        isActive: inventoryItems.isActive,
        onHandQuantity: inventoryItems.onHandQuantity,
        reservedQuantity: inventoryItems.reservedQuantity,
        reorderPoint: inventoryItems.reorderPoint,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
      })
      .from(inventoryItems)
      .where(eq(inventoryItems.id, id))
      .limit(1);

    const existing = existingRows?.[0];
    if (!existing) {
      return res.status(404).json({ ok: false, message: "Inventory item not found." });
    }

    const currentOnHand = Number(existing.onHandQuantity ?? 0) || 0;
    const currentReserved = Number(existing.reservedQuantity ?? 0) || 0;
    const currentReorderPoint = Number(existing.reorderPoint ?? 0) || 0;

    const nextOnHand = currentOnHand + onHandDelta;
    const nextReserved = currentReserved + reservedDelta;
    const nextReorderPoint = reorderPointRaw === null ? currentReorderPoint : reorderPointRaw;

    if (nextOnHand < 0) {
      return res.status(400).json({ ok: false, message: "On-hand quantity cannot go below 0." });
    }

    if (nextReserved < 0) {
      return res.status(400).json({ ok: false, message: "Reserved quantity cannot go below 0." });
    }

    if (nextReserved > nextOnHand) {
      return res.status(400).json({
        ok: false,
        message: "Reserved quantity cannot exceed on-hand quantity.",
      });
    }

    const changed =
      onHandDelta !== 0 ||
      reservedDelta !== 0 ||
      nextReorderPoint !== currentReorderPoint ||
      Boolean(note);

    if (!changed) {
      return res.json({ ok: true, item: existing });
    }

    const updatedRows = await db
      .update(inventoryItems)
      .set({
        onHandQuantity: nextOnHand,
        reservedQuantity: nextReserved,
        reorderPoint: nextReorderPoint,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, id))
      .returning({
        id: inventoryItems.id,
        sku: inventoryItems.sku,
        flavor: inventoryItems.flavor,
        productName: inventoryItems.productName,
        isActive: inventoryItems.isActive,
        onHandQuantity: inventoryItems.onHandQuantity,
        reservedQuantity: inventoryItems.reservedQuantity,
        reorderPoint: inventoryItems.reorderPoint,
        createdAt: inventoryItems.createdAt,
        updatedAt: inventoryItems.updatedAt,
      });

    const updated = updatedRows?.[0];
    if (!updated) {
      return res.status(404).json({ ok: false, message: "Inventory item not found." });
    }

    await db.insert(inventoryTransactions).values({
      inventoryItemId: id,
      transactionType: "manual_adjustment",
      quantityDelta: onHandDelta,
      reservedDelta,
      note:
        note ||
        `Manual admin adjustment (onHand ${onHandDelta >= 0 ? "+" : ""}${onHandDelta}, reserved ${
          reservedDelta >= 0 ? "+" : ""
        }${reservedDelta}, reorder ${currentReorderPoint}→${nextReorderPoint})`,
      metadata: {
        source: "admin_dashboard",
        actor: "admin",
        reason: "manual_adjustment",
      },
    });

    return res.json({ ok: true, item: updated });
  } catch (err: any) {
    const s = safeErrSummary(err);
    console.error("POST /api/admin/inventory/:id/adjust error:", s);
    return res.status(500).json({ ok: false, message: "Failed to adjust inventory." });
  }
}