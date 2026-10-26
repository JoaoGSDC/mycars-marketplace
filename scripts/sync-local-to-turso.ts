/**
 * Copia dados do SQLite local → Turso (substitui o conteúdo das tabelas de domínio).
 *
 * Uso:
 *   USE_LOCAL_DB=false \
 *   LOCAL_DATABASE_URL=file:./.data/local.db \
 *   TURSO_DATABASE_URL=libsql://… \
 *   TURSO_AUTH_TOKEN=… \
 *   npx tsx scripts/sync-local-to-turso.ts
 *
 * Não altera `__drizzle_migrations` (schema já migrado no remoto).
 */

import { config } from 'dotenv';
import { createClient, type Client, type InValue } from '@libsql/client';

config({ path: '.env.local' });
config({ path: '.env' });

const SKIP_TABLES = new Set(['__drizzle_migrations', 'sqlite_sequence']);

/** Ordem de delete (filhos → pais). Insert inverte. */
const DELETE_ORDER = [
  'opportunity_activities',
  'opportunity_assignments',
  'follow_up_tasks',
  'opportunities',
  'sale_events',
  'sales',
  'reservation_events',
  'reservations',
  'listing_engagement_events',
  'listing_leads',
  'listing_reports',
  'listings',
  'vehicle_availability_confirmations',
  'vehicle_costs',
  'vehicle_media',
  'vehicles',
  'media_assets',
  'customers',
  'privacy_requests',
  'job_runs',
  'audit_events',
  'fipe_price_cache',
  'store_invites',
  'store_memberships',
  'store_slug_redirects',
  'store_subscriptions',
  'storefront_settings',
  'store_integrity_policies',
  'stores',
  'session',
  'account',
  'verification',
  'users',
  'plans',
] as const;

async function listTables(client: Client): Promise<string[]> {
  const result = await client.execute(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
  );
  return result.rows.map((row) => String(row.name));
}

async function readTable(client: Client, table: string): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  const info = await client.execute(`PRAGMA table_info(${quoteIdent(table)})`);
  const columns = info.rows.map((row) => String(row.name));
  const data = await client.execute(`SELECT * FROM ${quoteIdent(table)}`);
  const rows = data.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    for (const col of columns) {
      obj[col] = row[col];
    }
    return obj;
  });
  return { columns, rows };
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function toArgs(row: Record<string, unknown>, columns: string[]): InValue[] {
  return columns.map((col) => {
    const value = row[col];
    if (value === undefined) {
      return null;
    }
    if (typeof value === 'bigint') {
      return Number(value);
    }
    return value as InValue;
  });
}

async function main() {
  const localUrl = process.env.LOCAL_DATABASE_URL?.trim() || 'file:./.data/local.db';
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
  const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (!tursoUrl || tursoUrl.startsWith('file:')) {
    throw new Error('Defina TURSO_DATABASE_URL=libsql://… (e TURSO_AUTH_TOKEN) para o destino.');
  }

  if (!tursoToken) {
    throw new Error('TURSO_AUTH_TOKEN é obrigatório.');
  }

  console.log('Origem:', localUrl);
  console.log('Destino:', tursoUrl);

  const source = createClient({ url: localUrl });
  const target = createClient({ url: tursoUrl, authToken: tursoToken });

  const sourceTables = new Set(await listTables(source));
  const targetTables = new Set(await listTables(target));

  const tables = DELETE_ORDER.filter(
    (table) => sourceTables.has(table) && targetTables.has(table) && !SKIP_TABLES.has(table)
  );

  const extras = [...sourceTables].filter(
    (table) => !SKIP_TABLES.has(table) && !DELETE_ORDER.includes(table as (typeof DELETE_ORDER)[number])
  );

  if (extras.length) {
    console.warn('Tabelas não listadas na ordem (serão puladas):', extras.join(', '));
  }

  console.log(`Limpando ${tables.length} tabelas no Turso…`);
  await target.execute('PRAGMA foreign_keys = OFF');

  for (const table of tables) {
    await target.execute(`DELETE FROM ${quoteIdent(table)}`);
  }

  console.log('Copiando…');
  let totalRows = 0;

  for (const table of [...tables].reverse()) {
    const { columns, rows } = await readTable(source, table);

    if (rows.length === 0) {
      console.log(`  ${table}: 0`);
      continue;
    }

    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${quoteIdent(table)} (${columns.map(quoteIdent).join(', ')}) VALUES (${placeholders})`;

    const batchSize = 40;

    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      await target.batch(
        chunk.map((row) => ({
          sql,
          args: toArgs(row, columns),
        })),
        'write'
      );
    }

    totalRows += rows.length;
    console.log(`  ${table}: ${rows.length}`);
  }

  await target.execute('PRAGMA foreign_keys = ON');

  console.log(`Concluído. ${totalRows} linhas copiadas.`);
  console.log(
    'Nota: URLs de mídia locais (/api/media/…) não existirão no R2 — fotos podem quebrar até reupload.'
  );

  source.close();
  target.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
