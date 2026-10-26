import type { MetadataRoute } from 'next';

import { getSiteOrigin } from '@config/site';

/** Robots para o apex marketplace. Painéis auth/dealer/admin já usam noindex via metadata. */
export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/veiculos', '/lojas', '/para-lojistas'],
        disallow: ['/painel', '/admin', '/entrar', '/cadastrar', '/api/', '/design-system'],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin.replace(/^https?:\/\//, ''),
  };
}
