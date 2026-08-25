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
 * FAQPage for /faq.
 *
 * ⚠️ Kept verbatim in sync with the `faqs` array in client/src/pages/FAQ.tsx.
 * If the two drift, the rich result contradicts the page and Google drops it.
 */
export function faqJsonLd(): object {
  const qa: Array<[string, string]> = [
    [
      "Do I need to load Kimora?",
      "No loading phase is necessary. While loading (taking 20g/day for a week) can saturate muscles slightly faster, it often causes bloating and digestive discomfort. Taking one 5g stick of Kimora daily will fully saturate your muscles within 3-4 weeks without the side effects.",
    ],
    [
      "When should I take it?",
      "Consistency matters more than timing. Take it whenever you can consistently build it into your routine—morning, pre-workout, post-workout, or with dinner. Many users find taking it with a meal helps absorption.",
    ],
    [
      "Can I stack this with pre-workout or other electrolyte drinks?",
      "Absolutely. Kimora is stimulant-free, so it stacks perfectly with your favorite pre-workout. The electrolytes in Kimora are balanced for daily hydration, so you can also combine it with other hydration products if you're training in extreme heat, but for most sessions, Kimora alone is sufficient.",
    ],
    [
      "Will creatine make me bloated or 'puffy'?",
      "Creatine pulls water into your muscle cells (intracellular hydration), which is exactly what you want for performance and recovery. It does not cause subcutaneous water retention (bloating under the skin) unless you take low-quality creatine or load it aggressively. Kimora uses premium micronized creatine to minimize any digestive issues.",
    ],
    [
      "Do I have to be a fighter to use Kimora?",
      "Not at all. While we built this with combat sports demands in mind (high intensity, weight management needs, cognitive stress), the benefits of creatine and electrolytes apply to anyone who lifts, runs, or wants to improve their cognitive function and physical performance.",
    ],
  ];

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_ORIGIN}/faq#faq`,
    mainEntity: qa.map(([q, a]) => ({
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
