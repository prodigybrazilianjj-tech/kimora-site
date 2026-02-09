import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const wholesaleApplications = pgTable(
  "wholesale_applications",
  {
    id: serial("id").primaryKey(),

    businessName: text("business_name").notNull(),
    contactName: text("contact_name").notNull(),

    email: varchar("email", { length: 320 }).notNull(),
    phone: varchar("phone", { length: 32 }),

    websiteOrInstagram: text("website_or_instagram"),
    city: text("city").notNull(),
    state: varchar("state", { length: 16 }).notNull(),

    businessType: varchar("business_type", { length: 32 }).notNull(), // gym|bjj|performance|trainer|retail|other
    businessTypeOther: text("business_type_other"),

    memberCount: integer("member_count"),
    retailSetup: varchar("retail_setup", { length: 32 }), // front_desk|pro_shop|supplement_wall|not_sure

    interestedOnShelf: boolean("interested_on_shelf").notNull().default(true),
    interestedCoachAffiliate: boolean("interested_coach_affiliate")
      .notNull()
      .default(false),
    interestedEventSponsorship: boolean("interested_event_sponsorship")
      .notNull()
      .default(false),

    notes: text("notes"),

    // Useful ops fields
    status: varchar("status", { length: 32 }).notNull().default("new"), // new|reviewing|approved|rejected|closed
    source: varchar("source", { length: 64 }).notNull().default("kimoraco.com"),

    // Store request metadata without adding columns later
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
  }),
);

export type WholesaleApplicationInsert =
  typeof wholesaleApplications.$inferInsert;
export type WholesaleApplicationSelect =
  typeof wholesaleApplications.$inferSelect;
