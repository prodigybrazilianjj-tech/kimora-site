// server/routes/subscriptionRoutes.ts
// (re-synced to disk 2026-06-11)
//
// In-site subscription flavor switcher.
//
// Customers reach /manage-subscription with a signed magic-link token (issued by
// portalRoutes.ts). Instead of bouncing straight to Stripe's hosted billing
// portal, the page can now read their active subscription(s) and let them swap
// the flavor in a branded, on-site flow.
//
// Mechanism: a flavor swap = changing the subscription item's Stripe price from
// STRIPE_PRICE_<OLD>_SUB_<freq>W to STRIPE_PRICE_<NEW>_SUB_<freq>W, keeping the
// same cadence. All flavors are the same price, so there is no proration; we set
// proration_behavior: "none" and leave the billing anchor untouched so the
// change takes effect on the NEXT shipment/renewal. The renewal invoice line
// carries the new price id, and stripeWebhookService.mapPriceIdToItem() derives
// the flavor to ship from that price id — so swapping the price is sufficient.

import type { Express } from "express";
import crypto from "crypto";
import { desc, eq } from "drizzle-orm";

import { stripe } from "../stripe";
import { db } from "../db";
import { orders, inventoryItems } from "../../shared/schema";

// ---------------------------------------------------------------------------
// Flavor catalog (mirror of the shop/ProductLineup definitions)
// ---------------------------------------------------------------------------

type FlavorSlug = "strawberry-guava" | "lemon-yuzu" | "raspberry-dragonfruit";

const FLAVORS: Array<{
  slug: FlavorSlug;
  name: string;
  desc: string;
  image: string;
}> = [
  {
    slug: "strawberry-guava",
    name: "Strawberry Guava",
    desc: "Tart, tropical, and refreshingly smooth.",
    image: "/assets/products/strawberry-guava/pouch.webp",
  },
  {
    slug: "lemon-yuzu",
    name: "Lemon Lychee",
    desc: "Bright lemon meets sweet, floral lychee — crisp, juicy, and refreshing.",
    image: "/assets/products/lemon-yuzu/pouch.webp",
  },
  {
    slug: "raspberry-dragonfruit",
    name: "Raspberry Dragonfruit",
    desc: "Bold, juicy, and perfectly balanced.",
    image: "/assets/products/raspberry-dragonfruit/pouch.webp",
  },
];

const FLAVOR_SLUGS = FLAVORS.map((f) => f.slug) as FlavorSlug[];
const SUB_FREQUENCIES = ["2", "4", "6"] as const;
type SubFrequency = (typeof SUB_FREQUENCIES)[number];

// ---------------------------------------------------------------------------
// Small helpers (kept self-contained; mirror portalRoutes/checkoutRoutes)
// ---------------------------------------------------------------------------

function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function slugToEnvKey(slug: string) {
  return slug.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

function safeErrSummary(err: any) {
  const message = String(err?.message || "unknown error");
  const code = err?.code || err?.cause?.code || err?.cause?.errno || err?.errno || null;
  const shortMsg = message.length > 180 ? message.slice(0, 180) + "…" : message;
  return { code, message: shortMsg };
}

function getSiteUrl() {
  return (
    process.env.PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === "production" ? "https://kimoraco.com" : "http://localhost:5173")
  );
}

function flavorMeta(slug: string) {
  return FLAVORS.find((f) => f.slug === slug) || null;
}

// price id <-> (flavor, frequency) using the same env scheme as checkout/webhook
function subPriceIdFor(flavor: FlavorSlug, frequency: SubFrequency): string | null {
  const envName = `STRIPE_PRICE_${slugToEnvKey(flavor)}_SUB_${frequency}W`;
  const priceId = process.env[envName];
  return priceId ? String(priceId) : null;
}

function mapSubPriceIdToFlavorFreq(
  priceId: string,
): { flavor: FlavorSlug; frequency: SubFrequency } | null {
  for (const flavor of FLAVOR_SLUGS) {
    for (const frequency of SUB_FREQUENCIES) {
      if (subPriceIdFor(flavor, frequency) === priceId) {
        return { flavor, frequency };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Token verification (HMAC, mirrors portalRoutes.signToken/verifyToken)
// ---------------------------------------------------------------------------

function unbase64url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function verifyToken<T>(token: string, secret: string): T | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [body, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");

  if (sig.length !== expected.length) return null;

  const ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!ok) return null;

  try {
    const payload = JSON.parse(unbase64url(body)) as T;
    const exp = (payload as any)?.exp as number | undefined;
    const now = Math.floor(Date.now() / 1000);
    if (typeof exp === "number" && now > exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Resolve the authenticated email from a request's token, or null.
 */
function emailFromToken(token: string): string | null {
  const sessionSecret = String(process.env.SESSION_SECRET ?? "").trim();
  if (!token || !sessionSecret) return null;
  const payload = verifyToken<{ email?: string }>(token, sessionSecret);
  const email = normalizeEmail(String(payload?.email ?? ""));
  if (!email || !isValidEmail(email)) return null;
  return email;
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
    console.warn("[subscription] DB customer lookup failed:", safeErrSummary(e));
  }

  try {
    const list = await stripe.customers.list({ email: normalized, limit: 1 });
    return list.data?.[0]?.id ?? null;
  } catch (e) {
    console.warn("[subscription] Stripe customer lookup failed:", safeErrSummary(e));
    return null;
  }
}

/**
 * Returns true if the flavor is explicitly inactive in inventory.
 * Missing inventory rows do NOT block (a renewal is weeks out); only an
 * explicit isActive=false blocks the swap.
 */
async function flavorIsBlocked(flavor: FlavorSlug): Promise<boolean> {
  try {
    const rows = await db
      .select({ isActive: inventoryItems.isActive })
      .from(inventoryItems)
      .where(eq(inventoryItems.flavor, flavor))
      .limit(1);
    const row = rows?.[0];
    if (!row) return false;
    return row.isActive === false;
  } catch (e) {
    console.warn("[subscription] inventory check failed:", safeErrSummary(e));
    return false; // fail open — don't block a swap on a transient DB hiccup
  }
}

// Pick the subscription item that maps to one of our flavor prices.
function findFlavorItem(sub: any): {
  itemId: string;
  priceId: string;
  flavor: FlavorSlug;
  frequency: SubFrequency;
  periodEnd: number | null;
} | null {
  const items: any[] = sub?.items?.data ?? [];
  for (const item of items) {
    const priceId = String(item?.price?.id ?? "");
    const mapped = priceId ? mapSubPriceIdToFlavorFreq(priceId) : null;
    if (mapped) {
      // In recent Stripe API versions (2025-12-15.clover) the billing period
      // lives on the subscription ITEM, not the subscription. Prefer the
      // item's current_period_end; fall back to the (legacy) sub-level field.
      const periodEnd =
        Number(item?.current_period_end ?? sub?.current_period_end) || null;
      return { itemId: String(item.id), priceId, periodEnd, ...mapped };
    }
  }
  return null;
}

function serializeSubscription(sub: any) {
  const flavorItem = findFlavorItem(sub);
  if (!flavorItem) return null;
  const meta = flavorMeta(flavorItem.flavor);
  return {
    id: String(sub.id),
    status: String(sub.status),
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    currentPeriodEnd: flavorItem.periodEnd, // unix seconds (read from item in clover API)
    frequencyWeeks: Number(flavorItem.frequency),
    currentFlavor: {
      slug: flavorItem.flavor,
      name: meta?.name ?? flavorItem.flavor,
      image: meta?.image ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Optional confirmation email (non-blocking)
// ---------------------------------------------------------------------------

async function sendFlavorChangeEmail(params: {
  email: string;
  fromName: string;
  toName: string;
  effectiveDate: string | null;
}) {
  try {
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "";
    if (!resendKey || !fromEmail) return;

    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);
    const from = fromEmail.includes("<") ? fromEmail : `Kimora Co <${fromEmail}>`;
    const supportEmail = String(process.env.SUPPORT_EMAIL || "support@kimoraco.com").trim();
    const when = params.effectiveDate ? ` on ${params.effectiveDate}` : " on your next shipment";

    const subject = `Your Kimora flavor is now ${params.toName}`;
    const text =
      `You're all set.\n\n` +
      `Your subscription flavor changed from ${params.fromName} to ${params.toName}. ` +
      `This takes effect${when} — your current order ships as-is.\n\n` +
      `Changed your mind? You can switch again anytime at ${getSiteUrl()}/manage-subscription.\n\n` +
      `Questions? Reply here or email ${supportEmail}.\n\n` +
      `Grow Stronger. Think Sharper.\n— Kimora Co`;

    await resend.emails.send({ from, to: params.email, subject, text } as any);
  } catch (e) {
    console.warn("[subscription] flavor-change email failed:", safeErrSummary(e));
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export function registerSubscriptionRoutes(app: Express) {
  // Read the customer's active subscription(s) + the flavor catalog.
  app.get("/api/subscription/state", async (req, res) => {
    try {
      const token = String((req.query as any)?.token ?? "").trim();
      const email = emailFromToken(token);
      if (!email) {
        return res.status(401).json({ ok: false, message: "Invalid or expired link." });
      }

      const customerId = await findStripeCustomerIdByEmail(email);
      if (!customerId) {
        return res.status(404).json({ ok: false, message: "No customer found for that email." });
      }

      const list = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 20,
        expand: ["data.items.data.price"],
      });

      const ACTIVE = new Set(["active", "trialing", "past_due"]);
      const subscriptions = (list.data ?? [])
        .filter((s: any) => ACTIVE.has(String(s.status)))
        .map(serializeSubscription)
        .filter(Boolean);

      return res.json({
        ok: true,
        email,
        flavors: FLAVORS,
        subscriptions,
      });
    } catch (err: any) {
      console.error("GET /api/subscription/state error:", safeErrSummary(err));
      return res.status(500).json({ ok: false, message: "Failed to load your subscription." });
    }
  });

  // Swap the flavor on a subscription. Effective next renewal (no proration).
  app.post("/api/subscription/change-flavor", async (req, res) => {
    try {
      const token = String(req.body?.token ?? "").trim();
      const email = emailFromToken(token);
      if (!email) {
        return res.status(401).json({ ok: false, message: "Invalid or expired link." });
      }

      const subscriptionId = String(req.body?.subscriptionId ?? "").trim();
      const flavor = String(req.body?.flavor ?? "").trim().toLowerCase() as FlavorSlug;

      if (!subscriptionId) {
        return res.status(400).json({ ok: false, message: "Missing subscription." });
      }
      if (!FLAVOR_SLUGS.includes(flavor)) {
        return res.status(400).json({ ok: false, message: "Unknown flavor." });
      }

      const customerId = await findStripeCustomerIdByEmail(email);
      if (!customerId) {
        return res.status(404).json({ ok: false, message: "No customer found for that email." });
      }

      // Retrieve the subscription and assert ownership (prevents IDOR).
      const sub: any = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price"],
      });
      if (!sub || String(sub.customer) !== String(customerId)) {
        return res.status(403).json({ ok: false, message: "That subscription isn't on your account." });
      }
      if (!new Set(["active", "trialing", "past_due"]).has(String(sub.status))) {
        return res.status(409).json({ ok: false, message: "This subscription isn't active." });
      }

      const flavorItem = findFlavorItem(sub);
      if (!flavorItem) {
        return res.status(409).json({
          ok: false,
          message: "We couldn't find a Kimora flavor on this subscription. Email support@kimoraco.com and we'll sort it out.",
        });
      }

      const fromMeta = flavorMeta(flavorItem.flavor);

      // No-op guard.
      if (flavorItem.flavor === flavor) {
        return res.json({
          ok: true,
          unchanged: true,
          message: `You're already subscribed to ${fromMeta?.name ?? flavorItem.flavor}.`,
        });
      }

      // Don't let customers switch INTO a discontinued flavor.
      if (await flavorIsBlocked(flavor)) {
        const meta = flavorMeta(flavor);
        return res.status(409).json({
          ok: false,
          message: `${meta?.name ?? flavor} isn't available right now. Pick another flavor or check back soon.`,
        });
      }

      // Target price = same cadence, new flavor.
      const targetPriceId = subPriceIdFor(flavor, flavorItem.frequency);
      if (!targetPriceId) {
        console.error(
          `[subscription] Missing price env for ${flavor} @ ${flavorItem.frequency}W`,
        );
        return res.status(500).json({
          ok: false,
          message: "That flavor isn't set up for your delivery frequency yet. Email support@kimoraco.com.",
        });
      }

      // Swap the item's price. No proration; billing anchor untouched, so the
      // change lands on the next renewal/shipment. Current period ships as-is.
      const updated: any = await stripe.subscriptions.update(subscriptionId, {
        items: [{ id: flavorItem.itemId, price: targetPriceId }],
        proration_behavior: "none",
        metadata: {
          ...(sub.metadata || {}),
          flavor,
          flavor_changed_at: String(Math.floor(Date.now() / 1000)),
        },
      });

      // Period end lives on the item in the clover API; re-read from the
      // updated subscription, falling back to the pre-update value.
      const updatedItem = findFlavorItem(updated);
      const effectiveUnix =
        updatedItem?.periodEnd ??
        flavorItem.periodEnd ??
        (Number(updated?.current_period_end ?? sub.current_period_end) || null);
      const effectiveDate = effectiveUnix
        ? new Date(effectiveUnix * 1000).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : null;

      const toMeta = flavorMeta(flavor);

      // Fire-and-forget confirmation email.
      void sendFlavorChangeEmail({
        email,
        fromName: fromMeta?.name ?? flavorItem.flavor,
        toName: toMeta?.name ?? flavor,
        effectiveDate,
      });

      return res.json({
        ok: true,
        unchanged: false,
        from: { slug: flavorItem.flavor, name: fromMeta?.name ?? flavorItem.flavor },
        to: { slug: flavor, name: toMeta?.name ?? flavor },
        effectiveAt: effectiveUnix,
        effectiveDate,
        message: `Your next shipment will be ${toMeta?.name ?? flavor}${
          effectiveDate ? ` (renews ${effectiveDate})` : ""
        }.`,
      });
    } catch (err: any) {
      console.error("POST /api/subscription/change-flavor error:", safeErrSummary(err));
      return res.status(500).json({ ok: false, message: "Couldn't change your flavor. Please try again." });
    }
  });
}
