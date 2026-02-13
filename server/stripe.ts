// server/stripe.ts
import "dotenv/config";
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

if (!key) {
  console.error("CWD:", process.cwd());
  console.error("Has STRIPE_SECRET_KEY:", Boolean(process.env.STRIPE_SECRET_KEY));
  throw new Error("Missing STRIPE_SECRET_KEY env var");
}

export const stripe = new Stripe(key);
