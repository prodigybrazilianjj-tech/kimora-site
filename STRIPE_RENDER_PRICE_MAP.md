# Stripe price IDs → Render env variables — fill-in map

_Goal: point each `STRIPE_PRICE_*` variable in Render at the matching Stripe price you created._

> ⚠️ **Mode matters.** Render is currently on **test** Stripe keys (`sk_test_…`) — normal for pre-launch. Price IDs created in test mode only work with test keys, and live IDs only work with live keys. **You'll do this mapping twice:** once now in **test** (to rehearse the full checkout flow), and again in **live** right before the July 10 launch (see the Go-live checklist at the bottom). Don't mix test and live IDs in the same env.

## How to get a price ID
In Stripe → Product catalog → open the product → in the **Pricing** table, click the price (or its **⋯ → Copy price ID**). It looks like `price_1AbcDe...`. The $49.99 one-time goes in `*_ONETIME`; the $39.99/month goes in `*_SUB_MONTHLY`.

## The map (paste each ID in the last column)

| Render variable | Stripe product (display name) | Point at this price | Price ID |
|---|---|---|---|
| `STRIPE_PRICE_STRAWBERRY_GUAVA_ONETIME` | Strawberry Guava | $49.99 one-time | `price_…` |
| `STRIPE_PRICE_STRAWBERRY_GUAVA_SUB_MONTHLY` | Strawberry Guava | $39.99 / month | `price_…` |
| `STRIPE_PRICE_RASPBERRY_DRAGONFRUIT_ONETIME` | Raspberry Dragonfruit | $49.99 one-time | `price_…` |
| `STRIPE_PRICE_RASPBERRY_DRAGONFRUIT_SUB_MONTHLY` | Raspberry Dragonfruit | $39.99 / month | `price_…` |
| `STRIPE_PRICE_LEMON_LYCHEE_ONETIME` | **Lemon Lychee** | $49.99 one-time | `price_…` |
| `STRIPE_PRICE_LEMON_LYCHEE_SUB_MONTHLY` | **Lemon Lychee** | $39.99 / month | `price_…` |

After updating in **Render → your service → Environment**, save — Render redeploys automatically. Then run `npm run audit:channels` and do one live test order per flavor if you can.

---

## Cleanup needed

### 1. Lemon Yuzu → Lemon Lychee rename — COMPLETED 2026-06-24 ✅
- The full internal rename from `lemon-yuzu` → `lemon-lychee` was completed 2026-06-24. The slug, the env key (`LEMON_LYCHEE`), the `/assets/products/lemon-lychee/` paths, the type unions, and all display names now use Lychee. Inbound matchers still accept a legacy "yuzu" alias for backward-compat but always resolve to `lemon-lychee`.
- **Action for go-live:** the Stripe price env vars are now `STRIPE_PRICE_LEMON_LYCHEE_ONETIME` / `STRIPE_PRICE_LEMON_LYCHEE_SUB_MONTHLY`. Make sure Render uses these names (rename the old `LEMON_YUZU` vars or add the new ones pointing at the same Lemon Lychee price IDs).
- Any existing self-test order rows storing the old `'lemon-yuzu'` slug should be updated to `'lemon-lychee'` (see SQL in the handoff notes).

### 2. Strawberry Guava description — missing space
Live text reads `…Electrolytes.Evidence-backed…`. Add the space: `…Electrolytes. Evidence-backed…`. While you're at it, paste the same (corrected) description onto Raspberry Dragonfruit and Lemon Lychee so all three match.

### 3. Legacy `SUB_4W` / `SUB_2W` / `SUB_6W` variables (cleanup)
Subscriptions are **Monthly only** and the code now reads `*_SUB_MONTHLY` exclusively (the `_SUB_4W` / `_SUB_2W` / `_SUB_6W` naming has been retired from code). Point the new `*_SUB_MONTHLY` vars at the $39.99/month price for each flavor. The old `*_SUB_2W` / `*_SUB_4W` / `*_SUB_6W` variables are no longer referenced by any code path — remove them once `*_SUB_MONTHLY` is confirmed live.

---

## Go-live checklist (before July 10)

Switching Render from test → live keys. Do this as one deliberate pass:

1. **Stripe (Live mode):** create the 3 products + 6 prices (one-time + monthly per flavor) in **Live** mode and copy the live price IDs.
2. **Render → Environment**, swap all of these together:
   - `STRIPE_SECRET_KEY` → your `sk_live_…` key
   - `STRIPE_WEBHOOK_SECRET` → the **live** webhook signing secret. (Webhook secrets are per-mode: in Stripe → Developers → Webhooks, create a live endpoint pointing at your Render webhook URL, then copy *its* signing secret. This is the easiest step to forget.)
   - All 6 `STRIPE_PRICE_*` (`*_ONETIME` + `*_SUB_MONTHLY` per flavor) → the live price IDs from step 1
   - `CHECKOUT_ENABLED` → `true` (server-side checkout gate; until this is set, `/api/checkout` returns 403 even with live keys)
3. **Stripe Tax:** confirm it's active in Live mode (registrations + origin address).
4. **Smoke test:** make one real one-time purchase and one real subscription, confirm they appear in Stripe + the confirmation email fires, then refund them.
5. **Launch gate:** flip the shop on when ready (`VITE_PRELAUNCH_REDIRECTS` / `VITE_LAUNCH_AT`).

> ✅ **Server-side checkout gate added 2026-06-24.** `/api/checkout` now returns HTTP 403 unless `CHECKOUT_ENABLED=true`, so a direct POST can't create a real charge even with live keys while the gate is closed. Set `CHECKOUT_ENABLED=true` on Render as the last step to open checkout (it defaults off = safe).
