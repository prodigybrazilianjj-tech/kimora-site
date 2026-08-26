// ─────────────────────────────────────────────────────────────────────────
// Crawler-legible body content for the SPA shell.
//
// THE PROBLEM. Every route is served the same index.html, whose body is
// `<div id="root"></div>`. server/seo.ts stamps a correct head onto it, so a
// non-JS crawler gets a good title, description, canonical and JSON-LD — and
// then zero words of prose. Google renders the JS and sees the real page.
// GPTBot, ClaudeBot, PerplexityBot and OAI-SearchBot do not, so for the four
// crawlers this whole program exists to serve, kimoraco.com is a blank page
// with nice labels. That is playbook finding #1 and it is the reason the
// answer engines currently describe Kimora from years-old crawl residue —
// as of 2026-08-26 two of them still name a flavour ("Lemon Yuzu") that was
// renamed to Lemon Lychee in June.
//
// THE FIX, AND WHY IT IS THIS ONE. The playbook's Phase 1 item 6 says
// "prerender or SSR". A real prerender means running the React tree through a
// headless browser at build time: a large new dependency, a browser download
// in every build environment, and a failure mode that only shows up in
// production. Kimora's marketing routes are five mostly-static pages. So this
// module supplies the body the same way server/seo.ts supplies the head —
// authored, versioned, and reviewable as text.
//
// THIS IS NOT CLOAKING, AND THE REASONS MATTER:
//
//   1. It is served to EVERY user agent. Nothing here branches on
//      req.headers['user-agent']. The bytes a crawler receives are byte-for-
//      byte the bytes a browser receives. UA-conditional body content is the
//      thing that gets sites penalised; if anyone ever adds a UA check to
//      this path, that is the bug.
//   2. It goes INSIDE #root, so React's first render replaces it. It is a
//      fallback for the pre-hydration window, which is what that container is
//      for — not a hidden layer, not display:none, not off-screen text.
//   3. It says what the page says. Every claim below is either lifted from
//      the rendered page's own copy or from the same source-of-truth modules
//      the page reads (client/src/lib/product.ts, shared/seo.ts). If the page
//      and this file ever disagree, this file is wrong.
//
// CLAIMS DISCIPLINE. Sodium, potassium and magnesium AMOUNTS are pending the
// production Certificate of Analysis and appear nowhere below — the minerals
// are named, the milligrams are not. Wholesale pricing is gated and appears
// nowhere below. Retail $49.99 and subscription $39.99 are public. No
// structure/function claim is introduced here that the rendered page does not
// already make; this is a mirror, not a louder version.
// ─────────────────────────────────────────────────────────────────────────

import { PRELAUNCH_GATE } from "../client/src/lib/prelaunch";
import { FLAVORS, LAUNCH_FLAVOR, STICKS_PER_POUCH } from "../client/src/lib/product";
import { FAQ_QA, normalizePath } from "./seo";

const PRICE_ONE_TIME = "49.99";
const PRICE_SUB = "39.99";

/**
 * Inline styling for the fallback wrapper.
 *
 * This is not decoration, it is a correctness requirement. The app's stylesheet
 * paints the page dark (#0d0d0f) and sets the text colour on React-rendered
 * elements; a bare <h1> and <p> dropped into #root would inherit the browser
 * default of near-black and render as black-on-black. Text that is technically
 * present and visually invisible is the exact pattern search engines penalise,
 * and it would also mean a real visitor on a slow connection sees a blank
 * screen instead of the page's own words.
 *
 * Colours are the locked brand values — near-black ground, warm off-white type
 * (BRAND_VOICE_GUIDELINES.md §6). Inline rather than in the stylesheet because
 * this has to be correct in the same paint as the HTML, before any external CSS
 * is guaranteed to have applied.
 *
 * No display:none, no visibility:hidden, no off-screen positioning, no
 * font-size:0. If any of those ever appear here, that is the bug.
 */
export const PRERENDER_WRAPPER_STYLE =
  "background:#0d0d0f;color:#F7F0DE;padding:2rem 1.25rem;max-width:46rem;margin:0 auto;font-family:system-ui,sans-serif;line-height:1.6";

/** Escape a string for use as HTML text. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * One block of fallback body copy.
 *
 * `heading` is rendered as the h1. `paragraphs` and `bullets` are rendered in
 * that order. Everything is plain text and is escaped on the way out — no
 * caller supplies markup.
 */
export interface PrerenderContent {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

const launchFlavor =
  FLAVORS.find((f) => f.slug === LAUNCH_FLAVOR)?.name ?? FLAVORS[0].name;

const flavorLine = FLAVORS.map((f) => `${f.name} — ${f.desc}`);

/** The spec block. Repeated across routes on purpose: an answer engine that
 *  retrieves any one page should be able to state the product correctly from
 *  that page alone. */
const SPEC_BULLETS = [
  `${STICKS_PER_POUCH} single-serve sticks per pouch — one month of daily dosing.`,
  "5 g creatine monohydrate per stick.",
  "Contains sodium, potassium and magnesium. Amounts finalize on our production Certificate of Analysis.",
  "Naturally sweetened with stevia and monk fruit. No sugar, no artificial colors, no proprietary blends.",
  "Stimulant free.",
  `$${PRICE_ONE_TIME} one-time, $${PRICE_SUB} on subscription.`,
];

const PRELAUNCH_NOTE =
  "Kimora has not launched yet. Nothing is purchasable on this site today; the waitlist is open and consumer launch is targeted for December 2026.";

/**
 * Fallback body copy, keyed by normalised pathname.
 *
 * Only the indexable marketing routes are here. The legal pages are omitted
 * deliberately: their real body is the full policy text, and a four-line
 * summary standing in for a terms-of-service page would be the one case where
 * the fallback genuinely misrepresents the page.
 */
export const PRERENDER: Readonly<Record<string, PrerenderContent>> = {
  "/": {
    heading: "Kimora Co. — Creatine + Electrolytes, Built for Fighters",
    paragraphs: [
      "Creatine and electrolytes in a single-serve stick, made for people who train. No scooping, no mess, no friction between intention and consistency.",
      "Kimora Co. is a combat-sports supplement brand based in Sedona, Arizona, founded by Alex Estrada. The product is a daily creatine monohydrate and electrolyte stick pack built for Brazilian jiu-jitsu, MMA, Muay Thai and strength athletes.",
      PRELAUNCH_GATE ? PRELAUNCH_NOTE : "",
    ],
    bullets: [
      ...SPEC_BULLETS,
      `Flavors: ${FLAVORS.map((f) => f.name).join(", ")}. ${launchFlavor} ships first.`,
    ],
  },

  "/shop": {
    heading: "Shop Kimora — Creatine + Electrolyte Stick Packs",
    paragraphs: [
      "Daily electrolytes + creatine. Choose your fuel.",
      `Launching with ${launchFlavor}. The rest of the lineup drops after.`,
      `$${PRICE_ONE_TIME} for a pouch of ${STICKS_PER_POUCH} sticks, or $${PRICE_SUB} on a monthly subscription.`,
      PRELAUNCH_GATE ? PRELAUNCH_NOTE : "",
    ],
    bullets: flavorLine,
  },

  "/product": {
    heading: `Kimora Creatine + Electrolytes — ${STICKS_PER_POUCH} Stick Packs`,
    paragraphs: [
      "One stick, once a day, in water. Creatine monohydrate is the most studied compound in sports nutrition, and the hardest part of taking it is remembering to. A pre-measured stick removes the scoop, the tub and the excuse.",
      "Built around combat sports — high intensity, weight management, training most days — but the compound is the same one the research is about, whatever you train.",
      PRELAUNCH_GATE ? PRELAUNCH_NOTE : "",
    ],
    bullets: SPEC_BULLETS,
  },

  "/wholesale": {
    heading: "Kimora Wholesale — Creatine for Jiu-Jitsu and MMA Gyms",
    paragraphs: [
      "Built for gyms. Backed by discipline.",
      "Kimora is not a mass-market supplement. It is a daily performance ritual designed for athletes who train with intent — and gyms that do the same.",
      "The wholesale program is tiered on order volume and commitment. Wholesale pricing is shared after approval, not published. Applications are typically reviewed within one to two business days.",
      // Deliberately "built for", not "supplies". Kimora is pre-launch and has
      // no stocked accounts yet; a present-tense claim of gyms served would be
      // the sort of thing an engine quotes back as fact.
      "Kimora Co. is based in Sedona, Arizona. The wholesale program is built for Brazilian jiu-jitsu, MMA and Muay Thai academies in Arizona and nationwide.",
    ],
    bullets: [
      `Retail is $${PRICE_ONE_TIME} per pouch of ${STICKS_PER_POUCH} sticks.`,
      "5 g creatine monohydrate per stick, naturally sweetened with stevia and monk fruit.",
      "Apply at /wholesale/apply.",
    ],
  },

  "/faq": {
    heading: "Creatine FAQ — Loading, Timing, Bloating",
    // Sourced from the same FAQ_QA array that client/src/pages/FAQ.tsx renders
    // and that faqJsonLd() serialises, so the page, the structured data and
    // this fallback cannot drift apart.
    paragraphs: FAQ_QA.map(([q, a]) => `${q} ${a}`),
  },
};

/** The fallback body for a pathname, or null if that route has none. */
export function prerenderFor(pathname: string): PrerenderContent | null {
  return PRERENDER[normalizePath(pathname)] ?? null;
}

/**
 * Render one content block to HTML.
 *
 * Empty paragraphs are dropped — the launch-gate lines above collapse to ""
 * once PRELAUNCH_GATE flips, and an empty <p> in the output would be the only
 * trace left.
 */
export function renderPrerenderHtml(content: PrerenderContent): string {
  const parts: string[] = [`<h1>${esc(content.heading)}</h1>`];

  for (const p of content.paragraphs) {
    if (p.trim() === "") continue;
    parts.push(`<p>${esc(p)}</p>`);
  }

  if (content.bullets && content.bullets.length > 0) {
    const items = content.bullets
      .filter((b) => b.trim() !== "")
      .map((b) => `<li>${esc(b)}</li>`)
      .join("");
    if (items) parts.push(`<ul>${items}</ul>`);
  }

  return parts.join("");
}
