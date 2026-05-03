// server/services/analyticsService.ts
//
// Server-side Purchase tracking. Fans out to GA4 (Measurement Protocol)
// and TikTok (Events API). Stripe Checkout redirects mean there is no
// client-side purchase signal, so this is the ONLY way Purchase fires.
//
// Companion: client/src/lib/analytics.ts handles client-side ViewContent /
// AddToCart / InitiateCheckout. The two sides share an `event_id` (carried
// through Stripe session.metadata) so any echo-mode dedup works.
//
// Adding Meta later: add a third sender that POSTs to the Conversions API.

import crypto from "crypto";

// ----- Types -----

export type PurchaseItem = {
  sku: string;
  flavor: string;
  price: number; // unit price in dollars
  quantity: number;
};

export type PurchasePayload = {
  /** Stable dedup key shared with the client InitiateCheckout event. */
  eventId: string;
  /** GA4 web client_id forwarded from the browser via Stripe metadata. */
  ga4ClientId: string | null;
  /** TikTok click identifier from URL/cookie. */
  ttclid: string | null;
  /** TikTok pixel cookie. */
  ttp: string | null;
  /** Browser user-agent at begin_checkout. */
  userAgent: string | null;
  /** Server-observed client IP at begin_checkout. */
  clientIp: string | null;
  /** Customer email (raw — will be SHA-256 hashed per platform spec). */
  email: string | null;
  /** Optional phone (raw — hashed if present). */
  phone?: string | null;
  /** Total amount in dollars. */
  amount: number;
  /** ISO currency code, e.g. "USD". */
  currency: string;
  /** Internal order id, surfaced as transaction_id when available. */
  orderId?: string | number | null;
  /** Source label for logging only. */
  source: "checkout.session.completed" | "invoice.paid";
  /** Optional line items for product attribution. */
  items?: PurchaseItem[];
};

// ----- Helpers -----

function sha256LowerTrim(value: string): string {
  const normalized = String(value || "").trim().toLowerCase();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function safeNum(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeErr(err: any) {
  const message = String(err?.message || err || "unknown error");
  return message.length > 280 ? message.slice(0, 280) + "…" : message;
}

function nowUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function siteUrl(): string {
  return (
    process.env.PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://kimoraco.com"
      : "http://localhost:5173")
  );
}

// ----- GA4 sender -----

async function sendGa4Purchase(payload: PurchasePayload): Promise<void> {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;

  if (!measurementId || !apiSecret) {
    console.warn("[analytics:ga4] skipped — missing GA4_MEASUREMENT_ID or GA4_API_SECRET");
    return;
  }

  // GA4 requires a client_id. If we don't have one from the browser, derive
  // a stable synthetic one from the order/email so reporting at least has
  // a consistent user. Real attribution requires the real client_id.
  const clientId =
    payload.ga4ClientId ||
    `synthetic.${sha256LowerTrim(String(payload.email || payload.eventId)).slice(0, 16)}`;

  const items = (payload.items || []).map((it) => ({
    item_id: it.sku,
    item_name: it.flavor,
    price: Number(safeNum(it.price).toFixed(2)),
    quantity: Math.max(1, Math.floor(safeNum(it.quantity, 1))),
    currency: payload.currency || "USD",
  }));

  const body = {
    client_id: clientId,
    user_id: payload.email ? sha256LowerTrim(payload.email) : undefined,
    events: [
      {
        name: "purchase",
        params: {
          transaction_id: String(payload.orderId ?? payload.eventId),
          currency: payload.currency || "USD",
          value: Number(safeNum(payload.amount).toFixed(2)),
          event_id: payload.eventId,
          items,
        },
      },
    ],
  };

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
    measurementId,
  )}&api_secret=${encodeURIComponent(apiSecret)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GA4 MP non-2xx: ${res.status} ${text.slice(0, 200)}`);
  }
}

// ----- TikTok sender -----

async function sendTiktokPurchase(payload: PurchasePayload): Promise<void> {
  const pixelId = process.env.TIKTOK_PIXEL_ID;
  const accessToken = process.env.TIKTOK_EVENTS_TOKEN;

  if (!pixelId || !accessToken) {
    console.warn(
      "[analytics:tiktok] skipped — missing TIKTOK_PIXEL_ID or TIKTOK_EVENTS_TOKEN",
    );
    return;
  }

  const contents = (payload.items || []).map((it) => ({
    content_id: it.sku,
    content_type: "product",
    content_name: it.flavor,
    quantity: Math.max(1, Math.floor(safeNum(it.quantity, 1))),
    price: Number(safeNum(it.price).toFixed(2)),
  }));

  const user: Record<string, string> = {};
  if (payload.email) user.email = sha256LowerTrim(payload.email);
  if (payload.phone) user.phone_number = sha256LowerTrim(payload.phone);
  if (payload.ttclid) user.ttclid = payload.ttclid;
  if (payload.ttp) user.ttp = payload.ttp;
  if (payload.clientIp) user.ip = payload.clientIp;
  if (payload.userAgent) user.user_agent = payload.userAgent;

  const body = {
    event_source: "web",
    event_source_id: pixelId,
    data: [
      {
        event: "CompletePayment",
        event_time: nowUnixSeconds(),
        event_id: payload.eventId,
        user,
        properties: {
          currency: payload.currency?.toUpperCase() || "USD",
          value: Number(safeNum(payload.amount).toFixed(2)),
          content_type: "product",
          contents,
          order_id: String(payload.orderId ?? payload.eventId),
        },
        page: {
          url: `${siteUrl()}/order-success`,
        },
      },
    ],
  };

  const res = await fetch(
    "https://business-api.tiktok.com/open_api/v1.3/event/track/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": accessToken,
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TikTok Events API non-2xx: ${res.status} ${text.slice(0, 200)}`);
  }

  // TikTok returns 200 with a code != 0 on logical errors. Surface those.
  try {
    const json: any = await res.json();
    if (json && typeof json.code === "number" && json.code !== 0) {
      throw new Error(
        `TikTok Events API logical error: code=${json.code} message=${String(json.message || "").slice(0, 200)}`,
      );
    }
  } catch (parseErr: any) {
    // If parsing failed but res was OK, we still consider the call delivered.
    if (parseErr instanceof SyntaxError) {
      // ignore
    } else {
      throw parseErr;
    }
  }
}

// ----- Public API -----

/**
 * Fan out a Purchase event to every enabled platform. Each platform is
 * isolated — one failure does NOT prevent the other from firing, and
 * neither failure propagates back to the caller (which is the Stripe
 * webhook and must not return non-2xx for these reasons).
 */
export async function trackPurchase(payload: PurchasePayload): Promise<void> {
  const results = await Promise.allSettled([
    sendGa4Purchase(payload),
    sendTiktokPurchase(payload),
  ]);

  const platforms = ["ga4", "tiktok"];
  results.forEach((r, i) => {
    const name = platforms[i];
    if (r.status === "fulfilled") {
      console.log(
        `[analytics:${name}] Purchase ok — source=${payload.source} event_id=${payload.eventId} value=${payload.amount} ${payload.currency}`,
      );
    } else {
      console.error(
        `[analytics:${name}] Purchase failed — source=${payload.source} event_id=${payload.eventId}: ${safeErr(r.reason)}`,
      );
    }
  });
}
