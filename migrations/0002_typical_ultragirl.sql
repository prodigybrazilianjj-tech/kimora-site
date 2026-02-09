CREATE TABLE "order_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"stripe_price_id" text,
	"stripe_line_item_id" text,
	"flavor" text NOT NULL,
	"purchase_type" text NOT NULL,
	"frequency_weeks" integer,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_amount" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_checkout_session_id" text NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_subscription_id" text,
	"stripe_customer_id" text,
	"customer_email" text,
	"currency" text DEFAULT 'usd' NOT NULL,
	"amount_subtotal" integer,
	"amount_total" integer,
	"is_subscription" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'paid' NOT NULL,
	"shipping_name" text,
	"shipping_address" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "wholesale_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(32),
	"website_or_instagram" text,
	"city" text NOT NULL,
	"state" varchar(16) NOT NULL,
	"business_type" varchar(32) NOT NULL,
	"business_type_other" text,
	"member_count" integer,
	"retail_setup" varchar(32),
	"interested_on_shelf" boolean DEFAULT true NOT NULL,
	"interested_coach_affiliate" boolean DEFAULT false NOT NULL,
	"interested_event_sponsorship" boolean DEFAULT false NOT NULL,
	"notes" text,
	"status" varchar(32) DEFAULT 'new' NOT NULL,
	"source" varchar(64) DEFAULT 'kimoraco.com' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_items_order_price_unique" ON "order_items" USING btree ("order_id","stripe_price_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_items_order_line_item_unique" ON "order_items" USING btree ("order_id","stripe_line_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_checkout_session_unique" ON "orders" USING btree ("stripe_checkout_session_id");--> statement-breakpoint
CREATE INDEX "orders_payment_intent_idx" ON "orders" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "orders_subscription_idx" ON "orders" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "orders_customer_email_idx" ON "orders" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX "orders_stripe_customer_idx" ON "orders" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_tokens_token_hash_unique" ON "portal_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "portal_tokens_email_idx" ON "portal_tokens" USING btree ("email");--> statement-breakpoint
CREATE INDEX "portal_tokens_expires_at_idx" ON "portal_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "portal_tokens_stripe_customer_idx" ON "portal_tokens" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "wholesale_applications_created_at_idx" ON "wholesale_applications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "wholesale_applications_email_idx" ON "wholesale_applications" USING btree ("email");