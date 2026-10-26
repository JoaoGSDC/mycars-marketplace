import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';

import { resolveDatabaseCredentials } from './resolve-database-url';
import * as schema from './schema';

export type AppDatabase = LibSQLDatabase<typeof schema>;

let client: Client | null = null;
let db: AppDatabase | null = null;

/** Cliente libSQL singleton (server-only). */
export function getDbClient(): Client {
  if (client) {
    return client;
  }

  const { url, authToken } = resolveDatabaseCredentials();

  client = createClient({
    url,
    authToken,
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
