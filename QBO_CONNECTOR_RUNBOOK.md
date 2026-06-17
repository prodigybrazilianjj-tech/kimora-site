# Stripe → QuickBooks connector — setup runbook

_Goal: every Kimora sale flows into QuickBooks Online (QBO) automatically, sorted into the right income account, with Stripe fees and payouts reconciled — no manual entry. Uses an off-the-shelf connector (Synder recommended; A2X or Intuit's native "Connect to Stripe" work the same way)._

Set aside ~45 minutes. Do this once; after that it runs on its own.

---

## Before you start
- A QuickBooks Online account (any paid tier supports app connections).
- Admin access to your Stripe account.
- This decided up front — your three revenue buckets:
  - **Retail Sales** — one-time DTC orders
  - **Subscription Revenue** — recurring subscriptions
  - **Wholesale Revenue** — gym invoices
- The backend now tags each sale with `kimora_channel` = `retail` / `subscription` / `wholesale`. The connector uses that tag (and the Stripe product) to route revenue.

## Step 1 — Create the income & clearing accounts in QBO
In QBO: **Accounting → Chart of Accounts → New**. Create these if they don't exist:
- Income: **Retail Sales**, **Subscription Revenue**, **Wholesale Revenue**
- Expense: **Merchant Processing Fees** (for Stripe's cut)
- Bank/Other Current Asset: **Stripe Clearing** (holds money between a sale and the bank payout)
- Liability: **Sales Tax Payable** (QBO may auto-create this with its tax feature on)

## Step 2 — Sign up for the connector
1. Go to Synder (synder.com) and create an account. Check current pricing in-app and pick the plan that covers your monthly transaction volume.
2. When prompted to connect accounting, choose **QuickBooks Online** and authorize it.
3. Add a data source → **Stripe** → authorize. (Connect your live Stripe, not test mode.)

## Step 3 — Map the money (the important part)
In the connector's settings / category-mapping rules:
- **Income routing** — create rules on the `kimora_channel` metadata (or on the Stripe Product if metadata isn't an available field):
  - `kimora_channel = retail` → **Retail Sales**
  - `kimora_channel = subscription` → **Subscription Revenue**
  - `kimora_channel = wholesale` → **Wholesale Revenue**
- **Stripe fees** → **Merchant Processing Fees**
- **Payouts to your bank** → from **Stripe Clearing** to your real bank account
- **Refunds** → back against the matching income account (contra-revenue)
- **Sales tax collected** → **Sales Tax Payable**

## Step 4 — Test before trusting it
1. Use the connector's **sync a single transaction** (or sync the last 1–2 days).
2. Open QBO and confirm: one retail order, one subscription charge, and one wholesale invoice each landed in the correct income account, fees hit Merchant Processing Fees, and the payout reconciles against Stripe Clearing.
3. Run `npm run audit:channels` in the repo first — if it reports untagged sales, fix those in Stripe before the connector imports them as uncategorized.

## Step 5 — Turn on ongoing sync
Once the test looks right, enable **auto-sync** (real-time or daily). New sales now post themselves.

## Step 6 — Backfill the accumulated costs/sales (optional but you mentioned costs have piled up)
- For **sales**: set the connector's historical import to the date you started taking payments; it will pull and categorize past Stripe activity.
- For **expenses**: see the expenses section below — those come in through QBO's bank feed, not Stripe.

---

## Expenses (separate from the Stripe connector)
Stripe only knows about sales. Your spending (co-man payments, samples, software, shipping) comes into QBO directly:
1. **QBO → Transactions → Bank transactions → Connect account.** Link your business checking and business card.
2. QBO pulls every transaction. Categorize each to an expense account; once you categorize a vendor once, QBO remembers and auto-suggests it next time.
3. Turn on **receipt capture** (QBO mobile app, or forward receipts to your QBO receipts email) so each expense has its backup attached for taxes.
4. Set up **vendors** (Bactolac, EasyPost, Render, Resend, etc.) so spend categorizes consistently and 1099 tracking is clean.

## Sales tax
- **DTC**: Stripe Tax is already calculating tax at checkout. Confirm your registrations + origin address in Stripe's Tax settings, and that QBO's sales-tax feature is on so collected tax books to Sales Tax Payable.
- **Wholesale**: gyms reselling are usually exempt — collect a resale certificate from each (see the resale-cert request email) and set their order tax to 0.

## Ongoing (automated)
A monthly scheduled check is set up to run the channel-tag audit and remind you to reconcile the QBO sync and spot-check expense categorization. You don't need to remember it.

## Reality check
The connector keeps your books current and clean — that's what makes tax time painless. It does **not** file taxes; QBO's tax tools + your accountant do that. What you're buying here is audit-ready, categorized books with near-zero manual entry.
