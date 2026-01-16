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

    // Keep uniqueness via the named unique index below (not both)
    stripeCheckoutSessionId: text("stripe_checkout_session_id").notNull(),

    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),

    // ✅ NEW: required for Stripe Customer Portal
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
    // Unique constraint you will target in your webhook:
    checkoutSessionUnique: uniqueIndex("orders_checkout_session_unique").on(
      t.stripeCheckoutSessionId,
    ),

    // Optional performance indexes
    paymentIntentIdx: index("orders_payment_intent_idx").on(t.stripePaymentIntentId),
    subscriptionIdx: index("orders_subscription_idx").on(t.stripeSubscriptionId),
    customerEmailIdx: index("orders_customer_email_idx").on(t.customerEmail),
  }),
);

/** ORDER ITEMS */
export const orderItems = pgTable(
  "order_items",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

    orderId: varchar("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),

    // Stripe identifiers for idempotency
    // Price ID should be present for Checkout line items
    stripePriceId: text("stripe_price_id"), // e.g. price_123
    // Line item id is usually present, but keep nullable just in case
    stripeLineItemId: text("stripe_line_item_id"), // e.g. li_123

    flavor: text("flavor").notNull(),
    purchaseType: text("purchase_type").notNull(), // "onetime" | "subscribe"
    frequencyWeeks: integer("frequency_weeks"),
    quantity: integer("quantity").notNull().default(1),

    unitAmount: integer("unit_amount"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    orderIdIdx: index("order_items_order_id_idx").on(t.orderId),

    // Strong fallback: one price should only appear once per order
    orderPriceUnique: uniqueIndex("order_items_order_price_unique").on(
      t.orderId,
      t.stripePriceId,
    ),

    // If you DO have line item ids, this is even more specific
    // (You can use this as the conflict target if you prefer.)
    orderLineItemUnique: uniqueIndex("order_items_order_line_item_unique").on(
      t.orderId,
      t.stripeLineItemId,
    ),
  }),
);
