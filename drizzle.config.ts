import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/deployment-schema.ts",
  dialect: "postgresql",
  // Never introspect public: this database also contains unrelated LUKAS data.
  schemaFilter: ["companion"],
  tablesFilter: ["saved_loadouts", "sessions", "ai_usage", "user_premium"],
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
