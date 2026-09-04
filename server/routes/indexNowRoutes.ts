// server/routes/indexNowRoutes.ts
//
// Serves the IndexNow ownership key file.
//
// ⚠️ REGISTERED IN server/routes.ts, NOT in server/static.ts, and that is the
// load-bearing decision in this file.
//
// registerRoutes() runs before BOTH serveStatic() (production) and
// setupVite() (development) in server/index.ts, so one registration covers
// both environments and cannot drift. Putting it in static.ts would have
// meant writing it twice — and on 2026-09-04 this repo shipped a status-code
// change into static.ts and forgot vite.ts, twice in one afternoon. The
// second time was in the commit written to fix the first. Registering here
// makes that class of mistake unavailable rather than merely discouraged.
//
// It also has to come before the 404 handler at the bottom of static.ts,
// which now answers any path not in the ROUTES table with a real 404. The key
// file is not a route and never will be, so without this it would 404 — and a
// 404 on the key file means every IndexNow submission comes back 403.

import type { Express, Request, Response } from "express";

import { INDEXNOW_KEY, INDEXNOW_KEY_PATH } from "../../shared/indexnow";

export function registerIndexNowRoutes(app: Express) {
  app.get(INDEXNOW_KEY_PATH, (_req: Request, res: Response) => {
    // The spec requires a UTF-8 text file containing the key and nothing
    // else. "Nothing else" is literal: engines return 403 for "file found
    // but key not in the file," and a trailing newline is the obvious way to
    // get there by accident. res.send on a string sets no newline; keep it
    // that way.
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.type("text/plain; charset=utf-8").send(INDEXNOW_KEY);
  });
}
