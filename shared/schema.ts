import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
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
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  stripeCheckoutSessionId: text("stripe_checkout_session_id")
    .notNull()
    .unique(),

  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),

  customerEmail: text("customer_email"),

  currency: text("currency").notNull().default("usd"),
  amountSubtotal: integer("amount_subtotal"),
  amountTotal: integer("amount_total"),

  isSubscription: boolean("is_subscription")
    .notNull()
    .default(false),

  status: text("status").notNull().default("paid"),

  shippingName: text("shipping_name"),
  shippingAddress: jsonb("shipping_address"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** ORDER ITEMS */
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  orderId: varchar("order_id").notNull(),

  flavor: text("flavor").notNull(),
  purchaseType: text("purchase_type").notNull(),
  frequencyWeeks: integer("frequency_weeks"),
  quantity: integer("quantity").notNull().default(1),

  unitAmount: integer("unit_amount"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

