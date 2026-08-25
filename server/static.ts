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

  app.use(express.static(distPath));

  // The SPA shell, read once. Every route is served this same file, so the
  // head has to be stamped per-request or the whole site reports the
  // homepage's title and description. See server/seo.ts.
  const indexPath = path.resolve(distPath, "index.html");
  const template = fs.readFileSync(indexPath, "utf-8");

  // Only fall through to index.html for NON-API routes
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) return next();

    res
      .status(200)
      .type("html")
      .send(injectHead(template, req.path));
  });
}
