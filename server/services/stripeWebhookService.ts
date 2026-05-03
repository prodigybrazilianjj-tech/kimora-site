// server/services/stripeWebhookService.ts
import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { generateReorderToken, inferUnitPrice } from "./wholesaleTokenService";

import { stripe } from "../stripe";
import { db } from "../db";
import { orders, orderItems, wholesaleOrders } from "../../shared/schema";
import { applyInventoryForOrderItem } from "./inventoryService";
import {
  sendOrderConfirmationEmail,
  getStripeCustomerIdFromCheckoutSession,
} from "./emailService";
import { trackPurchase, type PurchaseItem } from "./analyticsService";

/**
 * Pull our analytics courier fields out of a Stripe metadata bag.
 * Returns null-ish strings when missing so the analytics service can decide
 * whether to fall back to synthetic identifiers.
 */
function readAnalyticsCourier(meta: Record<string, string> | null | undefined) {
  const m = meta || {};
  return {
    eventId: String(m.kimora_event_id || "").trim() || "",
    ga4ClientId: String(m.kimora_ga4_client_id || "").trim() || null,
    ttclid: String(m.kimora_ttclid || "").trim() || null,
    ttp: String(m.kimora_ttp || "").trim() || null,
    userAgent: String(m.kimora_user_agent || "").trim() || null,
    clientIp: String(m.kimora_client_ip || "").trim() || null,
  };
}

function lineItemsToPurchaseItems(lineItems: any[]): PurchaseItem[] {
  return (lineItems || []).map((li: any) => {
    const flavor =
      li?.description ||
      li?.price?.product?.name ||
      li?.price?.nickname ||
      li?.price?.id ||
      "item";
    const unitAmount = Number(li?.price?.unit_amount ?? 0);
    const qty = Math.max(1, Math.floor(Number(li?.quantity ?? 1)));
    return {
      sku: String(li?.price?.id || flavor),
      flavor: String(flavor),
      price: Number((unitAmount / 100).toFixed(2)),
      quantity: qty,
    };
  });
}

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

function safeErrSummary(err: any) {
  const message = String(err?.message || "unknown error");
  const code = err?.code || err?.cause?.code || err?.cause?.errno || err?.errno || null;
  const shortMsg = message.length > 180 ? message.slice(0, 180) + "…" : message;
  return { code, message: shortMsg };
}

function envPriceId(
  flavor: string,
  type: "onetime" | "subscribe",
  frequency?: "2" | "4" | "6"
) {
  const flavorKey = slugToEnvKey(normalizeFlavorSlug(flavor));
  const envName =
    type === "onetime"
      ? `STRIPE_PRICE_${flavorKey}_ONETIME`
      : `STRIPE_PRICE_${flavorKey}_SUB_${frequency}W`;

  return process.env[envName] || null;
}

function mapPriceIdToItem(priceId: string): {
  flavor: string;
  purchaseType: "onetime" | "subscribe";
  frequencyWeeks: number | null;
} {
  const flavors = ["strawberry-guava", "lemon-yuzu", "raspberry-dragonfruit"] as const;

  for (const flavor of flavors) {
    const onetime = envPriceId(flavor, "onetime");
    if (onetime === priceId) {
      return { flavor, purchaseType: "onetime", frequencyWeeks: null };
    }

    for (const f of ["2", "4", "6"] as const) {
      const sub = envPriceId(flavor, "subscribe", f);
      if (sub === priceId) {
        return { flavor, purchaseType: "subscribe", frequencyWeeks: Number(f) };
      }
    }
  }

  return { flavor: "unknown", purchaseType: "onetime", frequencyWeeks: null };
}

async function resolveShippingForSession(sessionId: string, sessionLike?: any) {
  try {
    const full: any = await stripe.checkout.sessions.retrieve(sessionId);

    const shippingName =
      full?.shipping_details?.name ?? (sessionLike as any)?.shipping_details?.name ?? null;

    const shippingAddress =
      full?.shipping_details?.address ?? (sessionLike as any)?.shipping_details?.address ?? null;

    if (shippingName || shippingAddress) {
      return { shippingName, shippingAddress };
    }

    const piId =
      (typeof full?.payment_intent === "string" ? full.payment_intent : null) ||
      (typeof (sessionLike as any)?.payment_intent === "string"
        ? (sessionLike as any).payment_intent
        : null);

    if (piId) {
      const pi: any = await stripe.paymentIntents.retrieve(
        piId,
        {
          expand: ["latest_charge"],
        } as any
      );

      const ch: any = pi?.latest_charge ?? null;
      const chShipping = ch?.shipping ?? null;

      if (chShipping?.name || chShipping?.address) {
        return {
          shippingName: chShipping?.name ?? null,
          shippingAddress: chShipping?.address ?? null,
        };
      }
    }

    return { shippingName: null, shippingAddress: null };
  } catch (e) {
    console.warn("[shipping] resolveShippingForSession failed:", safeErrSummary(e));
    return { shippingName: null, shippingAddress: null };
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  const resolvedShipping = await resolveShippingForSession(String(session.id), session);
  const stripeCustomerId = await getStripeCustomerIdFromCheckoutSession(session);
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });

  const inserted = await db
    .insert(orders)
    .values({
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: session.payment_intent ?? null,
      stripeSubscriptionId: session.subscription ?? null,
      stripeCustomerId,
      customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
      currency: session.currency ?? "usd",
      amountSubtotal: session.amount_subtotal ?? null,
      amountTotal: session.amount_total ?? null,
      isSubscription: session.mode === "subscription",
      status: session.payment_status || "paid",
      shippingName: resolvedShipping.shippingName ?? null,
      shippingAddress: resolvedShipping.shippingAddress ?? null,
    })
    .onConflictDoNothing({
      target: orders.stripeCheckoutSessionId,
    })
    .returning({ id: orders.id });

  let orderId = inserted?.[0]?.id;

  if (!orderId) {
    const existing = await db
      .select({
        id: orders.id,
        shippingName: orders.shippingName,
        shippingAddress: orders.shippingAddress,
      })
      .from(orders)
      .where(eq(orders.stripeCheckoutSessionId, session.id))
      .limit(1);

    orderId = existing?.[0]?.id;

    const hadName = Boolean(existing?.[0]?.shippingName);
    const hadAddr = Boolean(existing?.[0]?.shippingAddress);

    if (
      (!hadName || !hadAddr) &&
      (resolvedShipping.shippingName || resolvedShipping.shippingAddress)
    ) {
      await db
        .update(orders)
        .set({
          shippingName: resolvedShipping.shippingName ?? existing?.[0]?.shippingName ?? null,
          shippingAddress:
            resolvedShipping.shippingAddress ?? existing?.[0]?.shippingAddress ?? null,
        })
        .where(eq(orders.stripeCheckoutSessionId, session.id));
    }

    if (stripeCustomerId) {
      await db
        .update(orders)
        .set({ stripeCustomerId })
        .where(eq(orders.stripeCheckoutSessionId, session.id));
    }
  }

  const wasNewInsert = Boolean(inserted?.length);

  if (orderId) {
    for (const li of lineItems.data) {
      const priceId = li.price?.id ?? null;
      const qty = li.quantity ?? 1;

      const mapped = priceId
        ? mapPriceIdToItem(String(priceId))
        : {
            flavor: "unknown",
            purchaseType: "onetime" as const,
            frequencyWeeks: null,
          };

      const insertedOrderItem = await db
        .insert(orderItems)
        .values({
          orderId,
          stripePriceId: priceId,
          stripeLineItemId: li.id ?? null,
          flavor: mapped.flavor,
          purchaseType: mapped.purchaseType,
          frequencyWeeks: mapped.frequencyWeeks,
          quantity: qty,
          unitAmount: li.price?.unit_amount ?? null,
          fulfillmentStatus: "unfulfilled",
          carrier: null,
          trackingNumber: null,
          shippedAt: null,
          deliveredAt: null,
        })
        .onConflictDoNothing()
        .returning({ id: orderItems.id });

      if (wasNewInsert && insertedOrderItem?.[0]?.id) {
        await applyInventoryForOrderItem({
          orderId,
          orderItemId: insertedOrderItem[0].id,
          flavor: mapped.flavor,
          quantity: qty,
        });
      }
    }
  }

  if (wasNewInsert) {
    await sendOrderConfirmationEmail({
      session,
      lineItems: lineItems.data,
      isSubscription: session.mode === "subscription" || Boolean(session.subscription),
    });
  }

  // Server-side Purchase fan-out (GA4 MP + TikTok Events API). Only fire on
  // a NEW order so retries / duplicate webhook deliveries don't double-count.
  if (wasNewInsert) {
    try {
      const courier = readAnalyticsCourier(session.metadata);
      const customerEmail =
        session.customer_details?.email ?? session.customer_email ?? null;
      const amountTotal = Number(session.amount_total ?? 0);
      const currency = String(session.currency || "usd").toUpperCase();

      await trackPurchase({
        eventId: courier.eventId || `cs_${session.id}`,
        ga4ClientId: courier.ga4ClientId,
        ttclid: courier.ttclid,
        ttp: courier.ttp,
        userAgent: courier.userAgent,
        clientIp: courier.clientIp,
        email: customerEmail,
        phone: session.customer_details?.phone ?? null,
        amount: amountTotal / 100,
        currency,
        orderId: orderId ?? null,
        source: "checkout.session.completed",
        items: lineItemsToPurchaseItems(lineItems.data),
      });
    } catch (analyticsErr: any) {
      // Already logged inside the service; never let analytics break the
      // webhook response (Stripe will retry the whole event otherwise).
      console.error(
        "[webhook] Purchase fan-out unexpected error:",
        safeErrSummary(analyticsErr),
      );
    }
  }

  return {
    ok: true as const,
    orderId: orderId ?? null,
    insertedOrder: wasNewInsert,
  };
}

export async function processStripeWebhook(rawBody: Buffer, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    const err: any = new Error("Missing STRIPE_WEBHOOK_SECRET");
    err.statusCode = 500;
    throw err;
  }

  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any;

      const result = await handleCheckoutSessionCompleted(session);

      return {
        received: true as const,
        eventId: event.id,
        eventType: event.type,
        ...result,
      };
    }

    case "invoice.paid": {
      const invoice = event.data.object as any;

      // ── Server-side Purchase fan-out for wholesale + sub renewals ──────
      //
      // Skip subscription_create — that path also fires checkout.session.completed
      // for the same revenue, and we already track Purchase there with the
      // proper analytics courier metadata. Tracking here too would double-count.
      const billingReason = String(invoice.billing_reason || "");
      const isSubscriptionCreate = billingReason === "subscription_create";
      const isWholesale = invoice.metadata?.source === "kimora-wholesale-sheet";

      if (!isSubscriptionCreate) {
        try {
          // For renewals, try to pull the analytics courier off the subscription
          // (we attached it as subscription_data.metadata at checkout). It may
          // be empty for old subs created before this code shipped — that's fine.
          let courierMetadata: Record<string, string> | null = null;
          if (invoice.subscription && typeof invoice.subscription === "string") {
            try {
              const sub: any = await stripe.subscriptions.retrieve(invoice.subscription);
              courierMetadata = (sub?.metadata as Record<string, string>) || null;
            } catch (subErr) {
              console.warn(
                "[webhook] subscription metadata fetch failed:",
                safeErrSummary(subErr),
              );
            }
          }

          const courier = readAnalyticsCourier(courierMetadata);
          const customerEmail = invoice.customer_email || null;
          const amountPaidCents = Number(invoice.amount_paid ?? 0);
          const currency = String(invoice.currency || "usd").toUpperCase();

          // Build items from the invoice line items (description + amount).
          const invoiceItems: PurchaseItem[] = Array.isArray(invoice.lines?.data)
            ? invoice.lines.data.map((ln: any) => {
                const qty = Math.max(1, Math.floor(Number(ln?.quantity ?? 1)));
                const unit =
                  Number(ln?.price?.unit_amount ?? ln?.amount ?? 0) / 100;
                return {
                  sku: String(ln?.price?.id || ln?.id || "invoice-item"),
                  flavor: String(
                    ln?.description ||
                      ln?.price?.product?.name ||
                      ln?.price?.nickname ||
                      "Invoice item",
                  ),
                  price: Number(unit.toFixed(2)),
                  quantity: qty,
                };
              })
            : [];

          await trackPurchase({
            // Stable id derived from invoice id so Stripe retries dedup.
            eventId: courier.eventId || `inv_${invoice.id}`,
            ga4ClientId: courier.ga4ClientId,
            ttclid: courier.ttclid,
            ttp: courier.ttp,
            userAgent: courier.userAgent,
            clientIp: courier.clientIp,
            email: customerEmail,
            amount: amountPaidCents / 100,
            currency,
            orderId: invoice.id,
            source: "invoice.paid",
            items: invoiceItems,
          });
        } catch (analyticsErr: any) {
          console.error(
            "[webhook] invoice.paid Purchase fan-out unexpected error:",
            safeErrSummary(analyticsErr),
          );
        }
      }

      // Only handle wholesale invoices created by the order sheet for the
      // existing email + DB persistence flow below.
      if (!isWholesale) {
        return {
          received: true as const,
          eventId: event.id,
          eventType: event.type,
          ignored: true as const,
          analyticsTracked: !isSubscriptionCreate,
        };
      }

      // Hoisted so the wholesaleOrders insert below can reference these even
      // when resendKey/fromEmail are unset (and the email block is skipped).
      const businessName  = invoice.metadata?.businessName || "Unknown Gym";
      const tier          = invoice.metadata?.tier || "";
      const invoiceRef    = invoice.metadata?.invoiceRef || "";
      const customerEmail = invoice.customer_email || "";

      try {
        const resendKey = process.env.RESEND_API_KEY;
        const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "";
        const notifyTo  = process.env.WHOLESALE_NOTIFY_TO || "alex@kimoraco.com";

        if (resendKey && fromEmail) {
          const resend   = new Resend(resendKey);
          const from     = fromEmail.includes("<") ? fromEmail : `Kimora Co <${fromEmail}>`;

          const invoiceNumber = invoice.number || "";
          const amountPaid    = ((invoice.amount_paid ?? 0) / 100).toFixed(2);
          const invoiceUrl    = invoice.hosted_invoice_url || "";

          const subject = `💰 Wholesale invoice paid — ${businessName} ($${amountPaid})`;

          const text =
            `Wholesale invoice paid\n\n` +
            `Gym: ${businessName}\n` +
            `Tier: ${tier}\n` +
            `Contact email: ${customerEmail}\n` +
            `Stripe invoice #: ${invoiceNumber}${invoiceRef ? ` (Ref: ${invoiceRef})` : ""}\n` +
            `Amount paid: $${amountPaid} USD\n` +
            `Invoice URL: ${invoiceUrl}\n\n` +
            `Time to fulfill the order and update your inventory.`;

          const html = `
<div style="font-family:ui-sans-serif,system-ui;line-height:1.6;color:#111;max-width:520px;">
  <h2 style="margin:0 0 4px;font-size:20px;">💰 Wholesale invoice paid</h2>
  <p style="margin:0 0 20px;color:#555;font-size:14px;">A gym just paid their Kimora Co. wholesale invoice.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888;width:40%">Gym</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600">${businessName}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888">Tier</td><td style="padding:8px 0;border-bottom:1px solid #eee">${tier}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888">Contact</td><td style="padding:8px 0;border-bottom:1px solid #eee">${customerEmail}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888">Invoice #</td><td style="padding:8px 0;border-bottom:1px solid #eee">${invoiceNumber}${invoiceRef ? ` (Ref: ${invoiceRef})` : ""}</td></tr>
    <tr><td style="padding:8px 0;color:#888">Amount paid</td><td style="padding:8px 0;font-size:18px;font-weight:800;color:#2a7a3b">$${amountPaid} USD</td></tr>
  </table>
  ${invoiceUrl ? `<p style="margin:20px 0 0"><a href="${invoiceUrl}" style="background:#111;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600">View Stripe invoice →</a></p>` : ""}
  <p style="margin:24px 0 0;font-size:13px;color:#888">Time to fulfill the order and update your inventory.</p>
</div>`;

          // ── Notify Alex ────────────────────────────────────────────────
          await resend.emails.send({ from, to: notifyTo, subject, text, html } as any);
          console.log(`[webhook] invoice.paid notification sent for ${businessName} ($${amountPaid})`);

          // ── Send reorder magic link to the gym ─────────────────────────
          if (customerEmail) {
            try {
              const stripeCustomerId = String(invoice.customer ?? "");
              const unitPrice =
                parseFloat(invoice.metadata?.unitPrice || "0") ||
                inferUnitPrice(tier);

              const token = generateReorderToken({
                email: customerEmail,
                businessName,
                tier,
                unitPrice,
                stripeCustomerId,
              });

              const siteUrl =
                process.env.PUBLIC_SITE_URL ||
                (process.env.NODE_ENV === "production"
                  ? "https://kimoraco.com"
                  : "http://localhost:5173");

              const reorderUrl = `${siteUrl}/kimora-reorder.html?token=${token}`;

              const gymSubject = `Kimora Co. — your order is confirmed + your reorder link`;
              const gymText =
                `Hey ${businessName},\n\n` +
                `Your Kimora Co. wholesale payment has been received — thanks!\n\n` +
                `We've set up a personal reorder link for your account. Whenever you're running low, just use this link and a new invoice will be sent straight to your inbox:\n\n` +
                `${reorderUrl}\n\n` +
                `Bookmark it — it's yours to use as many times as you need.\n\n` +
                `Questions? Reply to this email or reach us at support@kimoraco.com.\n\n` +
                `— Kimora Co.`;

              const gymHtml = `
<div style="font-family:ui-sans-serif,system-ui;line-height:1.65;color:#111;max-width:520px;">
  <p style="font-size:22px;font-weight:900;letter-spacing:0.05em;margin:0 0 4px;">KIMORA<span style="color:#C8A96E">.</span></p>
  <p style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#888;margin:0 0 28px;">OUT-TRAIN. OUT-SMART. OUT-LAST.</p>
  <h2 style="margin:0 0 8px;font-size:18px;">Payment confirmed ✓</h2>
  <p style="margin:0 0 20px;color:#444;">Hey <strong>${businessName}</strong> — your wholesale payment landed. You're all set.</p>
  <p style="margin:0 0 12px;color:#444;">We've created a personal reorder link for your account. When you're running low, just click it — no forms, no back and forth. A new invoice goes straight to your inbox.</p>
  <p style="margin:0 0 24px;">
    <a href="${reorderUrl}" style="display:inline-block;background:#C8A96E;color:#111;padding:12px 24px;border-radius:4px;text-decoration:none;font-size:14px;font-weight:800;letter-spacing:0.06em;">REORDER NOW →</a>
  </p>
  <p style="margin:0 0 6px;font-size:12px;color:#888;">Or copy this link to bookmark it:</p>
  <p style="margin:0 0 24px;font-size:12px;word-break:break-all;color:#555;">${reorderUrl}</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="font-size:12px;color:#888;">Questions? Reply to this email or reach us at <a href="mailto:support@kimoraco.com" style="color:#C8A96E;">support@kimoraco.com</a></p>
</div>`;

              await resend.emails.send({
                from,
                to: customerEmail,
                subject: gymSubject,
                text: gymText,
                html: gymHtml,
              } as any);

              console.log(`[webhook] reorder link emailed to ${customerEmail}`);
            } catch (linkErr: any) {
              console.error("[webhook] reorder link email failed:", safeErrSummary(linkErr));
            }
          }
        }
      } catch (e: any) {
        console.error("[webhook] invoice.paid email failed:", safeErrSummary(e));
      }

      // Log to wholesaleOrders table (on-conflict-do-nothing so on-the-spot orders aren't overwritten)
      try {
        await db.insert(wholesaleOrders).values({
          stripeInvoiceId:     invoice.id,
          stripeInvoiceNumber: invoice.number ?? null,
          stripeCustomerId:    String(invoice.customer ?? "") || null,
          invoiceUrl:          invoice.hosted_invoice_url ?? null,
          businessName,
          email:               customerEmail || "",
          tier,
          amountPaid:          invoice.amount_paid ?? null,
          currency:            invoice.currency ?? "usd",
          paymentTerms:        invoice.metadata?.paymentTerms ?? null,
          invoiceRef:          invoice.metadata?.invoiceRef ?? null,
          notes:               null,
          status:              "paid",
          fulfilledAt:         null,
          isReorder:           invoice.metadata?.reorder === "true",
          source:              "webhook",
        }).onConflictDoNothing({ target: wholesaleOrders.stripeInvoiceId });
      } catch (dbErr: any) {
        console.error("[webhook] wholesaleOrders insert failed:", safeErrSummary(dbErr));
      }

      return { received: true as const, eventId: event.id, eventType: event.type, handled: "invoice.paid" as const };
    }

    default:
      return {
        received: true as const,
        eventId: event.id,
        eventType: event.type,
        ignored: true as const,
      };
  }
}
