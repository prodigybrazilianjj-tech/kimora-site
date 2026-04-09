CREATE TABLE "restock_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"product_key" varchar(128) NOT NULL,
	"flavor" text NOT NULL,
	"requested_quantity" integer DEFAULT 1 NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"notified_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restock_alerts_requested_quantity_positive_chk" CHECK ("restock_alerts"."requested_quantity" > 0)
);
--> statement-breakpoint
CREATE INDEX "restock_alerts_email_idx" ON "restock_alerts" USING btree ("email");
--> statement-breakpoint
CREATE INDEX "restock_alerts_product_key_idx" ON "restock_alerts" USING btree ("product_key");
--> statement-breakpoint
CREATE INDEX "restock_alerts_flavor_idx" ON "restock_alerts" USING btree ("flavor");
--> statement-breakpoint
CREATE INDEX "restock_alerts_status_idx" ON "restock_alerts" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "restock_alerts_created_at_idx" ON "restock_alerts" USING btree ("created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "restock_alerts_unique_pending_idx" ON "restock_alerts" USING btree ("email","product_key","flavor","status");