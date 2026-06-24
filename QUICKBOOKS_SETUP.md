# QuickBooks readiness + pricing update — handoff

_Last updated 2026-06-17. Covers the 6/10 pricing framework and getting the backend ready to sync into QuickBooks Online (QBO)._

## 1. What I changed in code (done)

**Wholesale → flat $28.99 (retired the 3-tier model)**
- `server/services/wholesaleTokenService.ts` — `inferUnitPrice()` now returns a single `WHOLESALE_UNIT_PRICE = 28.99` (was $37.49/$32.49/$27.49).
- `kimora-order-sheet.html` (your internal invoice tool) — one "Gym Wholesale" row at $28.99 / 42% off / save $21.00. The DTC $49.99 walk-up row stayed.
- `client/public/kimora-wholesale.html` (the served customer page) and the root copy — same single $28.99 row.
- Existing reorder links are unaffected: they carry their own locked-in `unitPrice` in the token; `inferUnitPrice` is only the fallback for new accounts.

**QuickBooks tagging — `kimora_channel` on every Stripe object (done)**
- Retail checkout → `kimora_channel: "retail"` on the session + PaymentIntent/charge.
- Subscriptions → `kimora_channel: "subscription"` on the session + subscription.
- Wholesale invoices (new + reorder) → `kimora_channel: "wholesale"`.
- This is the tag a connector reads to post each sale to the correct income account.

**Retail/sub display prices** ($49.99 one-time / $39.99 monthly sub) are set in the frontend.

> ⚠️ These edits are committed to the working tree but **not deployed**. Run `npm run check` locally, then build + push to Render.

## 2. What only you can do — Stripe side

### 2a. Verify the live Stripe Price objects (important)
The actual amount charged comes from Stripe Price IDs in your Render env vars, **not** from the code. Confirm each points to the right amount:
- `STRIPE_PRICE_*_ONETIME` → **$49.99**
- `STRIPE_PRICE_*_SUB_MONTHLY` (the live monthly sub price) → **$39.99**

Stripe prices are **immutable** — you can't edit an amount. If any is wrong: create a new Price on that Product at the correct amount, then update the env var on Render to the new `price_…` ID. (This is the same swap pattern the flavor switcher already relies on.)

### 2b. Wholesale charges
No Stripe object to change — wholesale amounts are set live by the order-sheet tool and now default to $28.99. Nothing to verify in Stripe.

## 3. Connect QuickBooks (the "off-the-shelf" path you chose)

Stripe is already your system of record, so a connector reads from Stripe — your backend needs no QBO code.

1. **Pick a connector.** Synder or A2X (accounting-aware, handle fees/refunds/payout reconciliation cleanly) or Intuit's native "Connect to Stripe." Synder is the usual solo-founder pick.
2. **Connect Stripe → QBO** in the connector.
3. **Map revenue by channel** using the `kimora_channel` tag / Stripe Products:
   - `retail` → **Retail Sales** income account
   - `subscription` → **Subscription Revenue**
   - `wholesale` → **Wholesale Revenue**
4. **Map the rest:** Stripe fees → a **Merchant Processing Fees** expense; payouts → your **bank/clearing** account; refunds → contra-revenue; sales tax collected → a **Sales Tax Payable** liability.
5. **Run a few test transactions** (one per channel) and confirm each lands in the right account before trusting the feed.

## 4. Log all expenses — in QuickBooks itself

You chose to keep expenses in QBO (correct — it's built for this; no custom code):
- **Connect your business bank + card** to the QBO bank feed so every expense imports automatically.
- **Turn on receipt capture** (QBO mobile app / forward receipts to your QBO receipts email) for co-man payments, samples, software, etc.
- **Set up vendors** (Bactolac, EasyPost/shipping, Resend, Render, etc.) so spend categorizes consistently.
- **Create expense categories** that match how you'll file: COGS/inventory, R&D-ish sampling, software/SaaS, shipping, marketing.

## 5. Sales tax — one real decision (doesn't block the above)

- **DTC:** Stripe Tax is **already enabled** on retail/sub checkout, so tax is being calculated. Confirm your tax **registrations + origin address** are set in the Stripe Tax dashboard, and that you're registered where you have nexus (AZ first; other states once thresholds are crossed).
- **Wholesale:** gyms reselling your product are typically **exempt** — collect a **resale certificate** from each gym and don't charge them tax (the order-sheet already has a tax-rate field you can set to 0 for resale accounts).
- Loop your accountant in on registrations before relying on the numbers.

## 6. Reality check on "automatic taxes"
Software **syncs records** — the connector keeps your books current and the channel tags keep revenue clean. **Filing** is QBO's tax tools + your accountant. The highest-value thing this setup gives you is clean, categorized, audit-ready books with near-zero manual entry — which is exactly what makes tax time painless.

## Metadata reference
| Channel value | Where it's set | QBO income account |
|---|---|---|
| `retail` | checkoutRoutes (payment mode) | Retail Sales |
| `subscription` | checkoutRoutes (subscription mode) | Subscription Revenue |
| `wholesale` | wholesaleRoutes (invoice + reorder) | Wholesale Revenue |
