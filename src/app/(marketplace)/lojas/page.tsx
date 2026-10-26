import type { Metadata } from 'next';

import { StorefrontDirectoryView } from '@features/storefront';
import { brand } from '@config/brand';
import { services } from '@services';
import {
  STORE_DIRECTORY_PAGE_SIZE,
  parseStoreDirectoryParams,
  serializeStoreDirectoryParams,
  type StoreDirectoryParams,
} from '@utils/store-directory-params';

export const revalidate = 60;

type SearchParamsInput = Record<string, string | string[] | undefined>;

function toURLSearchParams(input: SearchParamsInput): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        params.append(key, entry);
      });
    } else {
      params.set(key, value);
    }
  }

  return params;
}

function directoryViewKey(params: StoreDirectoryParams): string {
  return serializeStoreDirectoryParams(params);
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}): Promise<Metadata> {
  const raw = await searchParams;
  const params = parseStoreDirectoryParams(toURLSearchParams(raw));
  const result = await services.catalog.searchStores(params);

  const title = 'Lojas parceiras';
  const description =
    result.total > 0
      ? `Explore ${result.total.toLocaleString('pt-BR')} lojas verificadas e suas vitrines no ${brand.name}.`
      : `Conheça as vitrines das lojas verificadas no ${brand.name}.`;

  const canonicalInput: Partial<StoreDirectoryParams> = {
    ...params,
    ordem: 'relevancia',
    pagina: 1,
  };
  const canonicalQs = serializeStoreDirectoryParams(canonicalInput);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalQs ? `/lojas?${canonicalQs}` : '/lojas',
    },
    robots: params.q ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: brand.locale,
    },
  };
}

export default async function LojasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const raw = await searchParams;
  const params = parseStoreDirectoryParams(toURLSearchParams(raw));
  const result = await services.catalog.searchStores(params);

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: result.total,
    itemListElement: result.items.map((store, index) => ({
      '@type': 'ListItem',
      position: (result.pagina - 1) * STORE_DIRECTORY_PAGE_SIZE + index + 1,
      url: `/lojas/${store.slug}`,
      name: store.name,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <StorefrontDirectoryView
        key={directoryViewKey(params)}
        params={params}
        result={result}
      />
    </>
  );
}
