import { pgTable, unique, check, varchar, text, index, uniqueIndex, foreignKey, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	username: text().notNull(),
	password: text().notNull(),
}, (table) => [
	unique("users_username_unique").on(table.username),
	check("users_id_not_null", sql`NOT NULL id`),
	check("users_password_not_null", sql`NOT NULL password`),
	check("users_username_not_null", sql`NOT NULL username`),
]);

export const orderItems = pgTable("order_items", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	orderId: varchar("order_id").notNull(),
	flavor: text().notNull(),
	purchaseType: text("purchase_type").notNull(),
	frequencyWeeks: integer("frequency_weeks"),
	quantity: integer().default(1).notNull(),
	unitAmount: integer("unit_amount"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	stripePriceId: text("stripe_price_id"),
	stripeLineItemId: text("stripe_line_item_id"),
}, (table) => [
	index("order_items_order_id_idx").using("btree", table.orderId.asc().nullsLast().op("text_ops")),
	uniqueIndex("order_items_order_line_item_unique").using("btree", table.orderId.asc().nullsLast().op("text_ops"), table.stripeLineItemId.asc().nullsLast().op("text_ops")),
	uniqueIndex("order_items_order_price_unique").using("btree", table.orderId.asc().nullsLast().op("text_ops"), table.stripePriceId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_items_order_id_orders_id_fk"
		}).onDelete("cascade"),
	check("order_items_created_at_not_null", sql`NOT NULL created_at`),
	check("order_items_flavor_not_null", sql`NOT NULL flavor`),
	check("order_items_id_not_null", sql`NOT NULL id`),
	check("order_items_order_id_not_null", sql`NOT NULL order_id`),
	check("order_items_purchase_type_not_null", sql`NOT NULL purchase_type`),
	check("order_items_quantity_not_null", sql`NOT NULL quantity`),
]);

export const orders = pgTable("orders", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	stripeCheckoutSessionId: text("stripe_checkout_session_id").notNull(),
	stripePaymentIntentId: text("stripe_payment_intent_id"),
	stripeSubscriptionId: text("stripe_subscription_id"),
	customerEmail: text("customer_email"),
	currency: text().default('usd').notNull(),
	amountSubtotal: integer("amount_subtotal"),
	amountTotal: integer("amount_total"),
	isSubscription: boolean("is_subscription").default(false).notNull(),
	status: text().default('paid').notNull(),
	shippingName: text("shipping_name"),
	shippingAddress: jsonb("shipping_address"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	stripeCustomerId: text("stripe_customer_id"),
}, (table) => [
	uniqueIndex("orders_checkout_session_unique").using("btree", table.stripeCheckoutSessionId.asc().nullsLast().op("text_ops")),
	index("orders_customer_email_idx").using("btree", table.customerEmail.asc().nullsLast().op("text_ops")),
	index("orders_payment_intent_idx").using("btree", table.stripePaymentIntentId.asc().nullsLast().op("text_ops")),
	index("orders_stripe_customer_idx").using("btree", table.stripeCustomerId.asc().nullsLast().op("text_ops")),
	index("orders_subscription_idx").using("btree", table.stripeSubscriptionId.asc().nullsLast().op("text_ops")),
	check("orders_created_at_not_null", sql`NOT NULL created_at`),
	check("orders_currency_not_null", sql`NOT NULL currency`),
	check("orders_id_not_null", sql`NOT NULL id`),
	check("orders_is_subscription_not_null", sql`NOT NULL is_subscription`),
	check("orders_status_not_null", sql`NOT NULL status`),
	check("orders_stripe_checkout_session_id_not_null", sql`NOT NULL stripe_checkout_session_id`),
]);

export const portalTokens = pgTable("portal_tokens", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	tokenHash: text("token_hash").notNull(),
	email: text().notNull(),
	stripeCustomerId: text("stripe_customer_id"),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	usedAt: timestamp("used_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("portal_tokens_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("portal_tokens_expires_at_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	index("portal_tokens_stripe_customer_idx").using("btree", table.stripeCustomerId.asc().nullsLast().op("text_ops")),
	uniqueIndex("portal_tokens_token_hash_unique").using("btree", table.tokenHash.asc().nullsLast().op("text_ops")),
	check("portal_tokens_created_at_not_null", sql`NOT NULL created_at`),
	check("portal_tokens_email_not_null", sql`NOT NULL email`),
	check("portal_tokens_expires_at_not_null", sql`NOT NULL expires_at`),
	check("portal_tokens_id_not_null", sql`NOT NULL id`),
	check("portal_tokens_token_hash_not_null", sql`NOT NULL token_hash`),
]);
