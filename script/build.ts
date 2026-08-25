import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, writeFile, cp } from "fs/promises";

import { buildSitemapXml } from "../shared/seo";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  // sitemap.xml is generated rather than checked in so it can never drift from
  // the route table in shared/seo.ts. lastmod is the build date, which is
  // accurate for a site whose content only changes on deploy.
  console.log("writing sitemap...");
  await writeFile("dist/public/sitemap.xml", buildSitemapXml(), "utf-8");

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  // Internal tool pages (wholesale order sheet, cert admin, DTC sheet).
  //
  // These are deliberately NOT in client/public — that would put them in
  // dist/public, which Express serves to the whole internet, and the wholesale
  // sheet embeds gated pricing. They're copied next to the server bundle and
  // served only through the token gate in server/routes/toolRoutes.ts.
  console.log("copying internal tool pages...");
  await cp("server/tools", "dist/tools", { recursive: true });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
