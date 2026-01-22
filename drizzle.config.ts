import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL. Ensure the database is provisioned.");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },

  // ✅ Force Drizzle to track migrations in public.__drizzle_migrations
  migrations: {
    table: "__drizzle_migrations",
    schema: "public",
  },
});
