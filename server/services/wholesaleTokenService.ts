// server/services/wholesaleTokenService.ts
import { createHmac, timingSafeEqual } from "crypto";

export type ReorderLineItem = {
  name: string;
  flavor?: string;
  qty: number;
};

export type ReorderTokenPayload = {
  email: string;
  businessName: string;
  tier: string;
  unitPrice: number;
  stripeCustomerId: string;
  // Account-controlled fields baked into the signed token at generation time.
  // The gym cannot edit these from the reorder page — the server reads them
  // from the token, never from the client request body.
  lastOrder?: ReorderLineItem[]; // snapshot of the last paid order, for pre-fill
  taxRate?: number;              // 0 = resale-exempt (cert on file)
  paymentTerms?: string;         // e.g. "Net 15", carried from the original order
};

function getSecret(): string {
  return (
    process.env.WHOLESALE_TOKEN_SECRET ||
    process.env.STRIPE_WEBHOOK_SECRET ||
    "dev-fallback-secret-change-in-prod"
  );
}

// Single flat gym wholesale price (8/13/2026 reprice, was $28.99 from 6/10):
// every gym account pays $31.00/bag — gym keeps $18.99/bag vs. the $49.99 MSRP
// shelf, or $29.00/bag when the pouch is broken into 30 single sticks at $2 on
// the free counter display. The old tiered model ($37.49 intro / $32.49
// standard / $27.49 volume) is retired. Existing reorder tokens carry their own
// locked-in unitPrice, so this only affects new applications and the metadata
// fallback.
export const WHOLESALE_UNIT_PRICE = 31.0;

export function inferUnitPrice(_tier?: string): number {
  return WHOLESALE_UNIT_PRICE;
}

// Gym orders ship in CASES, never loose bags (locked 8/26/2026). A case is 12
// pouches / 360 sticks = $372.00 at the flat $31 wholesale price. The gym keeps
// $227.88 selling them whole at the $49.99 shelf, or $348.00 broken into $2
// singles off the counter display. Validation is on the ORDER TOTAL, not per
// flavor — a gym may split one case across flavors (the MAT close is "a first PO
// of 12 pouches mixed flavors"). DTC / subscription / Amazon are single pouches
// and are NOT subject to this rule.
export const CASE_SIZE = 12;
export const CASE_PRICE = WHOLESALE_UNIT_PRICE * CASE_SIZE;

export function isWholeCaseOrder(totalQty: number): boolean {
  return Number.isInteger(totalQty) && totalQty > 0 && totalQty % CASE_SIZE === 0;
}

/** Total bags across line items, rounded the same way the invoice paths round. */
export function totalQtyOf(lineItems: Array<{ qty: number | string }>): number {
  return lineItems.reduce((s, l) => s + Math.max(0, Math.round(Number(l.qty) || 0)), 0);
}

/** null when valid; otherwise a gym-readable message. */
export function caseQuantityError(lineItems: Array<{ qty: number | string }>): string | null {
  const total = totalQtyOf(lineItems);
  if (total <= 0) return "Add at least one product.";
  if (isWholeCaseOrder(total)) return null;
  const cases = Math.floor(total / CASE_SIZE);
  const up = (cases + 1) * CASE_SIZE;
  return `Orders ship in full cases of ${CASE_SIZE}. That's ${total} bags — use ${cases > 0 ? `${cases * CASE_SIZE} or ` : ""}${up}.`;
}

export function generateReorderToken(payload: ReorderTokenPayload): string {
  const data = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
  };
  const b64 = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export type TokenValidResult =
  | { valid: true; payload: ReorderTokenPayload }
  | { valid: false; reason: string };

export function validateReorderToken(raw: string): TokenValidResult {
  try {
    const parts = String(raw || "").split(".");
    if (parts.length !== 2) return { valid: false, reason: "Malformed link." };

    const [b64, sig] = parts;
    const expected = createHmac("sha256", getSecret()).update(b64).digest("base64url");

    const sigBuf = Buffer.from(sig, "base64url");
    const expBuf = Buffer.from(expected, "base64url");

    if (
      sigBuf.length !== expBuf.length ||
      !timingSafeEqual(sigBuf, expBuf)
    ) {
      return { valid: false, reason: "Invalid link." };
    }

    const data = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));

    if (typeof data.exp === "number" && data.exp < Math.floor(Date.now() / 1000)) {
      return {
        valid: false,
        reason: "This reorder link has expired. Contact Kimora Co. for a fresh one.",
      };
    }

    const lastOrder: ReorderLineItem[] = (Array.isArray(data.lastOrder) ? data.lastOrder : [])
      .map((l: any) => ({
        name: String(l?.name || "").slice(0, 120),
        flavor: l?.flavor ? String(l.flavor).slice(0, 120) : undefined,
        qty: Math.max(0, Math.trunc(Number(l?.qty) || 0)),
      }))
      .filter((l: ReorderLineItem) => l.name && l.qty > 0)
      .slice(0, 20);

    const taxRate = Number.isFinite(Number(data.taxRate)) ? Math.max(0, Number(data.taxRate)) : 0;

    return {
      valid: true,
      payload: {
        email: String(data.email || ""),
        businessName: String(data.businessName || ""),
        tier: String(data.tier || ""),
        unitPrice: Number(data.unitPrice) || inferUnitPrice(data.tier),
        stripeCustomerId: String(data.stripeCustomerId || ""),
        lastOrder,
        taxRate,
        paymentTerms: String(data.paymentTerms || ""),
      },
    };
  } catch {
    return { valid: false, reason: "Invalid link." };
  }
}
