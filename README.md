# Kimora Site

Marketing website and storefront for Kimora Co. — Creatine + Electrolytes.

React + Vite client, Express server, Postgres via Drizzle, Stripe checkout.
Client-rendered SPA with server-side `<head>` stamping and a crawler-visible
body fallback (see "SEO architecture" below).

## Getting started

```bash
npm ci --include=dev     # see the NODE_ENV gotcha below
npm run dev              # dev server, http://localhost:5000
```

| Script | What it does |
|---|---|
| `npm run dev` | Express + Vite middleware, hot reload |
| `npm run dev:client` | Vite alone, no API |
| `npm run build` | `script/build.ts` — vite client build → generate `dist/public/sitemap.xml` → esbuild server bundle → copy `server/tools` |
| `npm start` | Production: `node dist/index.cjs` |
| `npm run check` | `tsc` (not part of the build) |
| `npm run db:push` | Drizzle schema push |

### ⚠️ `npm ci` and NODE_ENV

If `NODE_ENV=production` is set in your shell, **`npm ci` silently omits every
devDependency** — `tsx`, `vite`, `esbuild`, `typescript`, `cross-env`. The
symptom is `'tsx' is not recognized` when you run `npm run build`.

```powershell
$env:NODE_ENV = ""        # PowerShell
npm ci --include=dev
```

Note also that `tsx` is currently declared in **both** `dependencies` and
`devDependencies`; the dev entry shadows the runtime one. Production doesn't
need it (`npm start` runs plain `node`), so the `dependencies` entry is
vestigial.

### ⚠️ Rebuilding while the server runs

`script/build.ts` deletes `dist/` as its first act, and `npm start` holds it
open. **Stop the server before rebuilding**, or you will test stale artifacts
and every check will pass against old code.

## Deployment

**Render** — web service `kimora-site` (Node, Starter), **auto-deploys from
GitHub `main`**. Serving `www.kimoraco.com`, behind Cloudflare, DNS at GoDaddy.

**There is no deploy step. Pushing to `main` is the deploy.**

```bash
git push origin main     # Render picks it up within ~a minute
```

Render's dashboard keeps a per-commit event log with rollback buttons. Deploys
take a couple of minutes; watch for "Deploy live for `<sha>`".

Verify production afterwards — and **join the output to a string first**, because
`curl.exe -s` returns a string *array* in PowerShell and `-notmatch` on an array
is a filter, not a boolean, so `if ($h -notmatch "…")` is truthy against any page:

```powershell
function Get-Live($p) { (curl.exe -s "https://www.kimoraco.com$p") -join "`n" }
(Get-Live "/sitemap.xml" | Select-String '<loc>' -AllMatches).Matches.Count   # expect 12
```

## SEO architecture

Three pieces, all server-side, because the crawlers this is for
(GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot) do not execute JavaScript:

- **`shared/seo.ts`** — the route table. One source for the head metadata, the
  sitemap, and the JSON-LD. A route missing from here ships `noindex` and is
  absent from the sitemap, deliberately fail-closed.
- **`server/seo.ts`** — `injectHead()` stamps title/description/canonical/robots/
  OG/JSON-LD per request; `injectBody()` puts authored fallback prose inside
  `<div id="root">`. All JSON-LD is emitted as **one `<script>` with an
  `@graph`** so `@id` references resolve across nodes.
- **`shared/prerender.ts`** — the fallback body content. **Served to every user
  agent, never branched on request headers.** That, plus living inside `#root`
  where React replaces it, plus saying only what the rendered page says, is what
  makes it progressive enhancement rather than cloaking. A user-agent check in
  that path would be a bug.

Content lives in **`client/src/lib/articles.ts`** as structured blocks, not
markdown — the server has to render the same prose to HTML, and a client-side
markdown renderer would leave the corpus invisible to its intended readers.
Adding an article there puts it on `/learn`, in the route table, in the sitemap,
in the prerendered body and in the Article JSON-LD with no other edits.

Full program docs, standing query set and run history live in
`Kimora - Executive Operator/reports/seo-ai-shelf/`.

## Repo

- Default branch: `main`
- Pre-launch gate: `client/src/lib/prelaunch.ts` — `PRELAUNCH_GATE` makes the
  store browsable but nothing purchasable. Flip one constant to launch.
