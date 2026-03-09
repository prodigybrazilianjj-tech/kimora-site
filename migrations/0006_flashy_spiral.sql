CREATE TABLE "inventory_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" varchar(128) NOT NULL,
	"flavor" text NOT NULL,
	"product_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"on_hand_quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"reorder_point" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_items_on_hand_non_negative_chk" CHECK ("inventory_items"."on_hand_quantity" >= 0),
	CONSTRAINT "inventory_items_reserved_non_negative_chk" CHECK ("inventory_items"."reserved_quantity" >= 0),
	CONSTRAINT "inventory_items_reorder_point_non_negative_chk" CHECK ("inventory_items"."reorder_point" >= 0),
	CONSTRAINT "inventory_items_reserved_lte_on_hand_chk" CHECK ("inventory_items"."reserved_quantity" <= "inventory_items"."on_hand_quantity")
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_item_id" varchar NOT NULL,
	"order_id" varchar,
	"order_item_id" varchar,
	"transaction_type" varchar(64) NOT NULL,
	"quantity_delta" integer DEFAULT 0 NOT NULL,
	"reserved_delta" integer DEFAULT 0 NOT NULL,
	"note" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "order_items_fulfillment_status_idx";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_carrier" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_tracking_number" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_label_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_shipment_id" text;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_items_sku_unique" ON "inventory_items" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "inventory_items_flavor_idx" ON "inventory_items" USING btree ("flavor");--> statement-breakpoint
CREATE INDEX "inventory_items_is_active_idx" ON "inventory_items" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "inventory_transactions_item_idx" ON "inventory_transactions" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "inventory_transactions_order_idx" ON "inventory_transactions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "inventory_transactions_order_item_idx" ON "inventory_transactions" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "inventory_transactions_type_idx" ON "inventory_transactions" USING btree ("transaction_type");--> statement-breakpoint
CREATE INDEX "orders_shipping_tracking_idx" ON "orders" USING btree ("shipping_tracking_number");--> statement-breakpoint
CREATE INDEX "orders_shipping_shipment_idx" ON "orders" USING btree ("shipping_shipment_id");--> statement-breakpoint