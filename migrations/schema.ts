// shared/schema.ts
import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/** USERS */
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

/** ORDERS */
export const orders = pgTable(
  "orders",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

    // Stripe identifiers
    stripeCheckoutSessionId: text("stripe_checkout_session_id").notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),

    // Stripe customer id (needed for portal)
    stripeCustomerId: text("stripe_customer_id"),

    customerEmail: text("customer_email"),

    currency: text("currency").notNull().default("usd"),
    amountSubtotal: integer("amount_subtotal"),
    amountTotal: integer("amount_total"),

    isSubscription: boolean("is_subscription").notNull().default(false),
    status: text("status").notNull().default("paid"),

    shippingName: text("shipping_name"),
    shippingAddress: jsonb("shipping_address"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // Webhook idempotency: one order per checkout session
    checkoutSessionUnique: uniqueIndex("orders_checkout_session_unique").on(
      t.stripeCheckoutSessionId,
    ),

    // Performance indexes
    paymentIntentIdx: index("orders_payment_intent_idx").on(t.stripePaymentIntentId),
    subscriptionIdx: index("orders_subscription_idx").on(t.stripeSubscriptionId),
    customerEmailIdx: index("orders_customer_email_idx").on(t.customerEmail),
    stripeCustomerIdx: index("orders_stripe_customer_idx").on(t.stripeCustomerId),
  }),
);

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/** ORDER ITEMS */
export const orderItems = pgTable(
  "order_items",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

    orderId: varchar("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),

    // Stripe identifiers
    stripePriceId: text("stripe_price_id"),
    stripeLineItemId: text("stripe_line_item_id"),

    flavor: text("flavor").notNull(),
    purchaseType: text("purchase_type").notNull(), // "onetime" | "subscribe"
    frequencyWeeks: integer("frequency_weeks"),
    quantity: integer("quantity").notNull().default(1),

    unitAmount: integer("unit_amount"),

    // ✅ Fulfillment tracking (per item)
    // Keep as text so you can evolve statuses without enum migrations.
    fulfillmentStatus: text("fulfillment_status")
      .notNull()
      .default("unfulfilled"),
    carrier: text("carrier"),
    trackingNumber: text("tracking_number"),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    orderIdIdx: index("order_items_order_id_idx").on(t.orderId),

    // Fallback uniqueness: one price per order (if priceId exists)
    orderPriceUnique: uniqueIndex("order_items_order_price_unique").on(
      t.orderId,
      t.stripePriceId,
    ),

    // More specific uniqueness when line item id exists
    orderLineItemUnique: uniqueIndex("order_items_order_line_item_unique").on(
      t.orderId,
      t.stripeLineItemId,
    ),
  }),
);

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * PORTAL TOKENS
 * (Keeping this in case you still use it elsewhere. If not used, safe to delete later.)
 */
export const portalTokens = pgTable(
  "portal_tokens",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

    // store sha256(rawToken) only — never store raw token
    tokenHash: text("token_hash").notNull(),

    // normalized email (lowercase)
    email: text("email").notNull(),

    // optional: store customer id for speed/stability
    stripeCustomerId: text("stripe_customer_id"),

    // expiry + single-use enforcement
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tokenHashUnique: uniqueIndex("portal_tokens_token_hash_unique").on(t.tokenHash),
    emailIdx: index("portal_tokens_email_idx").on(t.email),
    expiresAtIdx: index("portal_tokens_expires_at_idx").on(t.expiresAt),
    stripeCustomerIdx: index("portal_tokens_stripe_customer_idx").on(t.stripeCustomerId),
  }),
);

export type PortalToken = typeof portalTokens.$inferSelect;
export type InsertPortalToken = typeof portalTokens.$inferInsert;

/** WHOLESALE APPLICATIONS */
export const wholesaleApplications = pgTable(
  "wholesale_applications",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

    businessName: text("business_name").notNull(),
    contactName: text("contact_name").notNull(),

    email: varchar("email", { length: 320 }).notNull(),

    // REQUIRED now (backend stores digits-only)
    phone: varchar("phone", { length: 32 }).notNull(),

    websiteOrInstagram: text("website_or_instagram"),
    city: text("city").notNull(),
    state: varchar("state", { length: 16 }).notNull(),

    businessType: varchar("business_type", { length: 32 }).notNull(), // gym|bjj|performance|trainer|retail|other
    businessTypeOther: text("business_type_other"),

    // REQUIRED now
    memberCount: integer("member_count").notNull(),

    retailSetup: varchar("retail_setup", { length: 32 }), // front_desk|pro_shop|supplement_wall|not_sure

    interestedOnShelf: boolean("interested_on_shelf").notNull().default(true),
    interestedCoachAffiliate: boolean("interested_coach_affiliate")
      .notNull()
      .default(false),
    interestedEventSponsorship: boolean("interested_event_sponsorship")
      .notNull()
      .default(false),

    notes: text("notes"),

    status: varchar("status", { length: 32 }).notNull().default("new"), // new|reviewing|approved|rejected|closed
    source: varchar("source", { length: 64 }).notNull().default("kimoraco.com"),

    metadata: jsonb("metadata").$type<{
      ip?: string | null;
      userAgent?: string | null;
      referer?: string | null;
    }>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    createdAtIdx: index("wholesale_applications_created_at_idx").on(t.createdAt),
    emailIdx: index("wholesale_applications_email_idx").on(t.email),
    statusIdx: index("wholesale_applications_status_idx").on(t.status),

    // DB constraints to match your backend validation
    wholesalePhoneLenChk: check(
      "wholesale_phone_len_chk",
      sql`length(regexp_replace(${t.phone}, '\\D', '', 'g')) >= 10`,
    ),
    wholesaleMemberCountChk: check(
      "wholesale_member_count_chk",
      sql`${t.memberCount} > 0`,
    ),
  }),
);

export type WholesaleApplication = typeof wholesaleApplications.$inferSelect;
export type InsertWholesaleApplication = typeof wholesaleApplications.$inferInsert;