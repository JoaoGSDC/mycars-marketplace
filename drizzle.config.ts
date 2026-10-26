import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.local' });
config({ path: '.env' });

/**
 * Mesma regra da app: USE_LOCAL_DB=true → arquivo local; false → Turso.
 * Override pontual: `TURSO_DATABASE_URL=... npm run db:migrate` (com USE_LOCAL_DB=false).
 */
const useLocal = process.env.USE_LOCAL_DB === 'true';
const localUrl = process.env.LOCAL_DATABASE_URL?.trim() || 'file:./.data/local.db';
const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();

const url = useLocal ? localUrl : tursoUrl || localUrl;

export default defineConfig({
  schema: './src/shared/lib/db/schema/index.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url,
    authToken: useLocal ? undefined : process.env.TURSO_AUTH_TOKEN,
  },
  strict: true,
  verbose: true,
});
