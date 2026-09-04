// ─────────────────────────────────────────────────────────────────────────
// IndexNow — tell search engines a page changed, instead of asking them to
// come and look.
//
// WHY THIS EXISTS, and it is worth reading before touching any of it.
//
// On 2026-09-04 Bing Webmaster Tools showed its indexed copy of
// https://www.kimoraco.com/ was last crawled **7 August 2026**, at 5.2 KB —
// the empty SPA shell, before the prerender, before the corrected flavour
// list, before the meta description. Bing's own URL Inspection reported
// "Meta Description tag missing" and "H1 tag missing" against the index copy
// while the live fetch of the same URL, taken minutes later, reported no
// issues at all. Four URLs were indexed in total; not one /learn article.
//
// The homepage had been pushed through URL Submission twice — 25 Aug and
// 31 Aug — and had not been re-crawled either time. Meanwhile Bing crawled
// sitemap.xml successfully on 3 September and discovered all 13 URLs. So the
// crawler was active on the site and simply had not refetched the page.
//
// ⚠️ AND: "Request indexing" in URL Inspection is the SAME mechanism as bulk
// URL Submission — firing it decremented the shared 100/day quota from 100 to
// 99 and the URL appeared in the same Submitted URLs list. It is not a
// second, stronger lever. There was only ever one, and it has not worked.
//
// IndexNow is a different mechanism: a push notification rather than an entry
// on a list. Submissions are shared across every participating engine, which
// as of 2026-09 includes Bing (and therefore Microsoft Copilot), Yandex,
// Seznam and Naver. **Google does not participate** — Google's side of this
// problem still needs the Rich Results Test / Search Console route.
//
// Spec read from https://www.indexnow.org/documentation on 2026-09-04 rather
// than from memory. The facts that constrain the code below:
//   - Key is 8–128 chars from [a-zA-Z0-9-].
//   - Ownership is proved by hosting {key}.txt at the host root, containing
//     the key and nothing else. That is Option 1, and the spec says outright
//     it is "strongly recommended" over the keyLocation variant.
//   - Bulk submit is POST /indexnow with {host, key, urlList}, up to 10,000.
//   - 200 OK · 202 accepted, key validation pending · 400 bad format ·
//     403 key invalid or not found in the file · 422 URL/host mismatch ·
//     429 too many requests.
//   - A 200 means the engine RECEIVED the URL. It does not mean anything was
//     crawled or indexed. Do not report a 200 as a fixed crawl — that is the
//     same mistake the URL Submission record made twice.
// ─────────────────────────────────────────────────────────────────────────

import { ROUTES, SITE_ORIGIN, canonicalFor } from "./seo";

/**
 * The IndexNow key.
 *
 * NOT a secret, and deliberately so: the protocol works by publishing this
 * value at a well-known URL on the host, so anyone can read it. What it
 * proves is that whoever submits a URL for this host could also write a file
 * to this host's root. Committing it is correct; hiding it would break the
 * mechanism it exists for.
 *
 * Overridable by env only so the key can be ROTATED without a code change.
 * If it is ever rotated, the old {key}.txt may be left in place — engines
 * cache key validation and the spec says the key is used "until you change
 * the key," so removing the old file the same minute is the one way to get a
 * spurious 403.
 */
export const INDEXNOW_KEY =
  process.env.INDEXNOW_KEY?.trim() || "773db99a03ce3900072c89abfe140fc9";

/** The path the key file is served from. Root of the host, per Option 1. */
export const INDEXNOW_KEY_PATH = `/${INDEXNOW_KEY}.txt`;

/**
 * The shared endpoint. Submitting here fans out to every participating
 * engine, which is the whole point — submitting to bing.com/indexnow
 * directly would work but would opt out of the fan-out for no gain.
 */
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/** `www.kimoraco.com` — the host field, no scheme, no trailing slash. */
export function indexNowHost(): string {
  return new URL(SITE_ORIGIN).host;
}

/**
 * Validate the key against the spec's character class and length.
 *
 * Exported and called at submit time rather than trusted, because the env
 * override above means the key can arrive from outside the repo. A malformed
 * key produces a 400 or 403 from the endpoint, which is a confusing way to
 * find out about a typo in an environment variable.
 */
export function isValidIndexNowKey(key: string): boolean {
  return /^[a-zA-Z0-9-]{8,128}$/.test(key);
}

/**
 * Every indexable route, as absolute URLs.
 *
 * Reads the same ROUTES table the sitemap, the head stamper and robots.txt
 * read, so an article added to client/src/lib/articles.ts is submitted
 * without anyone remembering to add it here — the same property that made
 * the route table worth having in the first place.
 *
 * `indexable: false` routes are excluded, which matters more than it looks:
 * /manage-subscription is noindex AND disallowed in robots.txt, and pushing
 * it to an engine would be asking for exactly the indexing we spent
 * 2026-09-04 removing.
 */
export function indexNowUrls(): string[] {
  return ROUTES.filter((r) => r.indexable).map((r) => canonicalFor(r.path));
}

export interface IndexNowResult {
  status: number;
  ok: boolean;
  /** What the status code means, per the spec's own table. */
  meaning: string;
  body: string;
  submitted: number;
}

/** The spec's response table, so a caller never has to guess. */
function meaningOf(status: number): string {
  switch (status) {
    case 200:
      return "OK — URLs received. NOT a statement that anything was crawled.";
    case 202:
      return "Accepted — URLs received, key validation still pending.";
    case 400:
      return "Bad request — invalid format.";
    case 403:
      return `Forbidden — key not valid. Check ${SITE_ORIGIN}${INDEXNOW_KEY_PATH} is reachable and contains exactly the key.`;
    case 422:
      return "Unprocessable — a URL does not belong to the host, or the key does not match the schema.";
    case 429:
      return "Too many requests — back off.";
    default:
      return "Unexpected status; see body.";
  }
}

/**
 * Submit a set of URLs. Defaults to every indexable route.
 *
 * Deliberately NOT called on server boot. A boot ping would claim "this
 * content changed" every time Render restarts the process, which is false
 * most of the time and is the behaviour the spec's 429 exists to punish.
 * This is invoked explicitly — see script/indexnow.ts and `npm run indexnow`.
 */
export async function submitToIndexNow(
  urls: string[] = indexNowUrls(),
): Promise<IndexNowResult> {
  if (!isValidIndexNowKey(INDEXNOW_KEY)) {
    throw new Error(
      `INDEXNOW_KEY is not spec-valid (8–128 chars of a-zA-Z0-9-): "${INDEXNOW_KEY}"`,
    );
  }
  if (urls.length === 0) throw new Error("No URLs to submit.");
  if (urls.length > 10000) throw new Error("IndexNow accepts max 10,000 URLs per POST.");

  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: indexNowHost(),
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_ORIGIN}${INDEXNOW_KEY_PATH}`,
      urlList: urls,
    }),
  });

  return {
    status: res.status,
    ok: res.status === 200 || res.status === 202,
    meaning: meaningOf(res.status),
    body: await res.text().catch(() => ""),
    submitted: urls.length,
  };
}
