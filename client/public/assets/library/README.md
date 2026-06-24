# Kimora product asset library

Canonical, **approved** product renders for compositing into marketing/site imagery.
Use these instead of regenerating pouches/sticks from scratch — regenerating drifts the
artwork (colors, proportions, the octopus-vs-bear illustration, stick details).

## Contents

### `cutouts/` — transparent PNGs (use these to build composites)
Each flavor has a pouch and a single-serve stick, background removed (RGBA, transparent):

| File | What |
|------|------|
| `strawberry-guava-pouch.png` | Strawberry Guava stand-up pouch, front, upright |
| `strawberry-guava-stick.png` | Strawberry Guava single-serve stick |
| `lemon-lychee-pouch.png` | Lemon Lychee pouch (folder slug is `lemon-lychee`) |
| `lemon-lychee-stick.png` | Lemon Lychee stick |
| `raspberry-dragonfruit-pouch.png` | Raspberry Dragonfruit pouch |
| `raspberry-dragonfruit-stick.png` | Raspberry Dragonfruit stick (complete octopus + bear) |

### `sources/` — approved lineup composites (provenance / do not edit)
The signed-off pouch+sticks studio shots the cutouts were derived from:
`strawberry-guava_lineup-approved.webp`, `lemon-lychee_lineup-approved.webp`,
`raspberry-dragonfruit_lineup-approved.webp`. These are also the images referenced by
the homepage flavor lineup in `client/src/pages/ComingSoon.tsx`.

## How these were made
1. Rendered each flavor's pouch + stick on a plain flat light-grey (#d9d9d9) background
   via ChatGPT image generation, using the approved lineup composite as the artwork reference.
2. Background removed with a smooth distance-from-background alpha matte restricted to the
   border-connected region (protects interior cream ink), then split into pouch + stick.

## Brand specs (keep consistent when adding assets)
- Flavor colors: Raspberry `#C13B49`, Strawberry Guava `#D25843`, Lemon (Lychee) `#E5D14E`
- Brand palette: Red Rock `#A8481F`, Brass `#C9A86A`
- Pouch dimensions: 8.5"w × 10.5"h (broad stand-up, ~1:1.24 — not squat/elongated)
- Stick artwork must show the COMPLETE octopus-vs-bear illustration + the flavor name

## Adding / refreshing an asset
Render on a plain grey background (flat even lighting, soft contact shadow), alpha-matte the
background to transparent, keep the same naming (`{flavor-slug}-pouch.png` / `-stick.png`),
and drop it in `cutouts/`. Verify by opening the saved PNG (don't trust sandbox previews).
