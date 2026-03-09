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

    // ✅ Order-level shipment storage
    shippingCarrier: text("shipping_carrier"),
    shippingTrackingNumber: text("shipping_tracking_number"),
    shippingLabelUrl: text("shipping_label_url"),
    shippingShipmentId: text("shipping_shipment_id"),

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

    // ✅ shipment indexes
    shippingTrackingIdx: index("orders_shipping_tracking_idx").on(t.shippingTrackingNumber),
    shippingShipmentIdx: index("orders_shipping_shipment_idx").on(t.shippingShipmentId),
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

    // Fulfillment tracking (per item)
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

/** INVENTORY ITEMS
 *
 * Phase 1 inventory:
 * - one row per sellable pouch/SKU
 * - onHandQuantity = physical units available in stock
 * - reservedQuantity = units committed but not yet fully relieved from reservation flow
 * - available quantity should be computed as (onHandQuantity - reservedQuantity)
 */
export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

    sku: varchar("sku", { length: 128 }).notNull(),
    flavor: text("flavor").notNull(),
    productName: text("product_name").notNull(),

    isActive: boolean("is_active").notNull().default(true),

    onHandQuantity: integer("on_hand_quantity").notNull().default(0),
    reservedQuantity: integer("reserved_quantity").notNull().default(0),
    reorderPoint: integer("reorder_point").notNull().default(0),

    metadata: jsonb("metadata").$type<{
      notes?: string | null;
      externalId?: string | null;
      unit?: string | null;
    }>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    inventorySkuUnique: uniqueIndex("inventory_items_sku_unique").on(t.sku),
    inventoryFlavorIdx: index("inventory_items_flavor_idx").on(t.flavor),
    inventoryActiveIdx: index("inventory_items_is_active_idx").on(t.isActive),

    inventoryOnHandNonNegativeChk: check(
      "inventory_items_on_hand_non_negative_chk",
      sql`${t.onHandQuantity} >= 0`,
    ),
    inventoryReservedNonNegativeChk: check(
      "inventory_items_reserved_non_negative_chk",
      sql`${t.reservedQuantity} >= 0`,
    ),
    inventoryReorderPointNonNegativeChk: check(
      "inventory_items_reorder_point_non_negative_chk",
      sql`${t.reorderPoint} >= 0`,
    ),
    inventoryReservedLteOnHandChk: check(
      "inventory_items_reserved_lte_on_hand_chk",
      sql`${t.reservedQuantity} <= ${t.onHandQuantity}`,
    ),
  }),
);

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = typeof inventoryItems.$inferInsert;

/** INVENTORY TRANSACTIONS
 *
 * Audit trail for inventory changes.
 * Examples:
 * - "manual_adjustment"
 * - "reservation"
 * - "release_reservation"
 * - "fulfillment"
 * - "restock"
 * - "correction"
 */
export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

    inventoryItemId: varchar("inventory_item_id")
      .notNull()
      .references(() => inventoryItems.id, { onDelete: "cascade" }),

    orderId: varchar("order_id").references(() => orders.id, { onDelete: "set null" }),
    orderItemId: varchar("order_item_id").references(() => orderItems.id, {
      onDelete: "set null",
    }),

    transactionType: varchar("transaction_type", { length: 64 }).notNull(),

    quantityDelta: integer("quantity_delta").notNull().default(0),
    reservedDelta: integer("reserved_delta").notNull().default(0),

    note: text("note"),

    metadata: jsonb("metadata").$type<{
      reason?: string | null;
      actor?: string | null;
      source?: string | null;
    }>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    inventoryTransactionsItemIdx: index("inventory_transactions_item_idx").on(t.inventoryItemId),
    inventoryTransactionsOrderIdx: index("inventory_transactions_order_idx").on(t.orderId),
    inventoryTransactionsOrderItemIdx: index("inventory_transactions_order_item_idx").on(
      t.orderItemId,
    ),
    inventoryTransactionsTypeIdx: index("inventory_transactions_type_idx").on(
      t.transactionType,
    ),
  }),
);

export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type InsertInventoryTransaction = typeof inventoryTransactions.$inferInsert;

/**
 * PORTAL TOKENS
 */
export const portalTokens = pgTable(
  "portal_tokens",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

    tokenHash: text("token_hash").notNull(),
    email: text("email").notNull(),
    stripeCustomerId: text("stripe_customer_id"),

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

    phone: varchar("phone", { length: 32 }).notNull(),

    websiteOrInstagram: text("website_or_instagram"),
    city: text("city").notNull(),
    state: varchar("state", { length: 16 }).notNull(),

    businessType: varchar("business_type", { length: 32 }).notNull(),
    businessTypeOther: text("business_type_other"),

    memberCount: integer("member_count").notNull(),

    retailSetup: varchar("retail_setup", { length: 32 }),

    interestedOnShelf: boolean("interested_on_shelf").notNull().default(true),
    interestedCoachAffiliate: boolean("interested_coach_affiliate")
      .notNull()
      .default(false),
    interestedEventSponsorship: boolean("interested_event_sponsorship")
      .notNull()
      .default(false),

    notes: text("notes"),

    status: varchar("status", { length: 32 }).notNull().default("new"),
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