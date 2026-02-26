ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "fulfillment_status" text NOT NULL DEFAULT 'unfulfilled',
  ADD COLUMN IF NOT EXISTS "carrier" text,
  ADD COLUMN IF NOT EXISTS "tracking_number" text,
  ADD COLUMN IF NOT EXISTS "shipped_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "delivered_at" timestamptz;

CREATE INDEX IF NOT EXISTS "order_items_fulfillment_status_idx"
  ON "order_items" ("fulfillment_status");