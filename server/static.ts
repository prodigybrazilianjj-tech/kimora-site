import express, { type Express } from "express";
import fs from "fs";
import path from "path";

import { injectBody, injectHead } from "./seo";
import { isKnownRoute, redirectFor } from "../shared/seo";

/**
 * The query string of a request target, including the leading "?".
 *
 * Sliced at the first "?" rather than at `req.path.length`. The two agree for
 * an origin-form target ("/faq?x=1") and disagree for an absolute-form one
 * ("http://host/faq?x=1"), which HTTP/1.1 permits: `req.path` is just the
 * pathname, so slicing by its length would cut in the middle of the URI and
 * splice host characters into the Location header. Not reachable behind a
 * normal reverse proxy; also not worth relying on that.
 */
function queryOf(originalUrl: string): string {
  const i = originalUrl.indexOf("?");
  return i === -1 ? "" : originalUrl.slice(i);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // /index.html is the same page as / under a second URL. Redirect BEFORE
  // express.static, which would otherwise serve the file by name — `index:
  // false` only suppresses the directory-index behaviour, it does not hide an
  // explicit request for the file.
  app.use((req, res, next) => {
    if (req.path === "/index.html") return res.redirect(301, "/");
    next();
  });

  // ── Legacy URLs ─────────────────────────────────────────────────────────
  //
  // BEFORE the 404 handler at the bottom of this file, and before
  // express.static so an old URL can never be shadowed by a file of the same
  // name. redirectFor() returns null for every path in the route table, so
  // this can only ever fire on a path that is not a route — note that is NOT
  // the same as "a path that would otherwise have 404ed", precisely because
  // this sits ahead of express.static: a future entry naming a filename in
  // dist/public would take priority over the file. That is the intended
  // ordering, but it is worth stating rather than implying the opposite.
  //
  // Today the list is one entry, /coming-soon, and it is the reason the 404
  // work below was safe to do at all — see LEGACY_REDIRECTS in shared/seo.ts.
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) return next();

    const target = redirectFor(req.path);
    if (!target) return next();

    // A day, not forever. A bare 301 is cached heuristically and effectively
    // permanently, and these are retired URLs rather than URLs that can never
    // come back. Making it a decision rather than an omission.
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.redirect(301, target + queryOf(req.originalUrl));
  });

  // index: false is load-bearing. express.static's default is to answer a
  // request for "/" with index.html straight off disk, which would let the
  // homepage — the one page every crawler hits first — skip the head stamping
  // below and ship with no canonical and no JSON-LD.
  app.use(express.static(distPath, { index: false }));

  // ── Case normalisation ──────────────────────────────────────────────────
  //
  // AFTER express.static, deliberately: asset filenames on disk are
  // case-sensitive, and lowercasing a request for /assets/Foo.PNG before the
  // static middleware sees it would 404 a file that exists. Only paths static
  // did not answer get here.
  //
  // Why this exists. seoForPath() and canonicalFor() lowercase the path;
  // wouter does NOT match case-sensitively — regexparam compiles every route
  // pattern with the `i` flag. So /Learn/Creatine-And-Electrolytes-Together
  // used to render the article route in the browser while the slug lookup
  // (case-sensitive) failed and produced a 404 page — and the server was
  // meanwhile stamping that same URL `index, follow` with a full Article
  // block declaring a published, dated, cited article. Structured data
  // asserting one thing while the visible page says "not found" is the exact
  // contradiction this whole program is trying to stay clear of.
  //
  // A 301 makes the server and the router agree by construction, and matches
  // what canonicalFor() has been claiming all along.
  //
  // Scoped to paths whose lowercase form is a KNOWN route. A blanket
  // lowercase would rewrite arbitrary URLs — /tools/:name is token-gated and
  // its param is not ours to normalise — so anything unrecognised is left
  // exactly as it was and behaves as it did before.
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) return next();

    const lower = req.path.toLowerCase();
    if (lower === req.path) return next();
    if (!isKnownRoute(lower)) return next();

    return res.redirect(301, lower + queryOf(req.originalUrl));
  });

  // The SPA shell, read once. Every route is served this same file, so the
  // head has to be stamped per-request or the whole site reports the
  // homepage's title and description. See server/seo.ts.
  //
  // Read defensively: a missing index.html used to mean a 404 on the shell
  // while the API kept serving. Throwing here would escape the un-caught async
  // IIFE in server/index.ts and take the listener down with it.
  const indexPath = path.resolve(distPath, "index.html");
  let template: string | null = null;
  try {
    template = fs.readFileSync(indexPath, "utf-8");
  } catch (err) {
    console.error(
      `[seo] Could not read ${indexPath}; serving the shell unstamped.`,
      err,
    );
  }

  // Only fall through to index.html for NON-API routes
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) return next();

    // ── Real 404s ─────────────────────────────────────────────────────────
    //
    // Playbook finding #10, deferred three times. This middleware used to
    // answer HTTP 200 with the SPA shell for EVERY non-/api path, including
    // paths that have never existed. Google reads a 200 carrying no content
    // as a soft 404, and once it has decided a site does that it can pull
    // real pages into the same bucket — which for a nine-page site that has
    // spent three weeks becoming legible to crawlers is the expensive kind of
    // failure.
    //
    // Everything that legitimately answers has already had its turn by this
    // point in the stack, and each was enumerated rather than assumed:
    //
    //   /api/*             → returned above, and registerRoutes() runs BEFORE
    //                        serveStatic() in server/index.ts anyway
    //   /tools/:name,      → registered by registerToolRoutes(), same reason.
    //   /tools/login,       Token-gated, its param is not ours, and it never
    //   /tools/logout       reaches this file
    //   real files          → express.static above (favicon2.png,
    //                        opengraph.jpg, kimora-reorder.html, /assets/*)
    //   /index.html         → 301 to "/" above
    //   /Faq, /LEARN, …     → 301 to the lowercase form above
    //   /coming-soon        → 301 to "/" above, via LEGACY_REDIRECTS
    //
    // What is left is a path that matches nothing, and the honest answer to
    // that is 404. The shell is still served with it, so React still boots
    // and renders NotFound — a 404 status and a rendered page are not in
    // tension, and shipping the shell keeps in-app client-side navigation
    // away from the bad URL working exactly as before.
    //
    // isKnownRoute() is matched on the LOWERCASE, PERCENT-DECODED path.
    //
    // Lowercase for the same reason the case-normalising redirect above
    // exists: wouter matches case insensitively, so /FAQ renders the FAQ page.
    // It is 301'd above, but if that redirect is ever narrowed this must not
    // start 404ing a page the router happily renders.
    //
    // Decoded because req.path is not: "/%66aq" is the FAQ page to wouter,
    // which decodes, and a raw comparison would 404 it while React rendered
    // the real page underneath — the same server/router disagreement the case
    // redirect exists to eliminate, on a second axis. decodeURI throws on a
    // malformed escape; a path we cannot decode is not a route we own, so the
    // catch falls through to 404, which is the right answer for it anyway.
    let decoded = req.path;
    try {
      decoded = decodeURI(req.path);
    } catch {
      /* malformed escape — leave it encoded and let it 404 */
    }
    const notFound = !isKnownRoute(decoded.toLowerCase());

    if (!template) {
      // The degraded branch: index.html was unreadable at boot. injectHead
      // never runs here, so the shell would go out carrying the template's
      // BASELINE head — the homepage title, the homepage description,
      // og:url pointing at "/" — under a 404 status. That is exactly the
      // contradiction DEFAULT_ROUTE exists to avoid, so a 404 gets a minimal
      // honest document instead of a shell that claims to be the homepage.
      if (notFound) {
        return res
          .status(404)
          .type("html")
          .send(
            '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
              "<title>Page Not Found | Kimora Co.</title>" +
              '<meta name="robots" content="noindex, follow">' +
              "</head><body><h1>Page not found</h1></body></html>",
          );
      }
      return res.sendFile(indexPath);
    }

    // sendFile used to set this; res.send does not. Keeping it avoids an
    // unintended caching change on every HTML response — but only on the
    // responses it was written for. "public" on a 404 is not what anyone
    // means by it.
    res.setHeader(
      "Cache-Control",
      notFound ? "no-store" : "public, max-age=0, must-revalidate",
    );

    // Head first, then body. Both are pure string transforms over the same
    // template and neither depends on the request beyond its path — in
    // particular, neither looks at the user agent, which is what keeps the
    // fallback body inside #root a progressive-enhancement fallback rather
    // than cloaking. See shared/prerender.ts.
    const stamped = injectBody(injectHead(template, req.path), req.path);

    // The head is already correct for a 404 without any special-casing here:
    // seoForPath() falls back to DEFAULT_ROUTE for an unknown path, and
    // DEFAULT_ROUTE now carries 404 copy and `indexable: false`, so the page
    // ships "Page Not Found", a noindex, and no Product/Article/FAQ block.
    // prerenderFor() likewise returns null, so #root stays empty. The only
    // thing that was missing was the status code.
    res.status(notFound ? 404 : 200).type("html").send(stamped);
  });
}
