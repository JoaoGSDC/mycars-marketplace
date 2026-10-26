/**
 * Resolve URL/token do banco conforme `USE_LOCAL_DB`.
 *
 * - `USE_LOCAL_DB=true`  → SQLite local (`LOCAL_DATABASE_URL` ou `file:./.data/local.db`)
 * - `USE_LOCAL_DB=false` → Turso (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`)
 *
 * Em Vercel / `NODE_ENV=production`, SQLite local é **sempre** ignorado (não existe disco persistente).
 */

const DEFAULT_LOCAL_URL = 'file:./.data/local.db';

export type DatabaseCredentials = {
  url: string;
  authToken?: string;
  /** true quando o arquivo SQLite local está em uso. */
  isLocal: boolean;
};

function isHostedProduction(): boolean {
  return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
}

export function isUseLocalDbEnabled(): boolean {
  if (isHostedProduction()) {
    return false;
  }

  return process.env.USE_LOCAL_DB === 'true';
}

export function resolveDatabaseCredentials(): DatabaseCredentials {
  if (isUseLocalDbEnabled()) {
    const url = process.env.LOCAL_DATABASE_URL?.trim() || DEFAULT_LOCAL_URL;

    return { url, isLocal: true };
  }

  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();

  if (!tursoUrl || tursoUrl.startsWith('file:')) {
    throw new Error(
      [
        'Banco remoto (Turso) obrigatório neste ambiente.',
        'Na Vercel, defina USE_LOCAL_DB=false, TURSO_DATABASE_URL=libsql://… e TURSO_AUTH_TOKEN.',
        'Localmente use USE_LOCAL_DB=true no .env.local.',
      ].join(' ')
    );
  }

  const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;

  if (!authToken && isHostedProduction()) {
    throw new Error('TURSO_AUTH_TOKEN é obrigatório em produção/Vercel.');
  }

  return { url: tursoUrl, authToken, isLocal: false };
}
