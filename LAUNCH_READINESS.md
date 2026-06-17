# Launch readiness — "products landed, ready to sell"

_The single checklist for go-live day. Work top to bottom; each section points to the detailed doc where one exists. Today you're in **test mode pre-launch** (launch July 10) — this is what flips you to live and selling._

## 1. Inventory loaded
- [ ] Product physically received and counted.
- [ ] Stock counts entered per flavor in the **admin dashboard → inventory** (so the site blocks oversells and shows correct availability).

## 2. Stripe → Live (the money switch)
Do these together in one pass — details in `STRIPE_RENDER_PRICE_MAP.md` (Go-live checklist):
- [ ] Create the 3 products + 6 prices in **Live** mode; copy the live price IDs.
- [ ] In **Render → Environment**, swap: `STRIPE_SECRET_KEY` → `sk_live_…`, `STRIPE_WEBHOOK_SECRET` → the **live** webhook signing secret (new live webhook endpoint in Stripe), and all six `STRIPE_PRICE_*` → live IDs.
- [ ] Confirm prices read **$49.99 one-time** and **$42.49/month** on each live product.
- [ ] Confirm **Stripe Tax** is active in Live mode (registrations + origin address).

## 3. Code deployed
- [ ] Latest commits pushed to `main` (wholesale $28.99, QBO `kimora_channel` tags, audit script). Render auto-builds.
- [ ] `npm run check` clean locally before pushing.
- [ ] (Recommended) Finish the Yuzu→Lychee display rename so the site and Stripe agree — task tracked.

## 4. Bookkeeping live
- [ ] Stripe→QBO connector connected and mapping the 3 channels to income accounts (`QBO_CONNECTOR_RUNBOOK.md`).
- [ ] Business bank/card connected to QBO bank feed for expenses.
- [ ] Run `npm run audit:channels` — confirm sales are tagged.

## 5. Fulfillment ready
- [ ] EasyPost on a **live** API key (test key won't buy real labels).
- [ ] Ship-from address + box/mailer sizes confirmed in Render env (already set).
- [ ] Do a test label + packing slip from the admin dashboard.

## 6. Wholesale ready
- [ ] Resale certificates collected from the committed gyms (Combat Club + 2 Cottonwood) — set their tax to 0.
- [ ] Order-sheet tool open and tested (creates a $28.99 invoice). Full process in `Gym-Order-Workflow-SOP.md`.

## 7. Flip the retail gate
- [ ] When everything above is green, open the shop (`VITE_PRELAUNCH_REDIRECTS` / `VITE_LAUNCH_AT`) and redeploy.

## 8. Live smoke test (right after going live)
- [ ] One real one-time order + one real subscription → confirm they appear in Stripe, the confirmation email fires, and (within a day) they sync to QBO. **Refund both.**
- [ ] One test wholesale invoice from the order-sheet → confirm it sends and tags as wholesale.

---

### Easy-to-forget items
- The **live webhook secret** is separate from the test one and must be created fresh in Live mode — miss this and order confirmation emails / post-payment logic silently break.
- **EasyPost** also has test vs live keys — swap it too.
- The pre-launch gate is **client-side only**; going live before flipping the gate leaves `/api/checkout` reachable. Flip the gate (step 7) as the last thing, or add the server-side guard first.
