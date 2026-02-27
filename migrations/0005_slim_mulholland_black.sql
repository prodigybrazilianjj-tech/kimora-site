-- migrations/0005_slim_mulholland_black.sql

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "fulfillment_status" text DEFAULT 'unfulfilled' NOT NULL;--> statement-breakpoint

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "carrier" text;--> statement-breakpoint

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "tracking_number" text;--> statement-breakpoint

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "shipped_at" timestamp with time zone;--> statement-breakpoint

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "delivered_at" timestamp with time zone;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "order_items_fulfillment_status_idx"
  ON "order_items" USING btree ("fulfillment_status");