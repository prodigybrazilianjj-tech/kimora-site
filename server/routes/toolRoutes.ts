// server/routes/toolRoutes.ts
//
// Internal tool pages (wholesale rep order sheet, resale-cert admin, DTC sheet).
//
// These used to live in `client/public/`, which meant Vite copied them into
// `dist/public/` and Express served them to ANYONE who knew the URL. The
// wholesale order sheet embeds gated wholesale pricing and margin figures, so
// that was a confidentiality leak.
//
// They now live in `server/tools/` (outside the client build) and are served
// only from here, behind a token gate:
//
//   GET  /tools/:name  → login form, or the page if a valid cookie is present
//   POST /tools/login  → checks the token, sets the cookie, redirects back
//
// The cookie is httpOnly + SameSite=Strict + Secure(prod), so (a) page JS can't
// read the token back out, and (b) no cross-site page can ride it to hit the
// API. The API routes accept that same cookie (see bearerTokenFromRequest), so
// the tool pages don't need to re-prompt for a token on every fetch.
//
// NOTE: kimora-reorder.html deliberately stays public in client/public — it's
// the customer-facing magic-link page for gyms, and it's protected by the
// HMAC-signed reorder token in the URL, not by this gate.

import type { Express, Request, Response } from "express";
import fs from "fs";
import path from "path";

import {
  TOOLS_COOKIE,
  adminToken,
  bearerTokenFromRequest,
  certToolPassword,
  matchesAny,
  wholesaleRepToken,
} from "../security";
import { rateLimit } from "../rateLimit";

// URL slug → filename. Only these three are servable; anything else 404s, so
// this can't be turned into a read-any-file primitive.
const TOOL_PAGES: Record<string, string> = {
  wholesale: "kimora-wholesale.html",
  "wholesale-certs": "kimora-wholesale-certs.html",
  dtc: "kimora-dtc.html",
};

const COOKIE_MAX_AGE_SEC = 12 * 60 * 60; // 12h — a working session, then re-auth.

// Brute-force brake on the login form: 10 attempts per IP per 15 min.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many attempts. Please wait 15 minutes and try again.",
});

/**
 * Where the tool HTML lives at runtime.
 * - prod: esbuild bundles the server to dist/index.cjs, and script/build.ts
 *   copies server/tools → dist/tools, so it sits next to the bundle.
 * - dev: run straight from the repo.
 */
function toolsDir(): string {
  if (process.env.NODE_ENV === "production") {
    return path.resolve(__dirname, "tools");
  }
  return path.resolve(process.cwd(), "server", "tools");
}

/** Any credential that unlocks the tools gate. */
function toolsTokenOk(presented: string): boolean {
  return matchesAny(
    presented,
    adminToken(),
    wholesaleRepToken(),
    certToolPassword(),
  );
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loginPage(slug: string, error?: string) {
  const safeSlug = escapeHtml(slug);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Kimora — Internal Tools</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#12100e; color:#f3efe7; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
  .card { width:100%; max-width:360px; padding:28px 24px; background:#1b1815; border:1px solid #2e2925; border-radius:14px; }
  h1 { margin:0 0 4px; font-size:17px; letter-spacing:.02em; }
  p  { margin:0 0 18px; font-size:13px; color:#9a9088; }
  label { display:block; font-size:12px; color:#9a9088; margin-bottom:6px; }
  input { width:100%; box-sizing:border-box; padding:11px 12px; border-radius:9px;
          border:1px solid #2e2925; background:#12100e; color:#f3efe7; font-size:15px; }
  button { width:100%; margin-top:14px; padding:11px 12px; border:0; border-radius:9px;
           background:#c8a96e; color:#171310; font-weight:700; font-size:14px; cursor:pointer; }
  .err { margin:12px 0 0; padding:9px 11px; border-radius:8px; font-size:12px;
         background:#3a1f1f; border:1px solid #5c2b2b; color:#f0b4b4; }
</style>
</head>
<body>
  <form class="card" method="POST" action="/tools/login">
    <h1>Kimora internal tools</h1>
    <p>This page is private. Enter your access token to continue.</p>
    <input type="hidden" name="next" value="${safeSlug}">
    <label for="key">Access token</label>
    <input id="key" name="key" type="password" autocomplete="current-password" autofocus>
    <button type="submit">Unlock</button>
    ${error ? `<div class="err">${escapeHtml(error)}</div>` : ""}
  </form>
</body>
</html>`;
}

export function registerToolRoutes(app: Express) {
  // Never let these pages be indexed or cached by a shared cache.
  function noStore(res: Response) {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
  }

  app.post("/tools/login", loginLimiter, (req: Request, res: Response) => {
    noStore(res);

    const key = String((req.body as any)?.key ?? "").trim();
    const nextRaw = String((req.body as any)?.next ?? "").trim();
    // Only ever redirect to a known slug — no open redirect.
    const slug = TOOL_PAGES[nextRaw] ? nextRaw : "wholesale";

    if (!toolsTokenOk(key)) {
      return res
        .status(401)
        .type("html")
        .send(loginPage(slug, "Incorrect token. Try again."));
    }

    res.cookie?.(TOOLS_COOKIE, key, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE_SEC * 1000,
      path: "/",
    });

    // Express <5 has res.cookie; fall back to a raw header if it's ever absent.
    if (typeof (res as any).cookie !== "function") {
      const attrs = [
        `${TOOLS_COOKIE}=${encodeURIComponent(key)}`,
        "HttpOnly",
        "SameSite=Strict",
        "Path=/",
        `Max-Age=${COOKIE_MAX_AGE_SEC}`,
        process.env.NODE_ENV === "production" ? "Secure" : "",
      ].filter(Boolean);
      res.setHeader("Set-Cookie", attrs.join("; "));
    }

    return res.redirect(302, `/tools/${slug}`);
  });

  app.post("/tools/logout", (_req: Request, res: Response) => {
    noStore(res);
    res.setHeader(
      "Set-Cookie",
      `${TOOLS_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`,
    );
    return res.redirect(302, "/tools/wholesale");
  });

  app.get("/tools/:name", (req: Request, res: Response) => {
    noStore(res);

    const slug = String(req.params.name ?? "").trim();
    const file = TOOL_PAGES[slug];
    if (!file) return res.status(404).json({ ok: false, message: "Not found." });

    if (!toolsTokenOk(bearerTokenFromRequest(req))) {
      return res.status(401).type("html").send(loginPage(slug));
    }

    const full = path.resolve(toolsDir(), file);
    if (!fs.existsSync(full)) {
      console.error(`[tools] missing tool file: ${full}`);
      return res.status(500).json({ ok: false, message: "Tool page not found on server." });
    }

    return res.type("html").send(fs.readFileSync(full, "utf-8"));
  });
}
