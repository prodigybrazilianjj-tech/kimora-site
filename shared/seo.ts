// ─────────────────────────────────────────────────────────────────────────
// Route-level SEO metadata — one table, three consumers.
//
//   1. server/seo.ts       → injects <title>, description, canonical, OG,
//                            robots and JSON-LD into the served index.html
//   2. script/build.ts     → writes dist/public/sitemap.xml at build time
//   3. client/public/robots.txt → its disallow list tracks `indexable: false`,
//                            with one deliberate exception: /preview-home is
//                            noindex but NOT disallowed, so crawlers are
//                            allowed in to read the noindex.
//
// The site is a client-rendered SPA: every route is served the same
// index.html, so without this the whole site reports the homepage's title and
// description, and a canonical tag would tell Google that /faq and /shop are
// duplicates of /. That is why the head is stamped per-request on the server
// rather than by a React hook — a hook only helps crawlers that execute JS,
// and GPTBot, ClaudeBot and PerplexityBot do not.
//
// ⚠️ Descriptions are customer-facing copy. Brand voice is locked dry-witty
// (BRAND_VOICE_GUIDELINES.md) and no unverified spec may appear here. Creatine
// is 5 g per stick and locked; sodium, potassium, magnesium and net weight are
// NOT confirmed against a production CoA and are deliberately absent.
// ─────────────────────────────────────────────────────────────────────────

// PRELAUNCH_GATE decides which page owns "/" and where the marketing homepage
// lives. Imported rather than re-declared so the sitemap cannot drift from the
// router. prelaunch.ts is plain constants with no imports and no browser APIs,
// so it bundles cleanly into the server and the build script.
import { PRELAUNCH_GATE } from "../client/src/lib/prelaunch";
// Flavour names for the Product schema. Same rule as PRELAUNCH_GATE above:
// imported from the storefront's own catalog rather than retyped, so structured
// data cannot claim a flavour the site does not sell. product.ts is plain
// constants with no imports and no browser APIs, so it bundles into the server.
import { FLAVORS } from "../client/src/lib/product";

/**
 * Canonical origin. kimoraco.com 301s to www.kimoraco.com, so www is the
 * canonical host — pointing canonicals at the apex would name a URL that
 * redirects.
 */
export const SITE_ORIGIN = "https://www.kimoraco.com";
export const SITE_NAME = "Kimora Co.";
export const SITE_TAGLINE = "Grow Stronger. Think Sharper.";
export const SITE_LOGO = `${SITE_ORIGIN}/favicon2.png`;
export const SITE_OG_IMAGE = `${SITE_ORIGIN}/opengraph.jpg`;

export interface RouteSeo {
  /** Exact pathname, no trailing slash except for "/". */
  path: string;
  title: string;
  /** Meta description. Keep under ~155 characters. */
  description: string;
  /** In the sitemap and crawlable. False adds <meta name="robots" content="noindex, follow">. */
  indexable: boolean;
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  /** Sitemap priority, 0.0–1.0. */
  priority?: number;
}

/**
 * The public route table. Mirrors the <Switch> in client/src/App.tsx —
 * when a route is added there, add it here too.
 *
 * A route that exists in App.tsx but not here does NOT merely get the wrong
 * title: DEFAULT_ROUTE is `indexable: false`, so it ships noindex and is
 * absent from the sitemap. Fail-closed is the right default for a table that
 * decides what Google sees, but it does mean a forgotten route disappears
 * quietly rather than looking wrong.
 */
export const ROUTES: readonly RouteSeo[] = [
  {
    path: "/",
    title: "Kimora Co. | Creatine + Electrolyte Stick Packs for BJJ & MMA",
    description:
      "5 g creatine monohydrate plus real electrolytes in a single-serve stick. Naturally sweetened with stevia and monk fruit. Built for BJJ, MMA and lifters.",
    indexable: true,
    changefreq: "weekly",
    priority: 1.0,
  },
  {
    path: "/faq",
    title: "Creatine FAQ — Loading, Timing, Bloating | Kimora Co.",
    description:
      "Straight answers on creatine: whether you need a loading phase, when to take it, how it stacks with pre-workout, and what creatine bloat actually is.",
    indexable: true,
    changefreq: "monthly",
    priority: 0.8,
  },
  {
    path: "/shop",
    title: "Shop Creatine + Electrolyte Stick Packs | Kimora Co.",
    description:
      "Thirty single-serve sticks per pouch — one month of daily creatine. $49.99 one-time, $39.99 on subscription. Three flavors, no sugar, no artificial colors.",
    indexable: true,
    changefreq: "weekly",
    priority: 0.9,
  },
  {
    path: "/product",
    title: "Creatine + Electrolytes, 30 Stick Packs | Kimora Co.",
    description:
      "5 g creatine monohydrate and real electrolytes per stick. No sugar, no artificial colors, no proprietary blends. Thirty sticks to a pouch.",
    indexable: true,
    changefreq: "weekly",
    priority: 0.9,
  },
  {
    path: "/wholesale",
    title: "Wholesale for Jiu-Jitsu and MMA Gyms | Kimora Co.",
    description:
      "Stock Kimora creatine + electrolyte stick packs at your academy. A wholesale program built for BJJ, MMA and Muay Thai gyms in Arizona and nationwide.",
    indexable: true,
    changefreq: "monthly",
    priority: 0.7,
  },
  {
    path: "/terms",
    title: "Terms of Service | Kimora Co.",
    description:
      "The terms that govern purchases, subscriptions and use of kimoraco.com.",
    indexable: true,
    changefreq: "yearly",
    priority: 0.2,
  },
  {
    path: "/privacy",
    title: "Privacy Policy | Kimora Co.",
    description:
      "What Kimora Co. collects, why we collect it, and how to ask us to delete it.",
    indexable: true,
    changefreq: "yearly",
    priority: 0.2,
  },
  {
    path: "/refunds",
    title: "Returns and Refunds | Kimora Co.",
    description:
      "How returns, refunds and subscription cancellations work at Kimora Co.",
    indexable: true,
    changefreq: "yearly",
    priority: 0.2,
  },

  // ── Not for the index ──────────────────────────────────────────────────
  // /preview-home only EXISTS while the gate is on (App.tsx renders the route
  // conditionally), so its entry here is conditional too — otherwise this
  // table would keep describing a route that 404s after launch. It is noindex
  // because it is a staging address for the launch-day homepage; indexing it
  // would put a second copy of the homepage in the index.
  //
  // Deliberately NOT disallowed in robots.txt. A disallowed URL is never
  // fetched, so the noindex below would never be read — and a blocked URL can
  // still be indexed URL-only from an inbound link. noindex alone is the
  // stronger signal, but only if the crawler is allowed to see it.
  ...(PRELAUNCH_GATE
    ? [
        {
          path: "/preview-home",
          title: "Kimora Co. | Creatine + Electrolyte Stick Packs for BJJ & MMA",
          description:
            "5 g creatine monohydrate plus real electrolytes in a single-serve stick. Naturally sweetened with stevia and monk fruit. Built for BJJ, MMA and lifters.",
          indexable: false,
        } satisfies RouteSeo,
      ]
    : []),
  {
    path: "/wholesale/apply",
    title: "Wholesale Application | Kimora Co.",
    description: "Apply to stock Kimora at your gym.",
    indexable: false,
  },
  {
    path: "/cart",
    title: "Cart | Kimora Co.",
    description: "Your cart.",
    indexable: false,
  },
  {
    path: "/checkout",
    title: "Checkout | Kimora Co.",
    description: "Checkout.",
    indexable: false,
  },
  {
    path: "/order-success",
    title: "Order Confirmed | Kimora Co.",
    description: "Your order is confirmed.",
    indexable: false,
  },
  {
    path: "/manage-subscription",
    title: "Manage Your Subscription | Kimora Co.",
    description: "Manage your Kimora subscription.",
    indexable: false,
  },
  {
    path: "/admin",
    title: "Admin | Kimora Co.",
    description: "Internal.",
    indexable: false,
  },
];

/** Fallback used for any path not in ROUTES (404s and anything new). */
export const DEFAULT_ROUTE: RouteSeo = {
  path: "/",
  title: ROUTES[0].title,
  description: ROUTES[0].description,
  indexable: false,
};

/** Normalise a request path: strip the query, strip a trailing slash. */
export function normalizePath(pathname: string): string {
  const clean = (pathname.split("?")[0] || "/").replace(/\/+$/, "");
  return clean === "" ? "/" : clean.toLowerCase();
}

export function seoForPath(pathname: string): RouteSeo {
  const key = normalizePath(pathname);
  return ROUTES.find((r) => r.path === key) ?? DEFAULT_ROUTE;
}

/** Absolute canonical URL for a route. */
export function canonicalFor(pathname: string): string {
  const key = normalizePath(pathname);
  return key === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${key}`;
}

// ── Sitemap ──────────────────────────────────────────────────────────────

/**
 * Every indexable route as a sitemap.xml document. Written to
 * dist/public/sitemap.xml by script/build.ts, so the build date is the
 * lastmod — accurate for a site whose content only changes on deploy.
 */
export function buildSitemapXml(lastmod = new Date().toISOString().slice(0, 10)): string {
  const urls = ROUTES.filter((r) => r.indexable)
    .map((r) =>
      [
        "  <url>",
        `    <loc>${canonicalFor(r.path)}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        r.changefreq ? `    <changefreq>${r.changefreq}</changefreq>` : null,
        r.priority !== undefined ? `    <priority>${r.priority.toFixed(1)}</priority>` : null,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

// ── Structured data ──────────────────────────────────────────────────────
//
// Claims discipline: everything below is either a locked spec or already
// public on the site. Sodium, potassium, magnesium and net weight are pending
// the production CoA and are deliberately NOT expressed as structured data —
// a machine-readable number gets quoted back verbatim with no room for the
// "finalizes on our CoA" caveat the page carries.

const PRICE_ONE_TIME = "49.99";
const STICKS_PER_POUCH = 30;

/** Organization + WebSite. Safe on every page. */
export function siteJsonLd(): object[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${SITE_ORIGIN}/#organization`,
      name: SITE_NAME,
      alternateName: "Kimora",
      url: `${SITE_ORIGIN}/`,
      logo: SITE_LOGO,
      slogan: SITE_TAGLINE,
      description:
        "Kimora Co. makes daily creatine monohydrate and electrolyte stick packs for Brazilian jiu-jitsu, MMA, Muay Thai and strength athletes.",
      foundingDate: "2026",
      founder: { "@type": "Person", name: "Alex Estrada" },
      address: {
        "@type": "PostalAddress",
        addressLocality: "Sedona",
        addressRegion: "AZ",
        addressCountry: "US",
      },
      email: "support@kimoraco.com",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_ORIGIN}/#website`,
      name: SITE_NAME,
      url: `${SITE_ORIGIN}/`,
      publisher: { "@id": `${SITE_ORIGIN}/#organization` },
      inLanguage: "en-US",
    },
  ];
}

/**
 * Product schema for /shop and /product.
 *
 * availability is PreOrder while the pre-launch gate is on — nothing is
 * buyable yet, and claiming InStock would be a false signal to both shoppers
 * and merchant feeds.
 */
export function productJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${SITE_ORIGIN}/product#product`,
    name: "Kimora Creatine + Electrolytes",
    brand: { "@type": "Brand", name: SITE_NAME },
    category: "Sports Nutrition > Creatine",
    description:
      "Daily creatine monohydrate and electrolytes in single-serve stick packs, built for grappling and combat sports. 5 g creatine monohydrate per stick, naturally sweetened with stevia and monk fruit. No sugar, no artificial colors, no proprietary blends.",
    image: SITE_OG_IMAGE,
    url: `${SITE_ORIGIN}/product`,
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "Creatine monohydrate per stick",
        value: "5 g",
      },
      {
        "@type": "PropertyValue",
        name: "Sticks per pouch",
        value: String(STICKS_PER_POUCH),
      },
      {
        "@type": "PropertyValue",
        name: "Sweetener",
        value: "Stevia and monk fruit",
      },
      {
        "@type": "PropertyValue",
        name: "Stimulant free",
        value: "Yes",
      },
      // Flavours as machine-readable data, added 2026-08-26. Two answer
      // engines were still describing Kimora as coming in "Lemon Yuzu" — a
      // name retired in June 2026 — and omitting Raspberry Dragonfruit
      // entirely. Both were reading stale crawl residue, because until this
      // branch there was no crawlable body copy to read instead. Read from
      // FLAVORS so the list cannot drift from the storefront.
      {
        "@type": "PropertyValue",
        name: "Flavors",
        value: FLAVORS.map((f) => f.name).join(", "),
      },
    ],
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: PRICE_ONE_TIME,
      url: `${SITE_ORIGIN}/product`,
      availability: PRELAUNCH_GATE
        ? "https://schema.org/PreOrder"
        : "https://schema.org/InStock",
      seller: { "@id": `${SITE_ORIGIN}/#organization` },
    },
  };
}

/**
 * The FAQ question/answer pairs, as [question, answer].
 *
 * ⚠️ Kept verbatim in sync with the `faqs` array in client/src/pages/FAQ.tsx.
 * If the two drift, the rich result contradicts the page and Google drops it.
 *
 * Exported rather than kept local to faqJsonLd() because shared/prerender.ts
 * renders the same text as the crawler-visible body of /faq. One array, three
 * consumers (page, JSON-LD, fallback body) — the alternative is three copies
 * of the same five answers drifting apart.
 */
export const FAQ_QA: ReadonlyArray<readonly [string, string]> = [
  [
    "Do I need to load Kimora?",
    "No. Loading—around 20g a day for a week—reaches muscle saturation faster and is more likely to upset your stomach. The research is consistent that a standard daily dose gets to the same place in roughly three to four weeks. One stick is 5g of creatine monohydrate.",
  ],
  [
    "When should I take it?",
    "Consistency matters more than timing. Creatine works by being present in the muscle, not by being in your bloodstream at a clever moment—so take it at whatever hour you'll actually take it every day. Morning, pre-training, post-training, with dinner. The best time is the one you don't skip.",
  ],
  [
    "Can I stack this with pre-workout or other electrolyte drinks?",
    "Yes. Kimora contains no stimulants, so there's nothing to double up on if you also take a pre-workout. It contains sodium, potassium and magnesium; if you're training in real heat and want more on top of that, there's no interaction to avoid.",
  ],
  [
    "Will creatine make me bloated or 'puffy'?",
    "Creatine draws water into the muscle cell. That's intracellular, and it's the mechanism the research describes rather than a side effect. The 'puffy' look people report is generally associated with aggressive loading rather than a standard daily dose. Kimora uses micronized creatine monohydrate.",
  ],
  [
    "Do I have to be a fighter to use Kimora?",
    "No. We built it around combat sports—high intensity, weight management, training most days—but creatine monohydrate is one of the most studied supplements in sports nutrition, and none of that research is specific to fighters. If you lift or run, it's the same compound.",
  ],
];

/** FAQPage for /faq. */
export function faqJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_ORIGIN}/faq#faq`,
    mainEntity: FAQ_QA.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

/** All JSON-LD blocks that belong on a given route. */
export function jsonLdForPath(pathname: string): object[] {
  const key = normalizePath(pathname);
  const blocks = siteJsonLd();

  if (key === "/faq") blocks.push(faqJsonLd());
  if (key === "/product" || key === "/shop") blocks.push(productJsonLd());

  return blocks;
}
