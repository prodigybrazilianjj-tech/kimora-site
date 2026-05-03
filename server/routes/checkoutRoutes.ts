// server/routes/checkoutRoutes.ts
import type { Express, Request } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";

import { stripe } from "../stripe";
import { db } from "../db";
import { orders, inventoryItems, restockAlerts } from "../../shared/schema";

type CheckoutItem = {
  flavor: string;
  type: "onetime" | "subscribe";
  frequency?: "2" | "4" | "6";
  quantity: number;
};

type InventoryFailureDetail = {
  flavor: string;
  requested: number;
  available: number;
  reason: "missing" | "inactive" | "out_of_stock" | "insufficient";
};

const RESTOCK_ALERT_PRODUCT_KEY = "creatine-electrolytes";

function slugToEnvKey(slug: string) {
  return slug.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

function normalizeFlavorSlug(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getSiteUrl() {
  return (
    process.env.PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === "production" ? "https://kimoraco.com" : "http://localhost:5173")
  );
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

function titleizeSlug(value: string | null | undefined) {
  return String(value || "")
    .split(/[-\s]+/g)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .filter(Boolean)
    .join(" ");
}

function getPriceId(item: CheckoutItem) {
  const flavorKey = slugToEnvKey(normalizeFlavorSlug(item.flavor));

  if (item.type === "onetime") {
    const envName = `STRIPE_PRICE_${flavorKey}_ONETIME`;
    const priceId = process.env[envName];
    if (!priceId) throw new Error(`Missing env var: ${envName}`);
    return priceId;
  }

  if (!item.frequency) throw new Error("Missing frequency for subscription.");
  const envName = `STRIPE_PRICE_${flavorKey}_SUB_${item.frequency}W`;
  const priceId = process.env[envName];
  if (!priceId) throw new Error(`Missing env var: ${envName}`);
  return priceId;
}

function getRequestMetadata(req: Request) {
  const forwardedFor = safeString(req.headers["x-forwarded-for"], 512);
  const ip = safeString(
    forwardedFor ? forwardedFor.split(",")[0] : req.ip || req.socket?.remoteAddress || "",
    256,
  );
  const userAgent = safeString(req.get("user-agent") || "", 1000);
  const referer = safeString(req.get("referer") || req.get("referrer") || "", 2000);

  return {
    ip: ip || null,
    userAgent: userAgent || null,
    referer: referer || null,
  };
}

/**
 * Sanitize the analytics courier bundle that travels through Stripe metadata
 * so the webhook can dedup client/server events and clear TikTok EMQ.
 *
 * Stripe metadata caps at 500 chars per value; we cap conservatively.
 */
function sanitizeAnalyticsCourier(raw: any) {
  const obj = raw && typeof raw === "object" ? raw : {};
  return {
    event_id: safeString(obj.event_id, 100),
    ga4_client_id: safeString(obj.ga4_client_id, 100),
    ttclid: safeString(obj.ttclid, 200),
    ttp: safeString(obj.ttp, 200),
    user_agent: safeString(obj.user_agent, 480),
  };
}

async function findStripeCustomerIdByEmail(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email);
  if (!normalized || !isValidEmail(normalized)) return null;

  try {
    const found = await db
      .select({ stripeCustomerId: orders.stripeCustomerId })
      .from(orders)
      .where(eq(orders.customerEmail, normalized))
      .orderBy(desc(orders.createdAt))
      .limit(1);

    const dbCustomerId = found?.[0]?.stripeCustomerId ?? null;
    if (dbCustomerId) return dbCustomerId;
  } catch (e) {
    console.warn("[checkout] DB customer lookup failed:", safeErrSummary(e));
  }

  try {
    const list = await stripe.customers.list({
      email: normalized,
      limit: 1,
    });
    return list.data?.[0]?.id ?? null;
  } catch (e) {
    console.warn("[checkout] Stripe customer lookup failed:", safeErrSummary(e));
    return null;
  }
}

async function computeCartSubtotalCentsFromStripePrices(
  lineItems: Array<{ price: string; quantity: number }>,
): Promise<number> {
  const cache = new Map<string, any>();
  let subtotal = 0;

  for (const li of lineItems) {
    const priceId = String(li.price || "").trim();
    const qty = Number(li.quantity ?? 1) || 1;
    if (!priceId || qty < 1) continue;

    let price = cache.get(priceId);
    if (!price) {
      price = await stripe.prices.retrieve(priceId);
      cache.set(priceId, price);
    }

    const unit = (price as any)?.unit_amount;
    if (typeof unit === "number" && Number.isFinite(unit)) {
      subtotal += unit * qty;
    }
  }

  return subtotal;
}

async function assertInventoryAvailableForCheckout(items: CheckoutItem[]) {
  const normalized = items
    .map((it) => ({
      flavor: normalizeFlavorSlug(safeString(it.flavor, 120)),
      quantity: Number(it.quantity ?? 0),
    }))
    .filter((it) => it.flavor && Number.isFinite(it.quantity) && it.quantity > 0);

  if (!normalized.length) return;

  const qtyByFlavor = new Map<string, number>();
  for (const item of normalized) {
    qtyByFlavor.set(item.flavor, (qtyByFlavor.get(item.flavor) || 0) + item.quantity);
  }

  const flavors = Array.from(qtyByFlavor.keys());
  if (!flavors.length) return;

  const rows = await db
    .select({
      flavor: inventoryItems.flavor,
      isActive: inventoryItems.isActive,
      onHandQuantity: inventoryItems.onHandQuantity,
      reservedQuantity: inventoryItems.reservedQuantity,
    })
    .from(inventoryItems)
    .where(inArray(inventoryItems.flavor, flavors as any));

  const byFlavor = new Map<
    string,
    {
      flavor: string;
      isActive: boolean | null;
      onHandQuantity: number | null;
      reservedQuantity: number | null;
    }
  >();

  for (const row of rows) {
    byFlavor.set(normalizeFlavorSlug(String(row.flavor || "").trim()), row);
  }

  const failures: string[] = [];
  const failureDetails: InventoryFailureDetail[] = [];

  for (const flavor of flavors) {
    const requested = qtyByFlavor.get(flavor) || 0;
    const row = byFlavor.get(flavor);

    if (!row) {
      failures.push(`${titleizeSlug(flavor)} is not currently available.`);
      failureDetails.push({
        flavor,
        requested,
        available: 0,
        reason: "missing",
      });
      continue;
    }

    if (!row.isActive) {
      failures.push(`${titleizeSlug(flavor)} is not currently active.`);
      failureDetails.push({
        flavor,
        requested,
        available: 0,
        reason: "inactive",
      });
      continue;
    }

    const onHand = Number(row.onHandQuantity ?? 0) || 0;
    const reserved = Number(row.reservedQuantity ?? 0) || 0;
    const available = Math.max(0, onHand - reserved);

    if (available < requested) {
      if (available <= 0) {
        failures.push(`${titleizeSlug(flavor)} is currently out of stock.`);
        failureDetails.push({
          flavor,
          requested,
          available,
          reason: "out_of_stock",
        });
      } else {
        failures.push(
          `Only ${available} ${titleizeSlug(flavor)} ${
            available === 1 ? "is" : "are"
          } left in stock. Please adjust your cart.`,
        );
        failureDetails.push({
          flavor,
          requested,
          available,
          reason: "insufficient",
        });
      }
    }
  }

  if (failures.length) {
    const err: any = new Error(failures.join(" "));
    err.statusCode = 409;
    err.publicMessage = failures.join(" ");
    err.inventoryFailures = failureDetails;
    throw err;
  }
}

async function saveRestockAlertsForFailedCheckout(params: {
  email: string;
  items: CheckoutItem[];
  failures: InventoryFailureDetail[];
  req: Request;
}) {
  const email = normalizeEmail(params.email);
  if (!email || !isValidEmail(email)) return 0;
  if (!params.failures.length) return 0;

  const itemsByFlavor = new Map<string, CheckoutItem>();
  for (const item of params.items) {
    const flavor = normalizeFlavorSlug(item.flavor);
    if (!flavor || itemsByFlavor.has(flavor)) continue;
    itemsByFlavor.set(flavor, item);
  }

  const metadataBase = getRequestMetadata(params.req);
  let savedCount = 0;

  for (const failure of params.failures) {
    const flavor = normalizeFlavorSlug(failure.flavor);
    if (!flavor) continue;

    const sourceItem = itemsByFlavor.get(flavor);
    const requestedQuantity = Math.max(
      1,
      Math.floor(Number(sourceItem?.quantity ?? failure.requested ?? 1) || 1),
    );

    await db
      .delete(restockAlerts)
      .where(
        and(
          eq(restockAlerts.email, email),
          eq(restockAlerts.productKey, RESTOCK_ALERT_PRODUCT_KEY),
          eq(restockAlerts.flavor, flavor),
          eq(restockAlerts.status, "pending"),
        ),
      );

    await db.insert(restockAlerts).values({
      email,
      productKey: RESTOCK_ALERT_PRODUCT_KEY,
      flavor,
      requestedQuantity,
      status: "pending",
      metadata: {
        source: "checkout",
        ...metadataBase,
        purchaseType: sourceItem?.type ?? null,
        frequency: sourceItem?.frequency ?? null,
      },
    });

    savedCount += 1;
  }

  return savedCount;
}

function buildShippingOptions(params: { currency: string; subtotalCents: number }): any[] {
  const currency = params.currency || "usd";

  const FREE_THRESHOLD_CENTS = 10000;
  const isFree = params.subtotalCents >= FREE_THRESHOLD_CENTS;

  if (isFree) {
    return [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 0, currency },
          display_name: "Free Shipping (orders $100+)",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 3 },
            maximum: { unit: "business_day", value: 7 },
          },
        },
      },
    ];
  }

  return [
    {
      shipping_rate_data: {
        type: "fixed_amount",
        fixed_amount: { amount: 500, currency },
        display_name: "Standard Shipping",
        delivery_estimate: {
          minimum: { unit: "business_day", value: 3 },
          maximum: { unit: "business_day", value: 7 },
        },
      },
    },
  ];
}

export function registerCheckoutRoutes(app: Express) {
  app.post("/api/checkout", async (req, res) => {
    try {
      const emailRaw = String(req.body?.email ?? "");
      const email = normalizeEmail(emailRaw);

      const itemsRaw: any[] = Array.isArray(req.body?.items) ? req.body.items : [];
      const items: CheckoutItem[] = itemsRaw
        .map((it: any) => {
          const flavor = normalizeFlavorSlug(String(it?.flavor ?? ""));
          const type: CheckoutItem["type"] = it?.type === "subscribe" ? "subscribe" : "onetime";
          const frequency: CheckoutItem["frequency"] | undefined =
            type === "subscribe" &&
            (it?.frequency === "2" || it?.frequency === "4" || it?.frequency === "6")
              ? it.frequency
              : undefined;
          const qRaw = Number(it?.quantity);
          const quantity = Number.isFinite(qRaw) ? Math.max(1, Math.floor(qRaw)) : 1;
          return { flavor, type, frequency, quantity };
        })
        .filter((it: CheckoutItem) => {
          if (!it.flavor) return false;
          if (it.type === "subscribe" && !it.frequency) return false;
          if (!Number.isInteger(it.quantity) || it.quantity < 1) return false;
          return true;
        });

      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ message: "Valid email is required." });
      }
      if (!items.length) {
        return res.status(400).json({ message: "Cart is empty." });
      }

      const hasSub = items.some((it: CheckoutItem) => it.type === "subscribe");
      const hasOne = items.some((it: CheckoutItem) => it.type === "onetime");
      if (hasSub && hasOne) {
        return res.status(400).json({
          message: "Subscriptions and one-time items must be checked out separately.",
        });
      }

      await assertInventoryAvailableForCheckout(items);

      const siteUrl = getSiteUrl();
      const successUrl = `${siteUrl}/order-success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${siteUrl}/checkout?canceled=1`;

      const mode: "payment" | "subscription" = hasSub ? "subscription" : "payment";

      const line_items = items.map((it: CheckoutItem) => ({
        price: getPriceId(it),
        quantity: it.quantity,
      }));

      const currency = "usd";
      const subtotalCents =
        mode === "payment" ? await computeCartSubtotalCentsFromStripePrices(line_items) : 0;

      const shipping_options =
        mode === "payment" ? buildShippingOptions({ currency, subtotalCents }) : undefined;

      const existingCustomerId = await findStripeCustomerIdByEmail(email);

      // Analytics courier — travels through Stripe metadata so the webhook
      // can fire server-side Purchase deduped against the client-side
      // begin_checkout/InitiateCheckout. See server/services/analyticsService.ts.
      const analyticsCourier = sanitizeAnalyticsCourier(req.body?.analytics);
      // Capture server-observed IP/UA as a safety net — TikTok Events API
      // matching uses these even if the client didn't supply UA.
      const serverObserved = getRequestMetadata(req);
      const courierMetadata: Record<string, string> = {
        kimora_event_id: analyticsCourier.event_id,
        kimora_ga4_client_id: analyticsCourier.ga4_client_id,
        kimora_ttclid: analyticsCourier.ttclid,
        kimora_ttp: analyticsCourier.ttp,
        kimora_user_agent:
          analyticsCourier.user_agent || (serverObserved.userAgent ?? ""),
        kimora_client_ip: serverObserved.ip ?? "",
      };
      // Strip empty values so we don't waste Stripe's 50-key budget.
      for (const k of Object.keys(courierMetadata)) {
        if (!courierMetadata[k]) delete courierMetadata[k];
      }

      const sessionParams: any = {
        mode,
        line_items,
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: false,
        shipping_address_collection: { allowed_countries: ["US"] },
        phone_number_collection: { enabled: true },
        automatic_tax: { enabled: true },
        metadata: courierMetadata,
      };

      if (analyticsCourier.event_id) {
        // Surface in Stripe dashboard + an extra place for the webhook to read.
        sessionParams.client_reference_id = analyticsCourier.event_id;
      }

      if (mode === "payment") {
        sessionParams.shipping_options = shipping_options;
      } else {
        // Mirror to the resulting subscription so the FIRST invoice.paid
        // (which fires for the initial subscription charge) can read it.
        sessionParams.subscription_data = {
          metadata: courierMetadata,
        };
      }

      if (existingCustomerId) {
        sessionParams.customer = existingCustomerId;
        sessionParams.customer_update = {
          address: "auto",
          name: "auto",
          shipping: "auto",
        };
      } else {
        sessionParams.customer_email = email;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      return res.json({ url: (session as any).url });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("POST /api/checkout error:", s);

      const publicMessage =
        err?.publicMessage ||
        err?.raw?.message ||
        err?.message ||
        "Failed to create checkout session.";

      if (String(publicMessage).startsWith("Missing env var:")) {
        return res.status(500).json({ message: publicMessage });
      }

      if (Number(err?.statusCode) === 409) {
        let restockAlertsSaved = 0;

        try {
          const email = normalizeEmail(String(req.body?.email ?? ""));
          const itemsRaw: any[] = Array.isArray(req.body?.items) ? req.body.items : [];
          const items: CheckoutItem[] = itemsRaw
            .map((it: any) => {
              const flavor = normalizeFlavorSlug(String(it?.flavor ?? ""));
              const type: CheckoutItem["type"] =
                it?.type === "subscribe" ? "subscribe" : "onetime";
              const frequency: CheckoutItem["frequency"] | undefined =
                type === "subscribe" &&
                (it?.frequency === "2" || it?.frequency === "4" || it?.frequency === "6")
                  ? it.frequency
                  : undefined;
              const qRaw = Number(it?.quantity);
              const quantity = Number.isFinite(qRaw) ? Math.max(1, Math.floor(qRaw)) : 1;
              return { flavor, type, frequency, quantity };
            })
            .filter((it: CheckoutItem) => {
              if (!it.flavor) return false;
              if (it.type === "subscribe" && !it.frequency) return false;
              if (!Number.isInteger(it.quantity) || it.quantity < 1) return false;
              return true;
            });

          const failures: InventoryFailureDetail[] = Array.isArray(err?.inventoryFailures)
            ? err.inventoryFailures
            : [];

          restockAlertsSaved = await saveRestockAlertsForFailedCheckout({
            email,
            items,
            failures,
            req,
          });
        } catch (restockErr) {
          console.warn("[checkout] Failed to save restock alerts:", safeErrSummary(restockErr));
        }

        return res.status(409).json({
          message: publicMessage,
          restockAlertSaved: restockAlertsSaved > 0,
          restockAlertCount: restockAlertsSaved,
        });
      }

      return res.status(500).json({
        message: publicMessage,
        code: err?.code || err?.raw?.code || undefined,
        type: err?.type || err?.raw?.type || undefined,
      });
    }
  });

  app.get("/api/checkout/session", async (req, res) => {
    try {
      const sessionId = String(req.query?.session_id ?? "").trim();
      if (!sessionId) {
        return res.status(400).json({ message: "session_id is required" });
      }

      const session: any = await stripe.checkout.sessions.retrieve(sessionId);

      return res.json({
        id: session.id,
        mode: session.mode,
        customer_email: session.customer_details?.email ?? session.customer_email ?? null,
        payment_status: session.payment_status ?? null,
        subscription: session.subscription ?? null,
      });
    } catch (err: any) {
      const s = safeErrSummary(err);
      console.error("GET /api/checkout/session error:", s);
      return res.status(500).json({ message: "Failed to load session" });
    }
  });
}
