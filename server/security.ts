// server/security.ts
import { createHash, timingSafeEqual } from "crypto";
import type { Request } from "express";

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

/**
 * Name of the cookie set by the internal tools gate (server/routes/toolRoutes.ts).
 * Holding a valid one of these is equivalent to presenting the token in a header.
 */
export const TOOLS_COOKIE = "kimora_tools";

/** Minimal cookie parser — avoids pulling in `cookie-parser` for one header. */
export function readCookie(req: Request, name: string): string {
  const raw = String(req.headers["cookie"] ?? "");
  if (!raw) return "";

  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    if (k !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return "";
    }
  }

  return "";
}

/**
 * Pull a bearer/admin token off a request.
 *
 * Order: `x-admin-token` header → `Authorization` header → the tools-gate cookie.
 *
 * The cookie is accepted so that the internal tool pages (which are served
 * behind the same gate) can call the API without re-prompting for the token.
 * It is set `SameSite=Strict`, so a cross-site form/fetch cannot ride it — that
 * is what keeps cookie acceptance from becoming a CSRF hole.
 */
export function bearerTokenFromRequest(req: Request): string {
  const header =
    String(req.headers["x-admin-token"] ?? "").trim() ||
    String(req.headers["authorization"] ?? "").trim();

  if (header) {
    return header.toLowerCase().startsWith("bearer ")
      ? header.slice(7).trim()
      : header;
  }

  return readCookie(req, TOOLS_COOKIE).trim();
}

/** The full-access admin token. */
export function adminToken(): string {
  return String(process.env.ADMIN_DASHBOARD_TOKEN ?? "").trim();
}

/**
 * Scoped credential for the in-person wholesale rep tool.
 *
 * Separate from ADMIN_DASHBOARD_TOKEN so a rep working the mat can create
 * wholesale invoices WITHOUT holding the token that unlocks orders, inventory,
 * waitlist and shipping. Mirrors the CERT_TOOL_PASSWORD split.
 */
export function wholesaleRepToken(): string {
  return String(process.env.WHOLESALE_REP_TOKEN ?? "").trim();
}

/** The cert-tool-only password (scoped to the resale-cert endpoints). */
export function certToolPassword(): string {
  return String(process.env.CERT_TOOL_PASSWORD ?? "").trim();
}

/** True if `presented` matches any of the configured (non-empty) secrets. */
export function matchesAny(presented: string, ...secrets: string[]): boolean {
  if (!presented) return false;
  // Compare against every configured secret (no early exit) so the work done
  // doesn't reveal which credential matched.
  let ok = false;
  for (const secret of secrets) {
    if (secret && safeTokenEqual(presented, secret)) ok = true;
  }
  return ok;
}
