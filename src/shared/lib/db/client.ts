import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';

import * as schema from './schema';

export type AppDatabase = LibSQLDatabase<typeof schema>;

let client: Client | null = null;
let db: AppDatabase | null = null;

function resolveDatabaseUrl(): string {
  const url = process.env.TURSO_DATABASE_URL;

  if (!url) {
    throw new Error(
      'TURSO_DATABASE_URL não definida. Copie `.env.example` para `.env.local` (ex.: file:./.data/local.db).'
    );
  }

  return url;
}

/** Cliente libSQL singleton (server-only). */
export function getDbClient(): Client {
  if (client) {
    return client;
  }

  const url = resolveDatabaseUrl();
  const authToken = process.env.TURSO_AUTH_TOKEN;

  client = createClient({
    url,
    authToken: authToken || undefined,
  });

  return client;
}

/** Instância Drizzle singleton com schema tipado. */
export function getDb(): AppDatabase {
  if (db) {
    return db;
  }

  db = drizzle(getDbClient(), { schema });

  return db;
}

/** Reinicia singletons — útil em testes. */
export function resetDbSingletons(): void {
  if (client) {
    client.close();
  }

  client = null;
  db = null;
}
