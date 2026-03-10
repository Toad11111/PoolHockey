import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Persist across Next.js HMR reloads in dev so we don't leak connections
const globalForDb = globalThis as unknown as {
  _db: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

export function getDb() {
  if (!globalForDb._db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    const client = postgres(connectionString, { prepare: false, max: 5 });
    globalForDb._db = drizzle(client, { schema });
  }
  return globalForDb._db;
}

// For convenience — works in Next.js where env is available at import time.
// In scripts, use getDb() or just import db (it will be lazy-initialized on first access).
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
