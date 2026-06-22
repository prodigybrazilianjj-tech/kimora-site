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

    stripeCheckoutSessionId: text("stripe_checkout_session_id").notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),

    stripeCustomerId: text("stripe_customer_id"),

    customerEmail: text("customer_email"),

    currency: text("currency").notNull().default("usd"),
    amountSubtotal: integer("amount_subtotal"),
    amountTotal: integer("amount_total"),

    isSubscription: boolean("is_subscription").notNull().default(false),
    status: text("status").notNull().default("paid"),

    shippingName: text("shipping_name"),
    shippingAddress: jsonb("shipping_address"),

    shippingCarrier: text("shipping_carrier"),
    shippingTrackingNumber: text("shipping_tracking_number"),
    shippingLabelUrl: text("shipping_label_url"),
    shippingShipmentId: text("shipping_shipment_id"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    checkoutSessionUnique: uniqueIndex("orders_checkout_session_unique").on(
      t.stripeCheckoutSessionId,
    ),

    paymentIntentIdx: index("orders_payment_intent_idx").on(t.stripePaymentIntentId),
    subscriptionIdx: index("orders_subscription_idx").on(t.stripeSubscriptionId),
    customerEmailIdx: index("orders_customer_email_idx").on(t.customerEmail),
    stripeCustomerIdx: index("orders_stripe_customer_idx").on(t.stripeCustomerId),

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

    stripePriceId: text("stripe_price_id"),
    stripeLineItemId: text("stripe_line_item_id"),

    flavor: text("flavor").notNull(),
    purchaseType: text("purchase_type").notNull(),
    frequencyWeeks: integer("frequency_weeks"),
    quantity: integer("quantity").notNull().default(1),

    unitAmount: integer("unit_amount"),

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

    orderPriceUnique: uniqueIndex("order_items_order_price_unique").on(
      t.orderId,
      t.stripePriceId,
    ),

    orderLineItemUnique: uniqueIndex("order_items_order_line_item_unique").on(
      t.orderId,
      t.stripeLineItemId,
    ),
  }),
);

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/** INVENTORY ITEMS */
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

/** INVENTORY TRANSACTIONS */
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
      reorderPointFrom?: number | null;
      reorderPointTo?: number | null;
      quantityFrom?: number | null;
      quantityTo?: number | null;
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

/** PORTAL TOKENS */
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

/** WHOLESALE ORDERS — paid invoices (both remote and on-the-spot) */
export const wholesaleOrders = pgTable(
  "wholesale_orders",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

    stripeInvoiceId:     text("stripe_invoice_id"),
    stripeInvoiceNumber: text("stripe_invoice_number"),
    stripeCustomerId:    text("stripe_customer_id"),
    invoiceUrl:          text("invoice_url"),

    businessName: text("business_name").notNull(),
    email:        varchar("email", { length: 320 }).notNull(),

    tier:         text("tier"),
    amountPaid:   integer("amount_paid"),   // cents
    currency:     varchar("currency", { length: 8 }).default("usd"),
    paymentTerms: text("payment_terms"),
    invoiceRef:   text("invoice_ref"),
    notes:        text("notes"),

    // Snapshot of what was ordered, so fulfillment knows which flavors/qtys to
    // decrement from inventory (wholesale has no separate order-items table).
    lineItems:    jsonb("line_items").$type<{ name: string; flavor?: string; qty: number }[]>(),

    // Tax treatment recorded at invoice time (audit trail for the resale exemption).
    // 'exempt_resale' = verified resale cert applied · 'no_cert' = no valid cert, needs review
    // 'taxed' = tax charged (Stripe Tax) · null = legacy/unknown
    taxStatus:    varchar("tax_status", { length: 32 }),
    resaleCertId: varchar("resale_cert_id"), // references wholesale_resale_certs.id when exempt

    // 'paid' = awaiting fulfillment, 'fulfilled' = shipped / handed over
    status:      varchar("status", { length: 32 }).notNull().default("paid"),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),

    isReorder: boolean("is_reorder").notNull().default(false),
    // 'webhook' | 'wholesale-sheet' | 'reorder'
    source: varchar("source", { length: 64 }).default("webhook"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    woCreatedAtIdx:     index("wholesale_orders_created_at_idx").on(t.createdAt),
    woEmailIdx:         index("wholesale_orders_email_idx").on(t.email),
    woStatusIdx:        index("wholesale_orders_status_idx").on(t.status),
    woStripeInvoiceIdx: uniqueIndex("wholesale_orders_stripe_invoice_idx").on(t.stripeInvoiceId),
  }),
);

export type WholesaleOrder = typeof wholesaleOrders.$inferSelect;
export type InsertWholesaleOrder = typeof wholesaleOrders.$inferInsert;

/** WHOLESALE RESALE CERTIFICATES — one per gym account (keyed by email). A verified,
 *  unexpired cert is what authorizes a $0 (resale-exempt) wholesale invoice. */
export const wholesaleResaleCerts = pgTable(
  "wholesale_resale_certs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

    email:            varchar("email", { length: 320 }).notNull(),
    businessName:     text("business_name").notNull(),
    stripeCustomerId: text("stripe_customer_id"),

    certType:          varchar("cert_type", { length: 32 }).notNull().default("az_5000a"), // az_5000a | state | mtc
    licenseNumber:     text("license_number"),   // TPT / resale permit number
    issuingState:      varchar("issuing_state", { length: 8 }).notNull().default("AZ"),
    resaleDescription: text("resale_description"),
    signed:            boolean("signed").notNull().default(false),
    fileUrl:           text("file_url"),          // link/path to the stored cert image/PDF
    receivedAt:        timestamp("received_at", { withTimezone: true }),
    expiresAt:         timestamp("expires_at", { withTimezone: true }), // null = no stated expiry

    verified:           boolean("verified").notNull().default(false),
    verifiedBy:         text("verified_by"),
    verifiedAt:         timestamp("verified_at", { withTimezone: true }),
    verificationResult: text("verification_result"),

    status: varchar("status", { length: 16 }).notNull().default("active"), // active | revoked

    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    rcEmailIdx:    index("wholesale_resale_certs_email_idx").on(t.email),
    rcStateIdx:    index("wholesale_resale_certs_state_idx").on(t.issuingState),
    rcVerifiedIdx: index("wholesale_resale_certs_verified_idx").on(t.verified),
  }),
);

export type WholesaleResaleCert = typeof wholesaleResaleCerts.$inferSelect;
export type InsertWholesaleResaleCert = typeof wholesaleResaleCerts.$inferInsert;

/** WAITLIST EMAILS */
export const waitlistEmails = pgTable(
  "waitlist_emails",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

    email: varchar("email", { length: 320 }).notNull().unique(),

    source: varchar("source", { length: 64 }).notNull().default("coming-soon"),

    metadata: jsonb("metadata").$type<{
      ip?: string | null;
      userAgent?: string | null;
      referer?: string | null;
    }>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  }
);

export const insertWaitlistEmailSchema = createInsertSchema(waitlistEmails).pick({
  email: true,
  source: true,
  metadata: true,
});

export type WaitlistEmail = typeof waitlistEmails.$inferSelect;
export type InsertWaitlistEmail = typeof waitlistEmails.$inferInsert;

/** RESTOCK ALERTS */
export const restockAlerts = pgTable(
  "restock_alerts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

    email: varchar("email", { length: 320 }).notNull(),

    productKey: varchar("product_key", { length: 128 }).notNull(),
    flavor: text("flavor").notNull(),

    requestedQuantity: integer("requested_quantity").notNull().default(1),

    status: varchar("status", { length: 32 }).notNull().default("pending"),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),

    metadata: jsonb("metadata").$type<{
      source?: string | null;
      ip?: string | null;
      userAgent?: string | null;
      referer?: string | null;
      purchaseType?: "onetime" | "subscribe" | null;
      frequency?: "2" | "4" | "6" | null;
    }>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    restockAlertsEmailIdx: index("restock_alerts_email_idx").on(t.email),
    restockAlertsProductKeyIdx: index("restock_alerts_product_key_idx").on(t.productKey),
    restockAlertsFlavorIdx: index("restock_alerts_flavor_idx").on(t.flavor),
    restockAlertsStatusIdx: index("restock_alerts_status_idx").on(t.status),
    restockAlertsCreatedAtIdx: index("restock_alerts_created_at_idx").on(t.createdAt),

    restockAlertsUniquePendingIdx: uniqueIndex("restock_alerts_unique_pending_idx").on(
      t.email,
      t.productKey,
      t.flavor,
      t.status,
    ),

    restockAlertsRequestedQuantityPositiveChk: check(
      "restock_alerts_requested_quantity_positive_chk",
      sql`${t.requestedQuantity} > 0`,
    ),
  }),
);

export type RestockAlert = typeof restockAlerts.$inferSelect;
export type InsertRestockAlert = typeof restockAlerts.$inferInsert;