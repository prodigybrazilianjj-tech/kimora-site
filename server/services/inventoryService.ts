// server/services/inventoryService.ts
import type { Request, Response } from "express";
import { desc, eq, sql, and, gte } from "drizzle-orm";
import { Resend } from "resend";

import { db } from "../db";
import {
  inventoryItems,
  inventoryTransactions,
  restockAlerts,
} from "../../shared/schema";
import { safeTokenEqual } from "../security";

const resendApiKey = String(process.env.RESEND_API_KEY || "").trim();
const resend = resendApiKey ? new Resend(resendApiKey) : null;

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
  if (!safeTokenEqual(got, expected)) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  return null;
}

function normalizeFulfillmentStatus(value: any) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeFlavorSlug(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Resolve a wholesale product/flavor name to the CANONICAL inventory flavor slug,
// mirroring emailService.mapPriceIdToItem's description fallback. The canonical
// Lemon slug is "lemon-lychee"; we still accept legacy "yuzu" inbound as an
// alias for backward-compat, but always return "lemon-lychee".
function resolveFlavorSlug(raw: string): string {
  const slug = normalizeFlavorSlug(raw);
  if (!slug) return "";
  if (slug.includes("strawberry") || slug.includes("guava")) return "strawberry-guava";
  if (slug.includes("lemon") || slug.includes("lychee") || slug.includes("yuzu")) return "lemon-lychee";
  if (slug.includes("raspberry") || slug.includes("dragonfruit")) return "raspberry-dragonfruit";
  return slug;
}

function titleizeSlug(value: string | null | undefined) {
  return String(value || "")
    .split(/[-\s]+/g)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .filter(Boolean)
    .join(" ");
}

function getSiteUrl() {
  return (
    process.env.PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === "production" ? "https://kimoraco.com" : "http://localhost:5173")
  );
}

function getRestockEmailFromAddress() {
  return (
    String(process.env.RESEND_FROM_EMAIL || "").trim() ||
    String(process.env.FROM_EMAIL || "").trim() ||
    "Kimora <hello@kimoraco.com>"
  );
}

function statusHoldsReservation(status: string) {
  return status === "unfulfilled" || status === "allocated" || status === "packed";
}

function statusConsumesPhysicalInventory(status: string) {
  return status === "shipped" || status === "delivered";
}

async function findInventoryItemByFlavor(flavorRaw: string) {
  const normalizedFlavor = normalizeFlavorSlug(flavorRaw);
  if (!normalizedFlavor) return null;

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
    .where(eq(inventoryItems.flavor, normalizedFlavor))
    .limit(1);

  return rows?.[0] ?? null;
}

async function sendRestockEmailsForInventoryItem(args: {
  inventoryItemId: string;
  flavor: string;
  productName: string | null | undefined;
  availableQuantity: number;
}) {
  const flavor = normalizeFlavorSlug(args.flavor);
  if (!flavor) return { attempted: 0, sent: 0 };

  const availableQuantity = Number(args.availableQuantity ?? 0) || 0;
  if (availableQuantity <= 0) return { attempted: 0, sent: 0 };

  const pendingAlerts = await db
    .select({
      id: restockAlerts.id,
      email: restockAlerts.email,
      requestedQuantity: restockAlerts.requestedQuantity,
      productKey: restockAlerts.productKey,
      flavor: restockAlerts.flavor,
      status: restockAlerts.status,
      createdAt: restockAlerts.createdAt,
    })
    .from(restockAlerts)
    .where(
      and(
        eq(restockAlerts.flavor, flavor),
        eq(restockAlerts.status, "pending"),
      ),
    )
    .orderBy(desc(restockAlerts.createdAt))
    .limit(500);

  if (!pendingAlerts.length) {
    return { attempted: 0, sent: 0 };
  }

  if (!resend) {
    console.warn("[inventory] RESEND_API_KEY missing; skipping restock email send.");
    return { attempted: pendingAlerts.length, sent: 0 };
  }

  const siteUrl = getSiteUrl();
  const from = getRestockEmailFromAddress();
  const productLabel = safeString(args.productName || "", 200) || "Kimora";
  const flavorLabel = titleizeSlug(flavor);
  let sent = 0;

  for (const alert of pendingAlerts) {
    const requestedQty = Number(alert.requestedQuantity ?? 0) || 0;

    if (requestedQty > 0 && availableQuantity < requestedQty) {
      continue;
    }

    try {
      await resend.emails.send({
        from,
        to: alert.email,
        subject: `${flavorLabel} is back in stock`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
            <p>Hi there,</p>
            <p><strong>${flavorLabel}</strong> is back in stock.</p>
            <p>You can shop it here:</p>
            <p>
              <a href="${siteUrl}/shop" style="color: #111; font-weight: 700;">
                ${siteUrl}/shop
              </a>
            </p>
            <p>${productLabel}</p>
            <p style="color: #666; font-size: 12px; margin-top: 24px;">
              You’re receiving this because you asked to be notified when this item was available again.
            </p>
          </div>
        `,
      });

      await db
        .update(restockAlerts)
        .set({
          status: "notified",
          notifiedAt: new Date(),
        })
        .where(eq(restockAlerts.id, alert.id));

      sent += 1;
    } catch (e) {
      console.warn(
        "[inventory] failed sending restock email to",
        alert.email,
        safeErrSummary(e),
      );
    }
  }

  return {
    attempted: pendingAlerts.length,
    sent,
  };
}

export async function applyInventoryForOrderItem(args: {
  orderId: string;
  orderItemId: string;
  flavor: string;
  quantity: number;
}) {
  const flavor = normalizeFlavorSlug(safeString(args.flavor, 120));
  const quantity = Number(args.quantity ?? 0);

  if (!flavor || !Number.isFinite(quantity) || quantity <= 0) return;

  const inventoryItem = await findInventoryItemByFlavor(flavor);
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
        and(
          eq(inventoryItems.id, inventoryItem.id),
          gte(sql`${inventoryItems.onHandQuantity} - ${inventoryItems.reservedQuantity}`, quantity)
        )!
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

export async function reconcileInventoryReservationForOrderItem(args: {
  orderId: string;
  orderItemId: string;
  flavor: string;
  quantity: number;
  fromStatus: string | null | undefined;
  toStatus: string | null | undefined;
}) {
  const flavor = normalizeFlavorSlug(safeString(args.flavor, 120));
  const quantity = Number(args.quantity ?? 0);
  const fromStatus = normalizeFulfillmentStatus(args.fromStatus);
  const toStatus = normalizeFulfillmentStatus(args.toStatus);

  if (!flavor || !Number.isFinite(quantity) || quantity <= 0) return;
  if (!fromStatus || !toStatus || fromStatus === toStatus) return;

  const heldBefore = statusHoldsReservation(fromStatus);
  const heldAfter = statusHoldsReservation(toStatus);

  const consumedBefore = statusConsumesPhysicalInventory(fromStatus);
  const consumedAfter = statusConsumesPhysicalInventory(toStatus);

  let reservedDelta = 0;
  if (!heldBefore && heldAfter) reservedDelta = quantity;
  else if (heldBefore && !heldAfter) reservedDelta = -quantity;

  let onHandDelta = 0;
  if (!consumedBefore && consumedAfter) onHandDelta = -quantity;
  else if (consumedBefore && !consumedAfter) onHandDelta = quantity;

  if (reservedDelta === 0 && onHandDelta === 0) return;

  const inventoryItem = await findInventoryItemByFlavor(flavor);
  if (!inventoryItem?.id) {
    console.warn(
      "[inventory] no inventory item found for fulfillment reconciliation, flavor:",
      flavor,
      "order:",
      args.orderId,
      "orderItem:",
      args.orderItemId,
      "from:",
      fromStatus,
      "to:",
      toStatus
    );
    return;
  }

  try {
    const whereParts = [eq(inventoryItems.id, inventoryItem.id)];

    if (reservedDelta < 0) {
      whereParts.push(gte(inventoryItems.reservedQuantity, Math.abs(reservedDelta)));
    } else if (reservedDelta > 0) {
      whereParts.push(
        gte(sql`${inventoryItems.onHandQuantity} - ${inventoryItems.reservedQuantity}`, reservedDelta)
      );
    }

    if (onHandDelta < 0) {
      whereParts.push(gte(inventoryItems.onHandQuantity, Math.abs(onHandDelta)));
    }

    const updated = await db
      .update(inventoryItems)
      .set({
        onHandQuantity: sql`${inventoryItems.onHandQuantity} + ${onHandDelta}`,
        reservedQuantity: sql`${inventoryItems.reservedQuantity} + ${reservedDelta}`,
        updatedAt: new Date(),
      })
      .where(and(...whereParts)!)
      .returning({
        id: inventoryItems.id,
      });

    if (!updated?.length) {
      console.warn(
        "[inventory] fulfillment reconciliation failed for flavor:",
        flavor,
        "reservedDelta:",
        reservedDelta,
        "onHandDelta:",
        onHandDelta,
        "order:",
        args.orderId,
        "orderItem:",
        args.orderItemId,
        "from:",
        fromStatus,
        "to:",
        toStatus
      );
      return;
    }

    await db.insert(inventoryTransactions).values({
      inventoryItemId: inventoryItem.id,
      orderId: args.orderId,
      orderItemId: args.orderItemId,
      transactionType: "fulfillment",
      quantityDelta: onHandDelta,
      reservedDelta,
      note: `Fulfillment status changed ${fromStatus} -> ${toStatus} for ${flavor}`,
      metadata: {
        source: "admin_fulfillment",
        reason: "fulfillment_status_transition",
      },
    });
  } catch (e) {
    console.warn(
      "[inventory] reconcileInventoryReservationForOrderItem failed:",
      safeErrSummary(e)
    );
  }
}

// ── Wholesale inventory ────────────────────────────────────────────────────
// Wholesale orders have no rows in the DTC orders/orderItems tables, and
// inventory_transactions.order_id / order_item_id are FKs to those tables — so
// these mirror the DTC reserve/consume math but log with null DTC refs and put
// the wholesale order id in the note. Reserve on paid, consume on fulfill.

export async function reserveWholesaleInventory(args: {
  wholesaleOrderId: string;
  flavor: string;
  quantity: number;
}) {
  const flavor = resolveFlavorSlug(safeString(args.flavor, 120));
  const quantity = Number(args.quantity ?? 0);
  if (!flavor || !Number.isFinite(quantity) || quantity <= 0) return;

  const inventoryItem = await findInventoryItemByFlavor(flavor);
  if (!inventoryItem?.id) {
    console.warn("[inventory] wholesale reserve: no inventory item for flavor:", flavor, "order:", args.wholesaleOrderId);
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
        and(
          eq(inventoryItems.id, inventoryItem.id),
          gte(sql`${inventoryItems.onHandQuantity} - ${inventoryItems.reservedQuantity}`, quantity)
        )!
      )
      .returning({ id: inventoryItems.id });

    if (!updated?.length) {
      console.warn("[inventory] wholesale reserve: insufficient available qty for flavor:", flavor, "requested:", quantity, "order:", args.wholesaleOrderId);
      return;
    }

    await db.insert(inventoryTransactions).values({
      inventoryItemId: inventoryItem.id,
      orderId: null,
      orderItemId: null,
      transactionType: "reservation",
      quantityDelta: 0,
      reservedDelta: quantity,
      note: `Wholesale order reservation for ${flavor} (wholesaleOrder ${args.wholesaleOrderId})`,
      metadata: { source: "wholesale_webhook", reason: "invoice.paid" },
    });
  } catch (e) {
    console.warn("[inventory] reserveWholesaleInventory failed:", safeErrSummary(e));
  }
}

export async function consumeWholesaleInventory(args: {
  wholesaleOrderId: string;
  flavor: string;
  quantity: number;
}) {
  const flavor = resolveFlavorSlug(safeString(args.flavor, 120));
  const quantity = Number(args.quantity ?? 0);
  if (!flavor || !Number.isFinite(quantity) || quantity <= 0) return;

  const inventoryItem = await findInventoryItemByFlavor(flavor);
  if (!inventoryItem?.id) {
    console.warn("[inventory] wholesale consume: no inventory item for flavor:", flavor, "order:", args.wholesaleOrderId);
    return;
  }

  try {
    // Fulfillment consumes physical stock: release the reservation AND draw down
    // on-hand. Guard so neither goes negative (mirrors the DTC shipped transition).
    const updated = await db
      .update(inventoryItems)
      .set({
        onHandQuantity: sql`${inventoryItems.onHandQuantity} - ${quantity}`,
        reservedQuantity: sql`${inventoryItems.reservedQuantity} - ${quantity}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryItems.id, inventoryItem.id),
          gte(inventoryItems.onHandQuantity, quantity),
          gte(inventoryItems.reservedQuantity, quantity)
        )!
      )
      .returning({ id: inventoryItems.id });

    if (!updated?.length) {
      console.warn("[inventory] wholesale consume: insufficient on-hand/reserved for flavor:", flavor, "qty:", quantity, "order:", args.wholesaleOrderId);
      return;
    }

    await db.insert(inventoryTransactions).values({
      inventoryItemId: inventoryItem.id,
      orderId: null,
      orderItemId: null,
      transactionType: "fulfillment",
      quantityDelta: -quantity,
      reservedDelta: -quantity,
      note: `Wholesale fulfillment for ${flavor} (wholesaleOrder ${args.wholesaleOrderId})`,
      metadata: { source: "wholesale_fulfillment", reason: "wholesale_order_fulfilled" },
    });
  } catch (e) {
    console.warn("[inventory] consumeWholesaleInventory failed:", safeErrSummary(e));
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

    const currentAvailable = Math.max(0, currentOnHand - currentReserved);
    const nextAvailable = Math.max(0, nextOnHand - nextReserved);

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
        }${reservedDelta}, reorder ${currentReorderPoint}->${nextReorderPoint})`,
      metadata: {
        source: "admin_dashboard",
        actor: "admin",
        reason: "manual_adjustment",
        reorderPointFrom: currentReorderPoint,
        reorderPointTo: nextReorderPoint,
        quantityFrom: currentOnHand,
        quantityTo: nextOnHand,
      },
    });

    let restockEmailsAttempted = 0;
    let restockEmailsSent = 0;

    if (currentAvailable <= 0 && nextAvailable > 0 && updated.isActive) {
      try {
        const result = await sendRestockEmailsForInventoryItem({
          inventoryItemId: updated.id,
          flavor: updated.flavor,
          productName: updated.productName,
          availableQuantity: nextAvailable,
        });

        restockEmailsAttempted = result.attempted;
        restockEmailsSent = result.sent;
      } catch (e) {
        console.warn("[inventory] sendRestockEmailsForInventoryItem failed:", safeErrSummary(e));
      }
    }

    return res.json({
      ok: true,
      item: updated,
      restockEmailsAttempted,
      restockEmailsSent,
    });
  } catch (err: any) {
    const s = safeErrSummary(err);
    console.error("POST /api/admin/inventory/:id/adjust error:", s);
    return res.status(500).json({ ok: false, message: "Failed to adjust inventory." });
  }
}

// ── In-person (point-of-sale) sale ──────────────────────────────────────────
// Homie / mat-side sale: the money is collected out-of-band via Stripe Tap to
// Pay (tag that charge kimora_channel=in-person for QuickBooks). This endpoint
// only moves inventory: it draws down on-hand for the flavor and logs an
// `in_person_sale` transaction. No reservation is involved (point of sale), and
// the atomic guard sells only from AVAILABLE (unreserved) stock so units already
// reserved for paid online/wholesale orders are never oversold.
export async function recordInPersonSaleHandler(req: Request, res: Response) {
  const denied = requireAdmin(req, res);
  if (denied) return;

  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, message: "Missing id." });

    const quantity = parseInteger(req.body?.quantity) ?? 1;
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res
        .status(400)
        .json({ ok: false, message: "Quantity must be a positive whole number." });
    }

    const note = safeString(req.body?.note, 5000) || null;

    const existingRows = await db
      .select({
        id: inventoryItems.id,
        flavor: inventoryItems.flavor,
        onHandQuantity: inventoryItems.onHandQuantity,
        reservedQuantity: inventoryItems.reservedQuantity,
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
    const available = Math.max(0, currentOnHand - currentReserved);

    if (available < quantity) {
      return res.status(400).json({
        ok: false,
        message: `Not enough available stock. Available: ${available}, requested: ${quantity}.`,
      });
    }

    const updatedRows = await db
      .update(inventoryItems)
      .set({
        onHandQuantity: sql`${inventoryItems.onHandQuantity} - ${quantity}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryItems.id, id),
          gte(sql`${inventoryItems.onHandQuantity} - ${inventoryItems.reservedQuantity}`, quantity)
        )!
      )
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
      // Lost a race against a concurrent reserve/sale — available dropped below qty.
      return res.status(409).json({
        ok: false,
        message: "Stock changed before the sale could be recorded. Reload and try again.",
      });
    }

    await db.insert(inventoryTransactions).values({
      inventoryItemId: id,
      orderId: null,
      orderItemId: null,
      transactionType: "in_person_sale",
      quantityDelta: -quantity,
      reservedDelta: 0,
      note: note || `In-person sale: ${quantity} × ${existing.flavor} (collected via Tap to Pay)`,
      metadata: {
        source: "in_person_pos",
        reason: "in_person_sale",
        actor: "admin",
        quantityFrom: currentOnHand,
        quantityTo: currentOnHand - quantity,
      },
    });

    return res.json({ ok: true, item: updated });
  } catch (err: any) {
    const s = safeErrSummary(err);
    console.error("POST /api/admin/inventory/:id/in-person-sale error:", s);
    return res.status(500).json({ ok: false, message: "Failed to record in-person sale." });
  }
}