import { NextResponse, type NextRequest } from 'next/server';

import {
  STOREFRONT_RESOLVED_HEADER,
  STOREFRONT_SUBDOMAIN_HEADER,
  getRootDomain,
} from '@config/site';
import { resolveHostSubdomain } from '@utils/tenant-host';

/** Remove headers de tenant do cliente — só o proxy pode defini-los após Host confiável. */
function scrubStorefrontHeaders(headers: Headers): Headers {
  const next = new Headers(headers);
  next.delete(STOREFRONT_SUBDOMAIN_HEADER);
  next.delete(STOREFRONT_RESOLVED_HEADER);

  return next;
}

function withTrustedStorefrontHeaders(headers: Headers, subdomain: string): Headers {
  const next = scrubStorefrontHeaders(headers);
  next.set(STOREFRONT_SUBDOMAIN_HEADER, subdomain);
  next.set(STOREFRONT_RESOLVED_HEADER, '1');

  return next;
}

/**
 * Proxy (Next.js 16): resolve subdomínio → rewrite interno `/vitrine/*`.
 * O subdomínio só é aceito quando o Host termina com ROOT_DOMAIN.
 * Nunca confiar em query/header do cliente para tenant.
 */
export function proxy(request: NextRequest) {
  const host = request.headers.get('host');
  const rootDomain = getRootDomain();
  const resolution = resolveHostSubdomain(host, rootDomain);

  if (resolution.kind !== 'storefront') {
    const cleaned = scrubStorefrontHeaders(request.headers);

    return NextResponse.next({
      request: { headers: cleaned },
    });
  }

  const { subdomain } = resolution;
  const { pathname, search } = request.nextUrl;

  // Evita loop se já estiver no path interno
  if (pathname.startsWith('/vitrine')) {
    return NextResponse.next({
      request: { headers: withTrustedStorefrontHeaders(request.headers, subdomain) },
    });
  }

  // Rotas de plataforma no subdomínio → apex
  if (
    pathname.startsWith('/painel') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/entrar') ||
    pathname.startsWith('/para-lojistas')
  ) {
    const apex = request.nextUrl.clone();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `http://${rootDomain}`;

    try {
      const origin = new URL(siteUrl);
      apex.protocol = origin.protocol;
      apex.host = origin.host;
    } catch {
      // mantém host atual
    }

    return NextResponse.redirect(apex);
  }

  const rewriteUrl = request.nextUrl.clone();

  if (pathname === '/' || pathname === '') {
    rewriteUrl.pathname = '/vitrine';
  } else if (pathname.startsWith('/veiculos')) {
    rewriteUrl.pathname = `/vitrine${pathname}`;
  } else if (pathname.startsWith('/lojas')) {
    // no subdomínio, /lojas não faz sentido — manda para home da vitrine
    rewriteUrl.pathname = '/vitrine';
  } else {
    rewriteUrl.pathname = `/vitrine${pathname}`;
  }

  rewriteUrl.search = search;

  return NextResponse.rewrite(rewriteUrl, {
    request: { headers: withTrustedStorefrontHeaders(request.headers, subdomain) },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
