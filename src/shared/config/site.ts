/**
 * Domínio raiz da plataforma (sem protocolo).
 * Exemplos: `mycars.com.br`, `localhost:3000`
 */
export function getRootDomain(): string {
  const explicit = process.env.ROOT_DOMAIN?.trim();

  if (explicit) {
    return explicit.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  try {
    const url = new URL(siteUrl);

    return url.port ? `${url.hostname}:${url.port}` : url.hostname;
  } catch {
    return 'localhost:3000';
  }
}

export function getSiteOrigin(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (siteUrl) {
    return siteUrl.replace(/\/$/, '');
  }

  const root = getRootDomain();

  if (root.startsWith('localhost') || root.startsWith('127.0.0.1')) {
    return `http://${root}`;
  }

  return `https://${root}`;
}

/** Header interno setado pelo proxy — nunca confiar em valor vindo do cliente. */
export const STOREFRONT_SUBDOMAIN_HEADER = 'x-mycars-storefront-subdomain';

/** Header indicando origem da resolução (proxy). */
export const STOREFRONT_RESOLVED_HEADER = 'x-mycars-storefront-resolved';
