import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

import { injectBody, injectHead } from "./seo";

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

      res.status(200).set({ "Content-Type": "text/html" }).end(stamped);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
