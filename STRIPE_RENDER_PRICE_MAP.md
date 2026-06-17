# Stripe price IDs → Render env variables — fill-in map

_Goal: point each `STRIPE_PRICE_*` variable in Render at the matching Stripe price you created._

> ⚠️ **Mode matters.** Render is currently on **test** Stripe keys (`sk_test_…`) — normal for pre-launch. Price IDs created in test mode only work with test keys, and live IDs only work with live keys. **You'll do this mapping twice:** once now in **test** (to rehearse the full checkout flow), and again in **live** right before the July 10 launch (see the Go-live checklist at the bottom). Don't mix test and live IDs in the same env.

## How to get a price ID
In Stripe → Product catalog → open the product → in the **Pricing** table, click the price (or its **⋯ → Copy price ID**). It looks like `price_1AbcDe...`. The $49.99 one-time goes in `*_ONETIME`; the $42.49/month goes in `*_SUB_4W`.

## The map (paste each ID in the last column)

| Render variable | Stripe product (display name) | Point at this price | Price ID |
|---|---|---|---|
| `STRIPE_PRICE_STRAWBERRY_GUAVA_ONETIME` | Strawberry Guava | $49.99 one-time | `price_…` |
| `STRIPE_PRICE_STRAWBERRY_GUAVA_SUB_4W` | Strawberry Guava | $42.49 / month | `price_…` |
| `STRIPE_PRICE_RASPBERRY_DRAGONFRUIT_ONETIME` | Raspberry Dragonfruit | $49.99 one-time | `price_…` |
| `STRIPE_PRICE_RASPBERRY_DRAGONFRUIT_SUB_4W` | Raspberry Dragonfruit | $42.49 / month | `price_…` |
| `STRIPE_PRICE_LEMON_YUZU_ONETIME` | **Lemon Lychee** *(see note 1)* | $49.99 one-time | `price_…` |
| `STRIPE_PRICE_LEMON_YUZU_SUB_4W` | **Lemon Lychee** *(see note 1)* | $42.49 / month | `price_…` |

After updating in **Render → your service → Environment**, save — Render redeploys automatically. Then run `npm run audit:channels` and do one live test order per flavor if you can.

---

## Cleanup needed

### 1. Lemon Yuzu → Lemon Lychee rename is only half done ⚠️ (do before July 10 launch)
- Your **Stripe product** is named "Lemon Lychee," but the **live site + app still say "Lemon Yuzu."** A customer would see *Yuzu* on the site and *Lychee* at checkout/receipt — confusing.
- **This is NOT a wiring bug.** Checkout keys off the internal slug `lemon-yuzu` → env var `LEMON_YUZU` → price ID. The Stripe product can be named anything. So the `LEMON_YUZU` variable pointing at the "Lemon Lychee" product is correct — leave it.
- **Fix the display names only** (keep the slug `lemon-yuzu`, the env key `LEMON_YUZU`, and the `/assets/products/lemon-yuzu/` paths as internal IDs — renaming those would break the env wiring and your analytics history for no benefit):
  - `client/src/components/sections/ProductLineup.tsx` — `name: "Lemon Yuzu"`
  - `client/src/pages/ComingSoon.tsx` — the "Lemon Yuzu" name and the `alt="…Lemon Yuzu"` text (~line 355)
  - `server/routes/subscriptionRoutes.ts` — `FLAVORS` entry `name: "Lemon Yuzu"` (shows in the customer portal/emails)
- Tracked as task: "Finish Yuzu→Lychee display rename." Say the word and I'll make these edits.

### 2. Strawberry Guava description — missing space
Live text reads `…Electrolytes.Evidence-backed…`. Add the space: `…Electrolytes. Evidence-backed…`. While you're at it, paste the same (corrected) description onto Raspberry Dragonfruit and Lemon Lychee so all three match.

### 3. Legacy `SUB_2W` / `SUB_6W` variables (low priority)
Subscriptions were simplified to **Monthly only** (reuses the 4-week/monthly price). The `*_SUB_2W` and `*_SUB_6W` variables are leftovers from the old 2/4/6-week options. The Monthly-only flow never requests them, so they're harmless — but to avoid a "Missing env var" error if any old link hits them, either point them at the same monthly price or remove them once you've confirmed nothing references 2-week/6-week.

---

## Go-live checklist (before July 10)

Switching Render from test → live keys. Do this as one deliberate pass:

1. **Stripe (Live mode):** create the 3 products + 6 prices in **Live** mode and copy the live price IDs.
2. **Render → Environment**, swap all of these together:
   - `STRIPE_SECRET_KEY` → your `sk_live_…` key
   - `STRIPE_WEBHOOK_SECRET` → the **live** webhook signing secret. (Webhook secrets are per-mode: in Stripe → Developers → Webhooks, create a live endpoint pointing at your Render webhook URL, then copy *its* signing secret. This is the easiest step to forget.)
   - All 6 `STRIPE_PRICE_*` → the live price IDs from step 1
3. **Stripe Tax:** confirm it's active in Live mode (registrations + origin address).
4. **Smoke test:** make one real one-time purchase and one real subscription, confirm they appear in Stripe + the confirmation email fires, then refund them.
5. **Launch gate:** flip the shop on when ready (`VITE_PRELAUNCH_REDIRECTS` / `VITE_LAUNCH_AT`).

> ⚠️ **The pre-launch gate is client-side only.** The shop/checkout *pages* redirect to coming-soon, but the `/api/checkout` endpoint has no server-side lock — it's reachable directly even while the UI hides the shop. With **test** keys that's harmless. With **live** keys, a direct hit to that endpoint could create a real charge. If you go live before launch, add a server-side gate first (see chat).
