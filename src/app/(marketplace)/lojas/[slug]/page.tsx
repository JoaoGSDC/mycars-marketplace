import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { StorefrontHomeView } from '@features/storefront';
import { brand } from '@config/brand';
import { services } from '@services';
import { parseVehicleSearchParams } from '@utils/vehicle-search-params';

export const revalidate = 60;

type Params = Promise<{ slug: string }>;
type SearchParamsInput = Record<string, string | string[] | undefined>;

function toURLSearchParams(input: SearchParamsInput): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
    } else {
      params.set(key, value);
    }
  }

  return params;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const storefront = await services.storefront.getStorefrontBySlug(slug, 'path');

  if (!storefront) {
    return { title: 'Loja não encontrada', robots: { index: false, follow: true } };
  }

  return {
    title: `${storefront.name} | ${brand.name}`,
    description: storefront.tagline || storefront.about?.slice(0, 160) || `Veículos de ${storefront.name}`,
    alternates: { canonical: storefront.canonicalUrl },
    openGraph: {
      title: storefront.name,
      description: storefront.tagline || undefined,
      images: storefront.coverImageUrl ? [{ url: storefront.coverImageUrl }] : undefined,
    },
  };
}

export default async function LojaDetalhePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<SearchParamsInput>;
}) {
  const { slug } = await params;
  const raw = await searchParams;
  const filters = parseVehicleSearchParams(toURLSearchParams(raw));

  const storefront = await services.storefront.getStorefrontBySlug(slug, 'path');

  if (!storefront) {
    const redirected = await services.storefront.resolveSlugRedirect(slug);

    if (redirected) {
      permanentRedirect(`/lojas/${redirected}`);
    }

    notFound();
  }

  const result = await services.storefront.searchStoreVehicles(storefront.id, filters);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AutoDealer',
    name: storefront.name,
    url: storefront.canonicalUrl,
    address: {
      '@type': 'PostalAddress',
      addressLocality: storefront.city,
      addressRegion: storefront.state,
      addressCountry: 'BR',
    },
    image: storefront.logoUrl || storefront.coverImageUrl,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <StorefrontHomeView
        storefront={storefront}
        params={filters}
        result={result}
        mode="path"
      />
    </>
  );
}
