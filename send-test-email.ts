// send-test-email.ts — run with: npx tsx send-test-email.ts [type]
//
// Types: all (default), order, shipping, waitlist, early-access, marketing
//
// Examples:
//   npx tsx send-test-email.ts
//   npx tsx send-test-email.ts order
//   npx tsx send-test-email.ts shipping
import "dotenv/config";
import {
  sendOrderConfirmationEmail,
  sendShippingNotificationEmail,
  sendWaitlistConfirmationEmail,
  sendEarlyAccessDropEmail,
  sendMarketingWelcomeEmail,
} from "./server/services/emailService";

const TO = process.env.TEST_EMAIL || "alex@kimoraco.com";
const CODE = process.env.MARKETING_DISCOUNT_CODE || "MAT15";
const SITE_URL = process.env.PUBLIC_SITE_URL || "http://127.0.0.1:5000";

const type = process.argv[2] || "all";

async function testOrder() {
  console.log("→ Order confirmation…");
  await sendOrderConfirmationEmail({
    session: {
      id: "cs_test_abc123",
      customer_details: { email: TO, name: "Alex Estrada" },
      shipping_details: {
        name: "Alex Estrada",
        address: {
          line1: "PO Box 20024",
          line2: null,
          city: "Village of Oak Creek",
          state: "AZ",
          postal_code: "86341",
          country: "US",
        },
      },
      amount_subtotal: 3600,
      amount_total: 3600,
    },
    lineItems: [
      {
        description: "Strawberry Guava — 30-pack",
        quantity: 1,
        amount_total: 3600,
        price: { unit_amount: 3600, id: null },
      },
    ],
    isSubscription: false,
  });
  console.log("  ✓ Order confirmation sent");
}

async function testOrderSubscription() {
  console.log("→ Order confirmation (subscription)…");
  await sendOrderConfirmationEmail({
    session: {
      id: "cs_test_sub456",
      customer_details: { email: TO, name: "Alex Estrada" },
      shipping_details: {
        name: "Alex Estrada",
        address: {
          line1: "PO Box 20024",
          line2: null,
          city: "Village of Oak Creek",
          state: "AZ",
          postal_code: "86341",
          country: "US",
        },
      },
      amount_subtotal: 3240,
      amount_total: 3240,
    },
    lineItems: [
      {
        description: "Lemon Lychee — Subscribe every 4 weeks",
        quantity: 1,
        amount_total: 3240,
        price: { unit_amount: 3240, id: null },
      },
    ],
    isSubscription: true,
  });
  console.log("  ✓ Order confirmation (subscription) sent");
}

async function testShipping() {
  console.log("→ Shipping notification…");
  await sendShippingNotificationEmail({
    customerEmail: TO,
    shippingName: "Alex Estrada",
    orderId: "cs_test_abc123",
    carrier: "USPS",
    trackingNumber: "9400111899223397958982",
  });
  console.log("  ✓ Shipping notification sent");
}

async function testWaitlist() {
  console.log("→ Waitlist confirmation…");
  await sendWaitlistConfirmationEmail({ email: TO });
  console.log("  ✓ Waitlist confirmation sent");
}

async function testEarlyAccess() {
  console.log("→ Early access drop…");
  await sendEarlyAccessDropEmail({
    email: TO,
    firstName: "Alex",
    launchUrl: `${SITE_URL}/shop`,
    discountCode: CODE,
    windowText: "Early access is now open. Get yours before we sell out.",
  });
  console.log("  ✓ Early access drop sent");
}

async function testMarketing() {
  console.log("→ Marketing welcome (10% off)…");
  await sendMarketingWelcomeEmail({ email: TO, discountCode: CODE });
  console.log("  ✓ Marketing welcome sent");
}

const runners: Record<string, () => Promise<void>> = {
  order: testOrder,
  "order-sub": testOrderSubscription,
  shipping: testShipping,
  waitlist: testWaitlist,
  "early-access": testEarlyAccess,
  marketing: testMarketing,
};

console.log(`Sending to: ${TO}\n`);

if (type === "all") {
  for (const fn of Object.values(runners)) await fn();
} else if (runners[type]) {
  await runners[type]();
} else {
  console.error(`Unknown type "${type}". Valid options: all, ${Object.keys(runners).join(", ")}`);
  process.exit(1);
}

console.log("\nAll done.");
