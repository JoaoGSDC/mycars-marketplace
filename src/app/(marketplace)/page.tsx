import type { Metadata } from 'next';

import { brand } from '@config/brand';
import { MarketplaceHomeView, homeContent } from '@features/marketplace';

/**
 * Cache curto: a Home não deve exibir como disponível um veículo já vendido.
 * Mutações de anúncio invalidam `public-catalog` via `updateTag`.
 */
export const revalidate = 60;

export const metadata: Metadata = {
  title: homeContent.metadata.title,
  description: homeContent.metadata.description,
  openGraph: {
    title: homeContent.metadata.title,
    description: homeContent.metadata.description,
    type: 'website',
    locale: brand.locale,
    images: [
      {
        url: '/images/og-placeholder.svg',
        width: 1200,
        height: 630,
        alt: brand.name,
      },
    ],
  },
};

export default MarketplaceHomeView;
