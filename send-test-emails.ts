/**
 * Test email sender — fires one of each email type to alex@kimoraco.com
 * Run from project root: npx tsx /path/to/send-test-emails.ts
 */

import "dotenv/config";
import {
  sendOrderConfirmationEmail,
  sendShippingNotificationEmail,
  sendWaitlistConfirmationEmail,
  sendEarlyAccessDropEmail,
  sendMarketingWelcomeEmail,
} from "./server/services/emailService";

const TEST_EMAIL = "alex@kimoraco.com";
const SITE_URL = "https://kimoraco.com";

// Stub price IDs so flavor → image mapping works even without Stripe env vars.
// These only need to match what we pass in the test lineItems below.
const SG_ONETIME   = "price_test_sg_onetime";
const LY_SUB_MONTHLY = "price_test_ly_sub_monthly";
process.env.STRIPE_PRICE_STRAWBERRY_GUAVA_ONETIME = SG_ONETIME;
process.env.STRIPE_PRICE_LEMON_LYCHEE_SUB_MONTHLY = LY_SUB_MONTHLY;
process.env.PUBLIC_SITE_URL = SITE_URL;

async function run() {
  console.log("Sending test emails to", TEST_EMAIL, "\n");

  // ── 1. Order Confirmation (one-time purchase) ──────────────────────────────
  console.log("1) Order confirmation (one-time)...");
  await sendOrderConfirmationEmail({
    session: {
      id: "cs_test_KIMORA123456789",
      currency: "usd",
      amount_subtotal: 3400,
      amount_total: 3400,
      customer_details: {
        email: TEST_EMAIL,
        name: "Alex Estrada",
      },
      shipping_details: {
        name: "Alex Estrada",
        address: {
          line1: "123 Main St",
          city: "Austin",
          state: "TX",
          postal_code: "78701",
          country: "US",
        },
      },
    },
    lineItems: [
      {
        quantity: 2,
        price: { id: SG_ONETIME, unit_amount: 1700 },
      },
    ],
    isSubscription: false,
  });
  console.log("   ✓ sent\n");

  // ── 2. Order Confirmation (subscription) ──────────────────────────────────
  console.log("2) Order confirmation (subscription)...");
  await sendOrderConfirmationEmail({
    session: {
      id: "cs_test_SUB_KIMORA987654",
      currency: "usd",
      amount_subtotal: 1500,
      amount_total: 1500,
      customer_details: {
        email: TEST_EMAIL,
        name: "Alex Estrada",
      },
      shipping_details: {
        name: "Alex Estrada",
        address: {
          line1: "123 Main St",
          city: "Austin",
          state: "TX",
          postal_code: "78701",
          country: "US",
        },
      },
    },
    lineItems: [
      {
        quantity: 1,
        price: { id: LY_SUB_MONTHLY, unit_amount: 1500 },
      },
    ],
    isSubscription: true,
  });
  console.log("   ✓ sent\n");

  // ── 3. Shipping Notification ───────────────────────────────────────────────
  console.log("3) Shipping notification...");
  await sendShippingNotificationEmail({
    customerEmail: TEST_EMAIL,
    shippingName: "Alex Estrada",
    orderId: "cs_test_KIMORA123456789",
    carrier: "usps",
    trackingNumber: "9400111899223456789012",
  });
  console.log("   ✓ sent\n");

  // ── 4. Waitlist Confirmation ───────────────────────────────────────────────
  console.log("4) Waitlist confirmation...");
  await sendWaitlistConfirmationEmail({
    email: TEST_EMAIL,
    firstName: "Alex",
  });
  console.log("   ✓ sent\n");

  // ── 5. Early Access Drop ───────────────────────────────────────────────────
  console.log("5) Early access drop announcement...");
  await sendEarlyAccessDropEmail({
    email: TEST_EMAIL,
    firstName: "Alex",
    launchUrl: `${SITE_URL}/shop`,
    discountCode: "EARLYACCESS20",
    windowText: "48 hours only",
  });
  console.log("   ✓ sent\n");

  // ── 6. Marketing Welcome ───────────────────────────────────────────────────
  console.log("6) Marketing welcome...");
  await sendMarketingWelcomeEmail({
    email: TEST_EMAIL,
    discountCode: "WELCOME10",
  });
  console.log("   ✓ sent\n");

  console.log("All done! Check alex@kimoraco.com.");
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
