import express, { type Express } from "express";
import fs from "fs";
import path from "path";

import { injectHead } from "./seo";

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

    res.status(200).type("html").send(injectHead(template, req.path));
  });
}
