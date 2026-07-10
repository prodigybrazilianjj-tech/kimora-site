// server/security.ts
import { createHash, timingSafeEqual } from "crypto";

/**
 * Constant-time comparison for secret tokens/passwords.
 *
 * Both sides are SHA-256 hashed to fixed 32-byte buffers before comparison, so:
 *  - `timingSafeEqual` never throws on length mismatch, and
 *  - the comparison time does not leak the secret's length or content.
 *
 * Returns false for empty/missing values.
 */
export function safeTokenEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ha = createHash("sha256").update(String(a)).digest();
  const hb = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}
