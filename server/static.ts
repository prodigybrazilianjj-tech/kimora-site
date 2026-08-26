import express, { type Express } from "express";
import fs from "fs";
import path from "path";

import { injectBody, injectHead } from "./seo";
import { isKnownRoute } from "../shared/seo";

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

    const query = req.originalUrl.slice(req.path.length);
    return res.redirect(301, lower + query);
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

    if (!template) return res.sendFile(indexPath);

    // sendFile used to set this; res.send does not. Keeping it avoids an
    // unintended caching change on every HTML response.
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");

    // Head first, then body. Both are pure string transforms over the same
    // template and neither depends on the request beyond its path — in
    // particular, neither looks at the user agent, which is what keeps the
    // fallback body inside #root a progressive-enhancement fallback rather
    // than cloaking. See shared/prerender.ts.
    const stamped = injectBody(injectHead(template, req.path), req.path);

    res.status(200).type("html").send(stamped);
  });
}
