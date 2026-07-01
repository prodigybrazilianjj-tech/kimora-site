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
