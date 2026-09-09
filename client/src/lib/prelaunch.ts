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

// Where the marketing homepage lives. Home has owned "/" since 2026-09-09,
// when the separate Coming Soon front door was retired; the gate no longer
// moves it. Kept as a constant because the navbar resolves section links
// against it.
export const HOME_PATH = "/";

// ── The waitlist offer ───────────────────────────────────────────────────
// The discount is quoted in three places — the hero's pricing line, the
// waitlist section, and the success message that hands over the code — so it
// lives here rather than as a "15%" typed into each of them.
export const WAITLIST_DISCOUNT = 0.15;
export const WAITLIST_CODE = "MAT15";

export const WAITLIST_DISCOUNT_LABEL = `${Math.round(WAITLIST_DISCOUNT * 100)}%`;

/** A pouch price with the waitlist discount applied, e.g. 49.99 -> "42.49". */
export function waitlistPrice(pouchPrice: number): string {
  return (pouchPrice * (1 - WAITLIST_DISCOUNT)).toFixed(2);
}

/**
 * Where the navbar's Home link goes. Same as HOME_PATH now that Home is the
 * front door; both names are kept so the navbar and the section links read
 * as what they are.
 */
export const FRONT_DOOR = "/";
