CREATE TABLE "order_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"stripe_price_id" text NOT NULL,
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
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_items_order_price_unique" ON "order_items" USING btree ("order_id","stripe_price_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_items_order_line_item_unique" ON "order_items" USING btree ("order_id","stripe_line_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_checkout_session_unique" ON "orders" USING btree ("stripe_checkout_session_id");--> statement-breakpoint
CREATE INDEX "orders_payment_intent_idx" ON "orders" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "orders_subscription_idx" ON "orders" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "orders_customer_email_idx" ON "orders" USING btree ("customer_email");