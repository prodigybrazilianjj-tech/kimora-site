// ─────────────────────────────────────────────────────────────────────────
// Pre-launch gating — single source of truth.
//
// PRELAUNCH_GATE = true  → the full storefront is BROWSABLE (Home, Shop,
//   Product, prices all visible) but NOTHING is purchasable. Buy buttons are
//   replaced with a "Coming Soon" + notify-me email capture. Cart / Checkout
//   routes redirect home.
//
// PRELAUNCH_GATE = false → fully live store: Add to Cart, Cart, and Checkout
//   all work again. Flip this one constant to launch.
//
// NOTE: Wholesale is intentionally NOT gated by this flag. The wholesale pages
// are a marketing page + lead/apply form (gyms are invoiced directly, off-site
// — there is no public self-serve wholesale checkout to disable). To hide the
// wholesale apply flow too, set PRELAUNCH_GATE_WHOLESALE = true below.
// ─────────────────────────────────────────────────────────────────────────

export const PRELAUNCH_GATE = true;

export const PRELAUNCH_GATE_WHOLESALE = false;

// Where the marketing homepage lives right now. While the gate is on, the
// waitlist page owns "/" and Home is parked at /preview-home; at launch Home
// takes "/" back. App.tsx routes from this and the navbar resolves its section
// links against it, so the two cannot drift.
export const HOME_PATH = PRELAUNCH_GATE ? "/preview-home" : "/";
