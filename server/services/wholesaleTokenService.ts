// server/services/wholesaleTokenService.ts
import { createHmac, timingSafeEqual } from "crypto";

export type ReorderTokenPayload = {
  email: string;
  businessName: string;
  tier: string;
  unitPrice: number;
  stripeCustomerId: string;
};

function getSecret(): string {
  return (
    process.env.WHOLESALE_TOKEN_SECRET ||
    process.env.STRIPE_WEBHOOK_SECRET ||
    "dev-fallback-secret-change-in-prod"
  );
}

// Single flat gym wholesale price (6/10/2026 pricing decision): every gym
// account pays $28.99/bag — $21 COGS, 42% gym margin vs. $49.99 MSRP. The old
// tiered model ($37.49 intro / $32.49 standard / $27.49 volume) is retired.
// Existing reorder tokens carry their own locked-in unitPrice, so this only
// affects new applications and the metadata fallback.
export const WHOLESALE_UNIT_PRICE = 28.99;

export function inferUnitPrice(_tier?: string): number {
  return WHOLESALE_UNIT_PRICE;
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

    return {
      valid: true,
      payload: {
        email: String(data.email || ""),
        businessName: String(data.businessName || ""),
        tier: String(data.tier || ""),
        unitPrice: Number(data.unitPrice) || inferUnitPrice(data.tier),
        stripeCustomerId: String(data.stripeCustomerId || ""),
      },
    };
  } catch {
    return { valid: false, reason: "Invalid link." };
  }
}
