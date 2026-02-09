import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL missing. Ensure the database is provisioned.");
}

export default defineConfig({
  out: "./migrations",
  schema: ["./shared/schema.ts", "./shared/wholesaleApplications.ts"],
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    table: "__drizzle_migrations",
    schema: "public",
  },
});
