import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

import { injectBody, injectHead } from "./seo";
import { isKnownRoute, redirectFor } from "../shared/seo";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // ── The two decisions production makes that change a status code ──────
    //
    // server/static.ts 301s legacy URLs and answers unknown paths with 404.
    // Dev used to end every response `res.status(200)` unconditionally, which
    // would have put the two environments back out of step on exactly the
    // axis the comment below says was fixed for head stamping: a route added
    // to App.tsx and forgotten in the ROUTES table would work perfectly
    // locally and 404 only on kimoraco.com, and /coming-soon would be a 200
    // here and a 301 there. The first sight of either would be a deploy.
    //
    // NOT mirrored, deliberately: the case-normalising 301 (/FAQ -> /faq).
    // That one exists in production to sit after express.static so it cannot
    // 404 a case-sensitive asset filename on disk, a constraint dev does not
    // have — and both environments end on the same rendered page either way,
    // so the only difference is one redirect hop. Status codes are what
    // matter here.
    //
    // `url` is originalUrl and carries the query string; both helpers strip
    // it via normalizePath, but the redirect has to preserve it, so the path
    // is split out explicitly here.
    const qIndex = url.indexOf("?");
    const pathOnly = qIndex === -1 ? url : url.slice(0, qIndex);
    const query = qIndex === -1 ? "" : url.slice(qIndex);

    // /index.html -> "/" as well. This one is NOT about the route table: the
    // path is not in ROUTES, so without the redirect the 404 rule below would
    // answer it 404 in dev while production 301s it — a status-code
    // divergence, which is the exact class of bug this block exists to close.
    // Caught in verification, after the first pass mirrored the two decisions
    // that read ROUTES and missed the one that does not.
    if (pathOnly === "/index.html") return res.redirect(301, "/" + query);

    if (!pathOnly.startsWith("/api")) {
      const target = redirectFor(pathOnly);
      if (target) return res.redirect(301, target + query);
    }

    // decodeURI for the same reason as production: wouter decodes, req paths
    // do not, and a raw compare would 404 a page the router renders.
    let decoded = pathOnly;
    try {
      decoded = decodeURI(pathOnly);
    } catch {
      /* malformed escape — leave it encoded and let it 404 */
    }
    const notFound = !isKnownRoute(decoded.toLowerCase());

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);

      // Same two transforms production runs in server/static.ts. Dev used to
      // skip both, which meant the head stamping and the prerendered body
      // could only ever be observed on kimoraco.com — the first sight of a bug
      // in either was a deploy.
      //
      // `url` (req.originalUrl), NOT req.path: this handler is mounted with
      // app.use("*", …), which makes Express rewrite req.url to "/" and put
      // the real path in req.baseUrl. req.path here is "/" for every route,
      // so every page would get the homepage's head. That is why the existing
      // code reads originalUrl. It carries the query string, which both
      // helpers strip via normalizePath.
      const stamped = injectBody(injectHead(page, url), url);

      res
        .status(notFound ? 404 : 200)
        .set({ "Content-Type": "text/html" })
        .end(stamped);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
