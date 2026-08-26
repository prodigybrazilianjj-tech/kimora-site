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
// injectBody() below handles the other half: the marketing routes' #root ships
// with real prose in it, so a non-JS crawler gets words and not just labels.
// See shared/prerender.ts for what that content is and why serving it is not
// cloaking.
// ─────────────────────────────────────────────────────────────────────────

import {
  SITE_NAME,
  canonicalFor,
  jsonLdForPath,
  seoForPath,
} from "../shared/seo";
import {
  PRERENDER_WRAPPER_STYLE,
  prerenderFor,
  renderPrerenderHtml,
} from "../shared/prerender";

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
 * Serialise every JSON-LD block for the route into ONE inline <script>, as a
 * single `@graph`.
 *
 * This used to emit one <script> per block, which is valid and which parsers
 * mostly cope with — but `@id` references do not reliably resolve ACROSS
 * script elements. That mattered the moment Article schema shipped: `author`
 * is a required field for Article, and it is expressed here as a reference to
 * the Organization node. Across two scripts a validator is entitled to read
 * that as "author: missing" and decline to treat the page as an Article at
 * all, which would make the corpus's structured data do nothing. Same for the
 * article's `isPartOf` pointing at the /learn CollectionPage.
 *
 * One graph, one @context, all nodes in scope for each other. `<` is escaped
 * so no value can terminate the script element early.
 */
function jsonLdScript(blocks: object[]): string {
  // Each block carries its own "@context": strip it, since the graph hoists a
  // single one. Anything else on the node is passed through untouched.
  const graph = blocks.map((block) => {
    const { "@context": _dropped, ...node } = block as Record<string, unknown>;
    return node;
  });

  const json = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": graph,
  }).replace(/</g, "\\u003c");

  return `<script type="application/ld+json">${json}</script>`;
}

/**
 * Matches one meta tag's content attribute.
 *
 * The quote character is captured (group 2) and the value is matched with a
 * tempered negation against it, rather than the simpler `content=["'][^"']*`.
 * That naive form stops at the first quote of EITHER kind, so a baseline
 * value containing an apostrophe — "…don't load it" — would leave the tail of
 * the old value dangling after the new one. The template comment invites
 * editing these values, so that is reachable.
 *
 *   group 1: everything up to and including `content=`
 *   group 2: the quote character
 *   group 3: the existing value
 *   group 4: the closing quote
 */
function metaPattern(kind: "name" | "property", key: string): RegExp {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(<meta\\s+${kind}=["']${escapedKey}["']\\s+content=)(["'])((?:(?!\\2)[\\s\\S])*)(\\2)`,
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
 *
 * A replacer FUNCTION, not a replacement string: `$` is special in a
 * replacement string, so a description containing "$1" or "$&" would splice
 * part of the regex match back into the page. Prices live in these
 * descriptions, so `$` is not hypothetical.
 */
function setMeta(
  html: string,
  kind: "name" | "property",
  key: string,
  value: string,
): string {
  return html.replace(
    metaPattern(kind, key),
    (_match, prefix: string, quote: string) =>
      `${prefix}${quote}${attr(value)}${quote}`,
  );
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

  // Title (the template ships the homepage title hardcoded). Replacer
  // function for the same reason as setMeta — `$` is special in a replacement
  // string.
  html = html.replace(
    /<title>[\s\S]*?<\/title>/i,
    () => `<title>${text(route.title)}</title>`,
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

  const jsonLd = jsonLdForPath(pathname);
  if (jsonLd.length > 0) added.push(jsonLdScript(jsonLd));

  // Replacer FUNCTION, for the same reason as setMeta. `added` carries the
  // route description via the fallback <meta name="description"> branch, and
  // three route descriptions quote prices — so a literal "$49.99" reaching a
  // replacement STRING would be read as a group reference. Safe today only by
  // accident of which branch runs; not worth leaving to that.
  return html.replace(
    /<\/head>/i,
    () => `    ${added.join("\n    ")}\n  </head>`,
  );
}

/**
 * Matches the empty SPA mount point: `<div id="root"></div>`.
 *
 * Deliberately only matches the EMPTY form. If #root ever ships with content
 * already inside it, this returns the html untouched rather than nesting a
 * second copy — the same fail-quiet posture setMeta() takes. It also makes
 * injectBody idempotent: run it twice and the second pass finds no empty
 * #root and does nothing.
 *
 * The quote character is captured and backreferenced so `id="root'` does not
 * match. (metaPattern above additionally needs a tempered negation because its
 * value is arbitrary text; here the value is the literal `root`, so the
 * backreference alone is enough.)
 *
 * It also requires `id` to be the first attribute on the div. That is fine for
 * a mount point nobody has reason to add classes to, and matching too little
 * fails safe — but it fails SILENTLY, which is why injectBody warns below.
 */
const ROOT_PATTERN =
  /(<div\s+id=(["'])root\2\s*>)(\s*)(<\/div>)/i;

/**
 * Put the route's fallback prose inside #root.
 *
 * Served to every user agent — there is no user-agent branch here and there
 * must never be one. React's first render replaces the container's children,
 * so this is what a browser shows for the few hundred milliseconds before
 * hydration and what a non-JS crawler reads instead of nothing at all.
 *
 * A replacer FUNCTION, not a replacement string: the copy carries prices, and
 * `$` is special in a replacement string — "$49.99" would otherwise be read as
 * a group reference and splice part of the match back into the page.
 *
 * @param html      The head-stamped HTML.
 * @param pathname  req.path — query string already stripped by Express.
 */
export function injectBody(html: string, pathname: string): string {
  const content = prerenderFor(pathname);
  if (!content) return html;

  const body = renderPrerenderHtml(content);

  const out = html.replace(
    ROOT_PATTERN,
    (_match, open: string, _quote: string, _ws: string, close: string) =>
      `${open}<div data-prerender="1" style="${PRERENDER_WRAPPER_STYLE}">${body}</div>${close}`,
  );

  // We had content for this route and could not place it, which means the
  // shell's mount point no longer looks like `<div id="root"></div>` — an edit
  // to client/index.html, or a build step that started rewriting the body.
  // Failing quiet is right; failing quiet AND silent is how this feature dies
  // in production without anyone noticing, since it has no visible effect on a
  // browser that runs JS.
  if (out === html) {
    console.warn(
      `[seo] No empty #root found in the shell; prerendered body for "${pathname}" was not injected.`,
    );
  }

  return out;
}
