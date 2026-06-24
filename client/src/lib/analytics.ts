// client/src/lib/analytics.ts
//
// Thin analytics facade. One call site (`track(eventName, payload)`) fans
// out to per-platform handlers (GA4 + TikTok + Meta).
//
// Adding another platform is a single registerHandler() call below —
// no call sites need to change.
//
// Companion: server/services/analyticsService.ts handles server-side
// Purchase via Measurement Protocol (GA4) + Events API (TikTok) +
// Conversions API (Meta).

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    ttq?: any;
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

// ---------- Canonical event names + payload shape ----------

export type CanonicalEventName =
  | "view_item"
  | "add_to_cart"
  | "begin_checkout";

export type AnalyticsItem = {
  /** Stable SKU — e.g. "lemon-lychee-sub-monthly" or "lemon-lychee-onetime" */
  sku: string;
  /** Display name — e.g. "Lemon Lychee" */
  flavor: string;
  /** Unit price in USD */
  price: number;
  /** Quantity (defaults to 1) */
  quantity?: number;
};

export type AnalyticsPayload = {
  items: AnalyticsItem[];
  /** Total value of the event (sum of price*qty by default) */
  value?: number;
  /** Defaults to "USD" */
  currency?: string;
  /** Optional purchase type for downstream reporting */
  purchaseType?: "onetime" | "subscribe";
  /** Optional event_id for client/server dedup. If omitted, auto-generated. */
  eventId?: string;
};

// ---------- Handler interface ----------

export type AnalyticsHandler = {
  name: string;
  isEnabled: () => boolean;
  init?: () => void;
  track: (eventName: CanonicalEventName, payload: AnalyticsPayload, eventId: string) => void;
};

const handlers: AnalyticsHandler[] = [];

export function registerHandler(handler: AnalyticsHandler) {
  handlers.push(handler);
}

// ---------- Utilities ----------

function safeWarn(scope: string, err: unknown) {
  // Never let analytics break the page.
  // eslint-disable-next-line no-console
  console.warn(`[analytics:${scope}]`, err);
}

export function generateEventId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  // RFC4122-ish fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function readUrlParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return new URL(window.location.href).searchParams.get(name);
  } catch {
    return null;
  }
}

/**
 * GA4 client_id is async (gtag callback). Resolves to null if gtag isn't
 * loaded or the call times out.
 */
export function getGa4ClientId(timeoutMs = 1500): Promise<string | null> {
  const measurementId = (import.meta as any).env?.VITE_GA4_MEASUREMENT_ID as
    | string
    | undefined;

  if (!measurementId || typeof window === "undefined" || !window.gtag) {
    return Promise.resolve(null);
  }

  // Capture into a local so TS narrowing survives into the closure below.
  const gtag = window.gtag;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = window.setTimeout(() => finish(null), timeoutMs);

    try {
      gtag("get", measurementId, "client_id", (clientId: string) => {
        window.clearTimeout(timer);
        finish(clientId || null);
      });
    } catch (err) {
      window.clearTimeout(timer);
      safeWarn("ga4-clientid", err);
      finish(null);
    }
  });
}

/** TikTok click identifier from URL or cookie. */
export function getTtclid(): string | null {
  const fromUrl = readUrlParam("ttclid");
  if (fromUrl) return fromUrl;
  return readCookie("ttclid");
}

/** TikTok pixel cookie set by ttq when the base pixel loads. */
export function getTtp(): string | null {
  return readCookie("_ttp");
}

/**
 * Meta click identifier. Per Meta CAPI spec, when present in the URL the
 * value must be encoded as `fb.<subdomain_index>.<creation_time>.<fbclid>`
 * before being sent server-side. Browser-side, fbq's auto-cookie does this
 * for us and stashes it in `_fbc`. We return the cookie if present, or
 * synthesize the canonical string from a raw `?fbclid=` param if not.
 */
export function getFbc(): string | null {
  const cookie = readCookie("_fbc");
  if (cookie) return cookie;

  const fbclid = readUrlParam("fbclid");
  if (!fbclid) return null;

  // subdomain_index = 1 for kimoraco.com (root domain only, no www split)
  return `fb.1.${Date.now()}.${fbclid}`;
}

/** Meta browser identifier cookie set by fbq when the base pixel loads. */
export function getFbp(): string | null {
  return readCookie("_fbp");
}

/** Snapshot the cross-redirect context bundle that has to land in Stripe metadata. */
export async function getCheckoutContext(eventId: string) {
  const [ga4ClientId] = await Promise.all([getGa4ClientId()]);
  return {
    event_id: eventId,
    ga4_client_id: ga4ClientId || "",
    ttclid: getTtclid() || "",
    ttp: getTtp() || "",
    fbc: getFbc() || "",
    fbp: getFbp() || "",
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  };
}

function deriveValue(payload: AnalyticsPayload): number {
  if (typeof payload.value === "number" && Number.isFinite(payload.value)) {
    return Number(payload.value.toFixed(2));
  }
  const sum = payload.items.reduce(
    (acc, it) => acc + Number(it.price || 0) * Number(it.quantity ?? 1),
    0
  );
  return Number(sum.toFixed(2));
}

// ---------- GA4 handler ----------

const ga4Handler: AnalyticsHandler = {
  name: "ga4",
  isEnabled: () => Boolean((import.meta as any).env?.VITE_GA4_MEASUREMENT_ID),
  track(eventName, payload, eventId) {
    if (typeof window === "undefined" || !window.gtag) return;

    const currency = payload.currency || "USD";
    const value = deriveValue(payload);

    const items = payload.items.map((it) => ({
      item_id: it.sku,
      item_name: it.flavor,
      price: Number(it.price.toFixed(2)),
      quantity: it.quantity ?? 1,
      currency,
    }));

    try {
      window.gtag("event", eventName, {
        currency,
        value,
        items,
        event_id: eventId,
      });
    } catch (err) {
      safeWarn("ga4", err);
    }
  },
};

// ---------- TikTok handler ----------

const tiktokEventMap: Record<CanonicalEventName, string> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
};

const tiktokHandler: AnalyticsHandler = {
  name: "tiktok",
  isEnabled: () => Boolean((import.meta as any).env?.VITE_TIKTOK_PIXEL_ID),
  track(eventName, payload, eventId) {
    if (typeof window === "undefined" || !window.ttq) return;

    const currency = payload.currency || "USD";
    const value = deriveValue(payload);

    const contents = payload.items.map((it) => ({
      content_id: it.sku,
      content_name: it.flavor,
      content_type: "product",
      quantity: it.quantity ?? 1,
      price: Number(it.price.toFixed(2)),
    }));

    try {
      window.ttq.track(
        tiktokEventMap[eventName],
        {
          contents,
          content_type: "product",
          currency,
          value,
        },
        { event_id: eventId }
      );
    } catch (err) {
      safeWarn("tiktok", err);
    }
  },
};

// ---------- Meta handler ----------

const metaEventMap: Record<CanonicalEventName, string> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
};

const metaHandler: AnalyticsHandler = {
  name: "meta",
  isEnabled: () => Boolean((import.meta as any).env?.VITE_META_PIXEL_ID),
  track(eventName, payload, eventId) {
    if (typeof window === "undefined" || !window.fbq) return;

    const currency = payload.currency || "USD";
    const value = deriveValue(payload);

    const contentIds = payload.items.map((it) => it.sku);
    const contents = payload.items.map((it) => ({
      id: it.sku,
      quantity: it.quantity ?? 1,
      item_price: Number(it.price.toFixed(2)),
    }));

    try {
      window.fbq(
        "track",
        metaEventMap[eventName],
        {
          content_ids: contentIds,
          content_type: "product",
          contents,
          currency,
          value,
        },
        // eventID — exactly as Meta spec defines, NOT event_id. Used for
        // dedup against the server-side Conversions API Purchase.
        { eventID: eventId }
      );
    } catch (err) {
      safeWarn("meta", err);
    }
  },
};

registerHandler(ga4Handler);
registerHandler(tiktokHandler);
registerHandler(metaHandler);

// ---------- Public API ----------

/**
 * Fire an analytics event across every enabled handler.
 *
 * @param eventName  Canonical event name. Each handler maps internally.
 * @param payload    Items + value + currency.
 * @param eventId    Optional override. If omitted, a UUID is generated and returned.
 * @returns          The event_id used (so callers like begin_checkout can persist it).
 */
export function track(
  eventName: CanonicalEventName,
  payload: AnalyticsPayload,
  eventId?: string
): string {
  const id = eventId || payload.eventId || generateEventId();
  for (const h of handlers) {
    if (!h.isEnabled()) continue;
    try {
      h.track(eventName, payload, id);
    } catch (err) {
      safeWarn(h.name, err);
    }
  }
  return id;
}

// Surface for debugging from devtools console
if (typeof window !== "undefined") {
  (window as any).__kimoraAnalytics = { track, handlers };
}
