// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL missing. Ensure the database is provisioned.");
}

export default defineConfig({
  schema: "./shared/schema.ts",

  // 🔥 use standard drizzle folder name (prevents confusion)
  out: "./drizzle",

  dialect: "postgresql",

  dbCredentials: {
    url: process.env.DATABASE_URL,
  },

  // ✅ keep migrations table stable (DO NOT DELETE)
  migrations: {
    table: "__drizzle_migrations",
    schema: "public",
  },

  // ✅ this prevents drizzle from trying to "reconcile weird state"
  strict: true,

  // optional but nice for debugging
  verbose: true,
});