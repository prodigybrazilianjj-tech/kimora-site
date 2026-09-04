// script/indexnow.ts — `npm run indexnow`
//
// Push every indexable URL to IndexNow. Run AFTER a deploy that changed page
// content, not on a schedule and not on boot.
//
// Why manual: Alex builds and deploys locally, so there is no CI step to hang
// this off, and a ping on server boot would assert "content changed" every
// time Render restarts the process. That is false most of the time and is
// what 429 exists for.
//
// Preflight first, because the failure modes are all silent-looking:
// a missing key file returns 403 from the endpoint with no hint as to why,
// and the key file is served by the app itself (server/routes/indexNowRoutes.ts),
// so "deployed?" and "key reachable?" are the same question.

import {
  INDEXNOW_KEY,
  INDEXNOW_KEY_PATH,
  indexNowUrls,
  isValidIndexNowKey,
  submitToIndexNow,
} from "../shared/indexnow";
import { SITE_ORIGIN } from "../shared/seo";

async function main() {
  const keyUrl = `${SITE_ORIGIN}${INDEXNOW_KEY_PATH}`;
  const urls = indexNowUrls();

  console.log(`IndexNow`);
  console.log(`  host     ${new URL(SITE_ORIGIN).host}`);
  console.log(`  key      ${INDEXNOW_KEY}`);
  console.log(`  key file ${keyUrl}`);
  console.log(`  urls     ${urls.length}`);
  console.log("");

  if (!isValidIndexNowKey(INDEXNOW_KEY)) {
    console.error(`✗ Key is not spec-valid (8–128 chars of a-zA-Z0-9-).`);
    process.exit(1);
  }

  // Preflight. A 403 from the endpoint is indistinguishable from a dozen
  // other problems; checking the key file first turns it into one sentence.
  process.stdout.write(`Checking key file… `);
  let live: Response;
  try {
    live = await fetch(`${keyUrl}?cb=${Date.now()}`, { cache: "no-store" });
  } catch (err) {
    console.error(`✗ could not reach ${keyUrl}: ${String(err)}`);
    process.exit(1);
  }
  if (!live.ok) {
    console.error(
      `✗ HTTP ${live.status}. The key file is served by the app, so this ` +
        `almost certainly means the current build is not deployed yet.`,
    );
    process.exit(1);
  }
  const served = (await live.text()).trim();
  if (served !== INDEXNOW_KEY) {
    console.error(
      `✗ key file contains "${served}", expected "${INDEXNOW_KEY}". ` +
        `The deployed build has a different key than this checkout.`,
    );
    process.exit(1);
  }
  console.log(`ok`);

  const result = await submitToIndexNow(urls);

  console.log("");
  console.log(`HTTP ${result.status} — ${result.meaning}`);
  if (result.body) console.log(result.body);

  if (!result.ok) process.exit(1);

  console.log("");
  console.log(`Submitted ${result.submitted} URLs.`);
  // Said explicitly because the URL Submission record on this project has
  // twice been read as "the page was recrawled." It was not.
  console.log(
    `⚠️  A 2xx means the engines RECEIVED these URLs. It is not a crawl, and ` +
      `it is not indexing. Verify in Bing Webmaster Tools → Site Explorer that ` +
      `"Last crawled" actually moves before recording this as fixed.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
