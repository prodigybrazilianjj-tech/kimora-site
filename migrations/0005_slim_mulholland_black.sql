ALTER TABLE "order_items" ADD COLUMN "fulfillment_status" text DEFAULT 'unfulfilled' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "carrier" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "tracking_number" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "shipped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "order_items_fulfillment_status_idx" ON "order_items" USING btree ("fulfillment_status");