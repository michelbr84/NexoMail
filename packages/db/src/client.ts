import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

// Lazy singleton — only connects when first accessed at runtime.
// This prevents Next.js from throwing during build-time static analysis
// when DATABASE_URL is not available in the build environment.
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL environment variable is not set");
    const client = postgres(url);
    _db = drizzle(client, { schema });
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle<typeof schema>>];
  },
});

export type DB = typeof db;
