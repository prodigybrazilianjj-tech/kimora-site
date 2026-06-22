// script/gen-test-reorder-token.ts
// Smoke-test helper: mints reorder tokens with the project's own signing key so
// you can open the reorder page locally without paying a real invoice first.
// Run:  npx tsx script/gen-test-reorder-token.ts
import "dotenv/config";
import { generateReorderToken } from "../server/services/wholesaleTokenService";

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:5000";

// NEW-style token — carries a last order, so the page should PRE-FILL these qtys.
const withLast = generateReorderToken({
  email: "smoketest@example.com",
  businessName: "Combat Club Cottonwood",
  tier: "Wholesale",
  unitPrice: 28.99,
  stripeCustomerId: "",
  lastOrder: [
    { name: "Strawberry Guava", qty: 10 },
    { name: "Raspberry Dragonfruit", qty: 5 },
  ],
  taxRate: 0,            // resale-exempt
  paymentTerms: "Net 15",
});

// OLD-style token — no lastOrder/tax/terms (simulates a link minted before this
// change). Should load with an EMPTY order and no errors (backward-compat).
const noLast = generateReorderToken({
  email: "smoketest@example.com",
  businessName: "Old Link Gym",
  tier: "Wholesale",
  unitPrice: 28.99,
  stripeCustomerId: "",
});

console.log(`\n[1] NEW token — expect PRE-FILL: Strawberry Guava 10, Raspberry Dragonfruit 5, tax Exempt, Terms Net 15`);
console.log(`${BASE}/kimora-reorder.html?token=${withLast}`);
console.log(`\n[2] OLD-style token — expect EMPTY order, no errors (backward-compat)`);
console.log(`${BASE}/kimora-reorder.html?token=${noLast}\n`);
