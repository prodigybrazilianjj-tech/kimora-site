ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "shipping_carrier" text;--> statement-breakpoint

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "shipping_tracking_number" text;--> statement-breakpoint

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "shipping_label_url" text;--> statement-breakpoint

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "shipping_shipment_id" text;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "orders_shipping_tracking_idx"
  ON "orders" USING btree ("shipping_tracking_number");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "orders_shipping_shipment_idx"
  ON "orders" USING btree ("shipping_shipment_id");