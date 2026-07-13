// server/rateLimit.ts
//
// Dependency-free, in-memory per-IP rate limiter.
//
// Why not `express-rate-limit`? Adding a dependency requires an npm install,
// and this keeps the fix self-contained with zero supply-chain surface. The
// tradeoff: state is per-process and resets on deploy/restart. On a single
// Render instance that is fine. If we ever scale to multiple instances, move
// this to a Cloudflare rate-limit rule (the durable, edge-level answer) and
// delete this file.
//
// Fixed-window counter: N requests per IP per window. Cheap and predictable.

import type { Request, Response, NextFunction } from "express";

type Hit = { count: number; resetAt: number };

/**
 * Best-effort client IP.
 *
 * Render/Cloudflare put the real client IP first in x-forwarded-for. We do NOT
 * trust this for anything security-critical (it's spoofable end-to-end) — it's
 * only used to bucket abuse. Falls back to the socket address.
 */
function clientIp(req: Request): string {
  const xff = String(req.headers["x-forwarded-for"] ?? "").split(",")[0]?.trim();
  return xff || req.socket?.remoteAddress || "unknown";
}

export function rateLimit(opts: {
  windowMs: number;
  max: number;
  message?: string;
}) {
  const { windowMs, max } = opts;
  const message =
    opts.message || "Too many requests. Please wait a moment and try again.";
  const store = new Map<string, Hit>();

  // Opportunistic sweep so the map can't grow without bound.
  // (forEach rather than for..of — the tsconfig target predates downlevel Map iteration.)
  function sweep(now: number) {
    if (store.size < 5000) return;
    const expired: string[] = [];
    store.forEach((hit, key) => {
      if (hit.resetAt <= now) expired.push(key);
    });
    for (let i = 0; i < expired.length; i++) store.delete(expired[i]);
  }

  return function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const now = Date.now();
    const key = clientIp(req);

    sweep(now);

    const hit = store.get(key);

    if (!hit || hit.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    hit.count += 1;

    if (hit.count > max) {
      const retryAfterSec = Math.max(1, Math.ceil((hit.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({ ok: false, message });
    }

    return next();
  };
}

/**
 * Shared limiter presets.
 *
 * Deliberately generous — these exist to stop abuse/email-bombing, not to
 * throttle real humans. A gym owner filling out one form will never see a 429.
 */

// Public endpoints that send outbound email via Resend (waitlist, email
// capture, wholesale application). 5 per 10 minutes per IP.
export const publicEmailLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message:
    "Too many submissions from this network. Please wait a few minutes and try again.",
});

// Authenticated rep tooling that hits Stripe (invoice/reorder). Higher ceiling
// because a rep at the mat may legitimately run several orders back to back,
// but still bounded so a leaked token can't be used to blast invoices.
export const stripeWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: "Too many order submissions. Please wait a moment and try again.",
});
