/**
 * Resolução pura de hostname → subdomínio de vitrine.
 * Sem I/O — usada no proxy e em testes.
 */

export const RESERVED_SUBDOMAINS = new Set([
  'www',
  'api',
  'app',
  'admin',
  'painel',
  'auth',
  'login',
  'static',
  'assets',
  'media',
  'cdn',
  'img',
  'images',
  'mail',
  'smtp',
  'ftp',
  'status',
  'staging',
  'stage',
  'preview',
  'dev',
  'test',
  'docs',
  'help',
  'support',
  'lojas',
  'vitrine',
  'veiculos',
  'marketplace',
  'www2',
  'm',
]);

export type HostResolution =
  | { kind: 'apex' }
  | { kind: 'storefront'; subdomain: string }
  | { kind: 'reserved'; subdomain: string }
  | { kind: 'unknown_host' }
  | { kind: 'invalid' };

function stripPort(host: string): { hostname: string; port: string | null } {
  const cleaned = host.trim().toLowerCase().replace(/\.$/, '');

  if (cleaned.startsWith('[')) {
    return { hostname: cleaned, port: null };
  }

  const idx = cleaned.lastIndexOf(':');

  if (idx > -1 && cleaned.includes('.') === false && /^\d+$/.test(cleaned.slice(idx + 1))) {
    // hostname:port sem pontos (improvável) — tratar como host:port
  }

  if (idx > -1 && /^\d+$/.test(cleaned.slice(idx + 1))) {
    return { hostname: cleaned.slice(0, idx), port: cleaned.slice(idx + 1) };
  }

  return { hostname: cleaned, port: null };
}

function normalizeRootDomain(rootDomain: string): { hostname: string; port: string | null } {
  return stripPort(rootDomain.replace(/^https?:\/\//, '').replace(/\/$/, ''));
}

/**
 * @param host Header Host (pode incluir porta)
 * @param rootDomain ROOT_DOMAIN (ex.: mycars.com.br ou localhost:3000)
 */
export function resolveHostSubdomain(host: string | null | undefined, rootDomain: string): HostResolution {
  if (!host?.trim()) {
    return { kind: 'invalid' };
  }

  const incoming = stripPort(host);
  const root = normalizeRootDomain(rootDomain);

  // Preview / hosts não gerenciados (ex.: *.vercel.app) quando ROOT_DOMAIN é outro
  if (
    incoming.hostname !== root.hostname &&
    !incoming.hostname.endsWith(`.${root.hostname}`)
  ) {
    return { kind: 'unknown_host' };
  }

  if (incoming.hostname === root.hostname) {
    return { kind: 'apex' };
  }

  const suffix = `.${root.hostname}`;

  if (!incoming.hostname.endsWith(suffix)) {
    return { kind: 'unknown_host' };
  }

  const sub = incoming.hostname.slice(0, -suffix.length);

  if (!sub || sub.includes('.')) {
    // multi-level (a.b.domain) — não suportado
    return { kind: 'invalid' };
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sub)) {
    return { kind: 'invalid' };
  }

  if (RESERVED_SUBDOMAINS.has(sub)) {
    return { kind: 'reserved', subdomain: sub };
  }

  return { kind: 'storefront', subdomain: sub };
}

export function buildStorefrontOrigin(subdomain: string, rootDomain: string): string {
  const root = normalizeRootDomain(rootDomain);
  const host = root.port ? `${subdomain}.${root.hostname}:${root.port}` : `${subdomain}.${root.hostname}`;
  const isLocal = root.hostname === 'localhost' || root.hostname === '127.0.0.1';

  return `${isLocal ? 'http' : 'https'}://${host}`;
}
