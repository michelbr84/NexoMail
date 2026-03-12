import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import path from "path";

// Load .env from monorepo root
config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
