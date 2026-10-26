import type { Metadata } from 'next';

import { MarketplaceListingView } from '@features/marketplace';
import { brand } from '@config/brand';
import { services } from '@services';
import {
  parseVehicleSearchParams,
  serializeVehicleSearchParams,
  type VehicleSearchParams,
} from '@utils/vehicle-search-params';

function listingViewKey(params: VehicleSearchParams): string {
  return serializeVehicleSearchParams(params);
}

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

/**
 * Política provisória de SEO da listagem:
 * - canonical omite `ordem` e `pagina` quando página = 1
 * - `robots: noindex` quando há `q` (busca textual)
 * Documentado em docs/vehicle-search-params.md
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}): Promise<Metadata> {
  const raw = await searchParams;
  const params = parseVehicleSearchParams(toURLSearchParams(raw));
  const result = await services.vehicleSearch.searchVehicles(params);

  const makeNames = params.marca
    .map((slug) => result.facets.makes.find((make) => make.slug === slug)?.name)
    .filter((name): name is string => Boolean(name));

  let title = 'Carros à venda';
  let description = `Encontre ${result.total.toLocaleString('pt-BR')} veículos no ${brand.name}.`;

  if (makeNames.length === 1) {
    title = `${makeNames[0]} à venda`;
    description = `Veja ${result.total.toLocaleString('pt-BR')} anúncios de ${makeNames[0]} no ${brand.name}.`;
  }

  const canonicalInput: Partial<VehicleSearchParams> = {
    ...params,
    ordem: 'recentes',
    pagina: 1,
  };
  const canonicalQs = serializeVehicleSearchParams(canonicalInput);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalQs ? `/veiculos?${canonicalQs}` : '/veiculos',
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

export default async function VeiculosPage({ searchParams }: { searchParams: Promise<SearchParamsInput> }) {
  const raw = await searchParams;
  const params = parseVehicleSearchParams(toURLSearchParams(raw));
  const [result, cityOptions] = await Promise.all([
    services.vehicleSearch.searchVehicles(params),
    services.catalog.getCityOptions(),
  ]);
  const pageSize = 12;

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: result.total,
    itemListElement: result.items.map((vehicle, index) => ({
      '@type': 'ListItem',
      position: (result.pagina - 1) * pageSize + index + 1,
      url: `/veiculos/${vehicle.slug}`,
      name: `${vehicle.make} ${vehicle.model} ${vehicle.version}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <MarketplaceListingView key={listingViewKey(params)} params={params} result={result} cityOptions={cityOptions} />
    </>
  );
}
