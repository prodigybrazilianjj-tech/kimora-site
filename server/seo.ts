// ─────────────────────────────────────────────────────────────────────────
// Per-request <head> stamping for the SPA shell.
//
// Every route is served the same dist/public/index.html, so out of the box
// /faq, /shop, /product and /wholesale all report the homepage's title and
// description. This module rewrites the head before the HTML goes out:
// title, meta description, canonical, robots, Open Graph, Twitter and JSON-LD.
//
// Why here and not in React: the crawlers that matter most for the AI shelf —
// GPTBot, ClaudeBot, PerplexityBot — do not execute JavaScript. A react-helmet
// hook would be invisible to all of them. Stamping on the server means the
// bytes are correct for every client, JS or not.
//
// This is NOT a prerender. The <body> is still an empty #root; a non-JS
// crawler gets a correct, well-described, structured-data-bearing page with no
// visible body copy. Prerendering the marketing routes is the next structural
// fix (playbook Phase 1, item 6).
// ─────────────────────────────────────────────────────────────────────────

import {
  SITE_NAME,
  canonicalFor,
  jsonLdForPath,
  seoForPath,
} from "../shared/seo";

/** Escape a string for use inside a double-quoted HTML attribute. */
function attr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Escape a string for use as HTML text. */
function text(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Serialise JSON-LD for an inline <script>. `<` is escaped so a value can
 * never terminate the script element early.
 */
function jsonLdScript(block: object): string {
  const json = JSON.stringify(block).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}

function metaPattern(kind: "name" | "property", key: string): RegExp {
  return new RegExp(
    `(<meta\\s+${kind}=["']${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']\\s+content=["'])[^"']*(["'])`,
    "i",
  );
}

function hasMeta(html: string, kind: "name" | "property", key: string): boolean {
  return metaPattern(kind, key).test(html);
}

/**
 * Rewrite the `content` of an existing meta tag, matched on its name/property.
 * Returns the html unchanged if the tag isn't present, so a template edit that
 * drops a tag degrades quietly instead of throwing.
 */
function setMeta(
  html: string,
  kind: "name" | "property",
  key: string,
  value: string,
): string {
  return html.replace(metaPattern(kind, key), `$1${attr(value)}$2`);
}

/**
 * Stamp the head of the SPA shell for one pathname.
 *
 * @param template  The built index.html, read once at startup.
 * @param pathname  req.path — query string already stripped by Express.
 */
export function injectHead(template: string, pathname: string): string {
  const route = seoForPath(pathname);
  const canonical = canonicalFor(pathname);

  let html = template;

  // Title (the template ships the homepage title hardcoded).
  html = html.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${text(route.title)}</title>`,
  );

  // Open Graph and Twitter already exist in the template — retarget them.
  html = setMeta(html, "property", "og:title", route.title);
  html = setMeta(html, "property", "og:description", route.description);
  html = setMeta(html, "property", "og:url", canonical);
  html = setMeta(html, "name", "twitter:title", route.title);
  html = setMeta(html, "name", "twitter:description", route.description);

  // The template carries a baseline description so dev and any un-stamped
  // fallback still say something. Retarget it if it's there; add it only if
  // it isn't — two description tags is worse than none.
  //
  // Presence is tested with the pattern, NOT by comparing the string before
  // and after the replace: on the homepage the baseline text and the route
  // text are identical, so a before/after compare reports "absent" and we
  // append a duplicate.
  const templateHasDescription = hasMeta(html, "name", "description");
  html = setMeta(html, "name", "description", route.description);

  // Everything the template does not have yet.
  const added: string[] = [
    ...(templateHasDescription
      ? []
      : [`<meta name="description" content="${attr(route.description)}" />`]),
    // The canonical link is stamped here and nowhere else. Hardcoded in the
    // template it would name the homepage URL on every route, marking /faq,
    // /shop and /product as duplicates of /. It is only ever correct
    // per-request.
    `<link rel="canonical" href="${attr(canonical)}" />`,
    // og:image and og:type are already in the template and are the same on
    // every route, so they are left alone. og:site_name is missing.
    `<meta property="og:site_name" content="${attr(SITE_NAME)}" />`,
  ];

  if (!route.indexable) {
    // "follow" so link equity still flows out of gated pages; only the page
    // itself stays out of the index.
    added.push(`<meta name="robots" content="noindex, follow" />`);
  } else {
    added.push(
      `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />`,
    );
  }

  for (const block of jsonLdForPath(pathname)) {
    added.push(jsonLdScript(block));
  }

  return html.replace(/<\/head>/i, `    ${added.join("\n    ")}\n  </head>`);
}
