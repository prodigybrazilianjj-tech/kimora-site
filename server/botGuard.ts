// server/botGuard.ts
//
// Signup-form bot defense for the two public email endpoints
// (/api/waitlist and /api/email-capture).
//
// Context: between 2026-08-01 and 2026-08-11 a distributed bot inserted 388
// addresses through /api/email-capture. Every one of them triggered an outbound
// Resend "here's your discount" email to a scraped inbox. Nothing stopped it —
// the per-IP rate limiter never fired because the traffic came from many IPs.
//
// The lesson baked into this file: per-IP limits do not protect a SENDING
// DOMAIN. Only a global ceiling does. Layers here, cheapest first:
//
//   1. Honeypot    — a field real users never see, bots fill in.
//   2. Fill timing — humans take seconds; scripts post instantly.
//   3. Origin      — the request must claim to come from our own site.
//   4. Turnstile   — optional, inert unless TURNSTILE_SECRET_KEY is set.
//   5. Breaker     — a GLOBAL cap on outbound signup emails per hour.
//
// Layers 1–4 decide "is this submission real". Layer 5 is the blast-radius cap
// that holds even when 1–4 are all fooled.

import type { Request } from "express";

/**
 * The honeypot input's name. Must match the client forms.
 *
 * Deliberately NOT "company", "website" or "phone": browsers and password
 * managers autofill those, which would silently block real people. This name
 * maps to no autofill token, but still reads as a plausible form field to a
 * bot that blind-fills every text input it finds.
 */
export const HONEYPOT_FIELD = "contact_reason";

/** The client-side render-time field. Must match the client forms. */
export const FORM_TIMESTAMP_FIELD = "formLoadedAt";

/** Minimum plausible human fill time. Under this = script. */
const MIN_FILL_MS = 2_500;

/** Beyond this the timestamp is stale (tab left open) — do not penalise it. */
const MAX_FILL_MS = 6 * 60 * 60 * 1000;

/**
 * Hosts allowed to submit these forms. Extend via ALLOWED_FORM_ORIGINS
 * (comma-separated) if a preview deploy or a new domain needs to post.
 */
function allowedHosts(): Set<string> {
  const extra = String(process.env.ALLOWED_FORM_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return new Set([
    "kimoraco.com",
    "www.kimoraco.com",
    "localhost",
    "127.0.0.1",
    ...extra,
  ]);
}

export type GuardVerdict =
  /** Looks human. Proceed. */
  | { ok: true; reason?: undefined }
  /**
   * Looks like a bot. Respond 200 OK and do NOTHING — no row, no email.
   * Silence is deliberate: an error tells the operator their script tripped a
   * check, and they iterate. A cheerful 200 tells them nothing.
   */
  | { ok: false; silent: true; reason: string }
  /** Actively refused, with a message the user is meant to read. */
  | { ok: false; silent: false; status: number; message: string; reason: string };

function hostOf(value: string): string {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Verify a Cloudflare Turnstile token.
 *
 * Returns true when Turnstile is NOT configured — the check is opt-in, so an
 * unconfigured deploy behaves exactly as it did before this file existed.
 */
async function turnstilePasses(req: Request): Promise<boolean> {
  const secret = String(process.env.TURNSTILE_SECRET_KEY ?? "").trim();
  if (!secret) return true; // not configured — skip

  const token = String((req.body as any)?.turnstileToken ?? "").trim();
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    const remoteIp = String(req.headers["cf-connecting-ip"] ?? "").trim();
    if (remoteIp) body.set("remoteip", remoteIp);

    const resp = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body },
    );
    const data: any = await resp.json();
    return Boolean(data?.success);
  } catch (err) {
    // Turnstile unreachable. Fail OPEN: a captcha outage must not take the
    // signup form down with it. The breaker below still caps the damage.
    console.error("[botGuard] turnstile verify failed, allowing through:", err);
    return true;
  }
}

/**
 * Run every "is this a real person" layer. Does not touch the breaker —
 * call takeSendSlot() separately, only once the submission is a NEW address.
 */
export async function guardPublicEmailSubmission(
  req: Request,
): Promise<GuardVerdict> {
  const body = (req.body ?? {}) as Record<string, unknown>;

  // 1. Honeypot — hidden from humans, irresistible to form-fillers.
  const honeypot = String(body[HONEYPOT_FIELD] ?? "").trim();
  if (honeypot) {
    return { ok: false, silent: true, reason: "honeypot" };
  }

  // 2. Fill timing.
  const loadedAt = Number(body[FORM_TIMESTAMP_FIELD] ?? 0);
  if (Number.isFinite(loadedAt) && loadedAt > 0) {
    const elapsed = Date.now() - loadedAt;
    // Negative elapsed = clock skew or a forged future timestamp. Both suspect.
    if (elapsed < MIN_FILL_MS && elapsed < MAX_FILL_MS) {
      return { ok: false, silent: true, reason: "too-fast" };
    }
  }

  // 3. Origin / Referer must name one of our own hosts.
  //    Absent entirely (privacy tooling, some in-app browsers) is ALLOWED —
  //    breaking real signups to catch bots is the wrong trade. Present but
  //    foreign is refused outright.
  const origin = String(req.headers.origin ?? "").trim();
  const referer = String(req.headers.referer ?? "").trim();
  const claimed = hostOf(origin) || hostOf(referer);

  if (claimed && !allowedHosts().has(claimed)) {
    return {
      ok: false,
      silent: false,
      status: 403,
      message: "This form can only be submitted from kimoraco.com.",
      reason: `foreign-origin:${claimed}`,
    };
  }

  // 4. Turnstile (no-op unless configured).
  if (!(await turnstilePasses(req))) {
    return {
      ok: false,
      silent: false,
      status: 400,
      message: "Could not verify you're human. Please refresh and try again.",
      reason: "turnstile",
    };
  }

  return { ok: true };
}

/*
GLOBAL OUTBOUND-EMAIL BREAKER

The August flood peaked at 118 new addresses in a day. A legitimate pre-launch
day is single digits. So a global hourly ceiling costs a real business nothing
and caps a bad day at a number the sending domain survives.

In-memory and per-process, exactly like server/rateLimit.ts — it resets on
deploy, which is acceptable for a single Render instance. If this ever runs on
more than one instance, move the counter to the database or to a Cloudflare
rate-limit rule and delete this block.
*/

const BREAKER_WINDOW_MS = 60 * 60 * 1000;

function maxNewSignupsPerHour(): number {
  const raw = Number(process.env.MAX_NEW_SIGNUPS_PER_HOUR ?? 60);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 60;
}

let windowStart = Date.now();
let windowCount = 0;
let breakerWarned = false;

/**
 * Claim one slot in the current hour for an outbound signup email.
 *
 * Returns false when the hour's ceiling is spent. Callers should still RECORD
 * the address (losing a real signup is worse than sending a late email) but
 * must skip the send and mark the row quarantined.
 */
export function takeSendSlot(): boolean {
  const now = Date.now();

  if (now - windowStart >= BREAKER_WINDOW_MS) {
    windowStart = now;
    windowCount = 0;
    breakerWarned = false;
  }

  if (windowCount >= maxNewSignupsPerHour()) {
    if (!breakerWarned) {
      breakerWarned = true;
      console.warn(
        `[botGuard] signup-email breaker OPEN — ${windowCount} new addresses in the last hour ` +
          `(cap ${maxNewSignupsPerHour()}). Still recording addresses; suppressing sends. ` +
          `Check /admin -> Waitlist for quarantined rows.`,
      );
    }
    return false;
  }

  windowCount += 1;
  return true;
}

/** Current breaker state, for logging or an admin readout. */
export function breakerState() {
  return {
    windowStartedAt: new Date(windowStart).toISOString(),
    used: windowCount,
    cap: maxNewSignupsPerHour(),
    open: windowCount >= maxNewSignupsPerHour(),
  };
}
