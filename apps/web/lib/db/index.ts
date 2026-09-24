import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

// Supabase's session-mode pooler allows few concurrent clients per database;
// keeping the per-process pool small lets a dev server and a prod server (or
// Drizzle Studio) coexist without exhausting the pool (EMAXCONNSESSION).
const MAX_CONNECTIONS = 5;

function createDatabase(connectionUrl: string): Database {
  const client = postgres(connectionUrl, {
    max: MAX_CONNECTIONS,
    // Supabase's transaction pooler (port 6543) does not support prepared
    // statements; disabling them is safe under every Supabase pooler mode.
    prepare: false,
  });
  return drizzle(client, { schema });
}

function requireDatabaseUrl(): string {
  const connectionUrl = process.env.DATABASE_URL;
  if (!connectionUrl) {
    throw new Error(
      "DATABASE_URL is not set — add it to apps/web/.env.local (see .env.example for the Supabase connection string)."
    );
  }
  return connectionUrl;
}

// Next.js dev hot-reload re-evaluates modules; the globalThis cache keeps a
// single connection pool per process instead of one pool per reload.
const globalForDatabase = globalThis as unknown as {
  __colyglotDatabase?: Database;
};

export function getDb(): Database {
  globalForDatabase.__colyglotDatabase ??= createDatabase(requireDatabaseUrl());
  return globalForDatabase.__colyglotDatabase;
}
