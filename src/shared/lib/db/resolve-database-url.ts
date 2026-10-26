/**
 * Resolve URL/token do banco conforme `USE_LOCAL_DB`.
 *
 * - `USE_LOCAL_DB=true`  → SQLite local (`LOCAL_DATABASE_URL` ou `file:./.data/local.db`)
 * - `USE_LOCAL_DB=false` → Turso (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`)
 */

const DEFAULT_LOCAL_URL = 'file:./.data/local.db';

export type DatabaseCredentials = {
  url: string;
  authToken?: string;
  /** true quando o arquivo SQLite local está em uso. */
  isLocal: boolean;
};

export function isUseLocalDbEnabled(): boolean {
  return process.env.USE_LOCAL_DB === 'true';
}

export function resolveDatabaseCredentials(): DatabaseCredentials {
  if (isUseLocalDbEnabled()) {
    const url = process.env.LOCAL_DATABASE_URL?.trim() || DEFAULT_LOCAL_URL;

    return { url, isLocal: true };
  }

  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();

  if (!tursoUrl) {
    throw new Error(
      'USE_LOCAL_DB=false exige TURSO_DATABASE_URL. Defina USE_LOCAL_DB=true para o SQLite local ou configure o Turso.'
    );
  }

  if (tursoUrl.startsWith('file:')) {
    throw new Error(
      'USE_LOCAL_DB=false, mas TURSO_DATABASE_URL aponta para um arquivo local. Use a URL libsql:// do Turso ou USE_LOCAL_DB=true.'
    );
  }

  const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;

  return { url: tursoUrl, authToken, isLocal: false };
}
