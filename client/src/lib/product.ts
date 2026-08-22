// ─────────────────────────────────────────────────────────────────────────
// Product facts that change over time — kept in ONE place so the storefront
// stays self-consistent and launch / re-launch is a one-line edit.
// ─────────────────────────────────────────────────────────────────────────

// ── Flavor availability ──────────────────────────────────────────────────
// Strawberry Guava is the LAUNCH flavor and ships first. Lemon Lychee and
// Raspberry Dragonfruit follow in a later drop. To release another flavor,
// add its slug to AVAILABLE_FLAVORS below — every surface (Home lineup, Shop,
// Product page) reads from here, so they update together.
export const LAUNCH_FLAVOR = "strawberry-guava";

export const AVAILABLE_FLAVORS: ReadonlySet<string> = new Set([
  "strawberry-guava",
]);

export function isFlavorAvailable(slug: string): boolean {
  return AVAILABLE_FLAVORS.has(slug);
}

// ── Per-stick nutrition (explicit dosing) ────────────────────────────────
// ⚠️ PENDING FINAL BACTOLAC CoA. These are the 2026-06-17 locked targets and
// are NOT yet confirmed against a production Certificate of Analysis.
// Magnesium is 60 vs 50 mg pending the glycinate requote.
//
// The website MUST match the printed Supplement Facts panel EXACTLY. When the
// CoA lands, update these amounts AND the pouch panel together — a site that
// says one number and a pouch that says another is worse than saying nothing.
export interface NutrientLine {
  label: string;
  amount: string;
}

export const NUTRITION_PER_STICK: readonly NutrientLine[] = [
  { label: "Creatine Monohydrate", amount: "5 g" },
  { label: "Sodium", amount: "750 mg" },
  { label: "Potassium", amount: "250 mg" },
  { label: "Magnesium", amount: "60 mg" },
];

export const NUTRITION_SERVING_NOTE =
  "Per stick (1 serving) · 30 sticks per pouch · Amounts finalize on our production Certificate of Analysis.";

// ── Flavor catalog ───────────────────────────────────────────────────────
// The one description of each flavor. The homepage lineup, the pre-launch
// page and the Shop grid all read from here, so a copy or price change lands
// everywhere at once instead of drifting between three hardcoded arrays.
//
// `well` is the low-alpha tint behind the product shot on the lineup cards —
// it is the flavor's colour, pulled back far enough that the packaging still
// reads as the brightest thing in the frame.
export interface Flavor {
  slug: string;
  name: string;
  desc: string;
  image: string;
  well: string;
  /** The flavour's solid colour — the dot beside its name on the lineup card. */
  hex: string;
  priceOneTime: number;
  priceSub: number;
}

export const FLAVORS: readonly Flavor[] = [
  {
    slug: "strawberry-guava",
    name: "Strawberry Guava",
    desc: "Tropical, richer, and fruit-forward with a fuller flavor profile.",
    image: "/assets/products/strawberry-guava/pouch_sticks_v1.webp",
    well: "rgba(210,88,67,0.16)",
    hex: "#D25843",
    priceOneTime: 49.99,
    priceSub: 39.99,
  },
  {
    slug: "lemon-lychee",
    name: "Lemon Lychee",
    desc: "Bright lemon with a sweet, floral lychee finish.",
    image: "/assets/products/lemon-lychee/pouch_sticks_v6.webp",
    well: "rgba(229,209,78,0.13)",
    hex: "#E5D14E",
    priceOneTime: 49.99,
    priceSub: 39.99,
  },
  {
    slug: "raspberry-dragonfruit",
    name: "Raspberry Dragonfruit",
    desc: "Smooth, balanced, and built to be the daily driver.",
    image: "/assets/products/raspberry-dragonfruit/pouch_sticks_v8.webp",
    well: "rgba(214,40,57,0.14)",
    hex: "#D62839",
    priceOneTime: 49.99,
    priceSub: 39.99,
  },
];
