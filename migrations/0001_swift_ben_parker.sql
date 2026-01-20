CREATE TABLE "portal_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"email" text NOT NULL,
	"stripe_customer_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "stripe_price_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "portal_tokens_token_hash_unique" ON "portal_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "portal_tokens_email_idx" ON "portal_tokens" USING btree ("email");--> statement-breakpoint
CREATE INDEX "portal_tokens_expires_at_idx" ON "portal_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "portal_tokens_stripe_customer_idx" ON "portal_tokens" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "orders_stripe_customer_idx" ON "orders" USING btree ("stripe_customer_id");