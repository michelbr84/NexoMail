// Re-export the database client
export { db } from "./client";
export type { DB } from "./client";

// Re-export all schema tables and types
export * from "./schema/index";
