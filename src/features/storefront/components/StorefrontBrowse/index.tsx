'use client';

import { useMemo, useState } from 'react';

import type { PublicStorefront } from '@app-types/vehicle';
import { SearchPanel } from '@components/marketplace';
import { Heading } from '@components/ui';
import type { VehicleSearchResult } from '@services';
import type { VehicleSearchParams } from '@utils/vehicle-search-params';

import { storefrontContent } from '../../storefront.content';
import styles from '../../styles.module.css';
import { StorefrontCatalog } from '../StorefrontCatalog';
import { StorefrontHeader, type StorefrontNavItem } from '../StorefrontHeader';
import { StorefrontHero } from '../StorefrontHero';

export type StorefrontBrowseProps = {
  storefront: PublicStorefront;
  params: VehicleSearchParams;
  result: VehicleSearchResult;
  basePath: string;
  homeHref: string;
  navItems: StorefrontNavItem[];
  whatsappHref?: string;
  adminHref?: string;
  vehicleHrefPrefix?: string;
};

function countModalFilters(params: VehicleSearchParams): number {
  let count = 0;

  if (params.precoMin !== undefined || params.precoMax !== undefined) {
    count += 1;
  }

  if (params.kmMin !== undefined || params.kmMax !== undefined) {
    count += 1;
  }

  count += params.combustivel.length;
  count += params.cambio.length;
  count += params.carroceria.length;

  return count;
}

/**
 * Hero + catálogo com estado compartilhado do modal de filtros avançados.
 */
export function StorefrontBrowse({
  storefront,
  params,
  result,
  basePath,
  homeHref,
  navItems,
  whatsappHref,
  adminHref,
  vehicleHrefPrefix = '',
}: StorefrontBrowseProps) {
  const copy = storefrontContent;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const resultsPath = basePath || '/';
  const modalFiltersCount = countModalFilters(params);

  const searchCatalog = useMemo(
    () =>
      result.facets.makes.map((make) => ({
        slug: make.slug,
        name: make.name,
        models: make.models.map((model) => ({ value: model.slug, label: model.name })),
      })),
    [result.facets.makes]
  );

  const querySuggestions = useMemo(() => {
    // Prioridade: "Marca Modelo • Tipo". Hoje só há automóveis no domínio → "Veículo".
    const options: { value: string; label: string; inputValue: string }[] = [];

    for (const make of result.facets.makes) {
      for (const model of make.models) {
        const name = `${make.name} ${model.name}`;

        options.push({
          value: `model:${make.slug}:${model.slug}`,
          label: `${name} • Veículo`,
          inputValue: name,
        });
      }
    }

    return options;
  }, [result.facets.makes]);

  const selectedMakeSlug = params.marca[0] ?? '';
  const selectedModelSlug = useMemo(() => {
    const raw = params.modelo[0];

    if (!raw) {
      return '';
    }

    const parts = raw.split(':');
    return parts.length > 1 ? parts[1]! : raw;
  }, [params.modelo]);

  const defaultQueryLabel = useMemo(() => {
    if (params.q?.trim()) {
      return params.q.trim();
    }

    if (!selectedMakeSlug) {
      return '';
    }

    const make = result.facets.makes.find((item) => item.slug === selectedMakeSlug);

    if (!make) {
      return '';
    }

    if (!selectedModelSlug) {
      return make.name;
    }

    const model = make.models.find((item) => item.slug === selectedModelSlug);
    return model ? `${make.name} ${model.name}` : make.name;
  }, [params.q, result.facets.makes, selectedMakeSlug, selectedModelSlug]);

  return (
    <>
      <StorefrontHero
        storefront={storefront}
        headerSlot={
          <StorefrontHeader
            storefront={storefront}
            homeHref={homeHref}
            navItems={navItems}
            whatsappHref={whatsappHref}
            adminHref={adminHref}
            behavior="overlay"
            sentinelId="storefront-hero-sentinel"
          />
        }
        searchSlot={
          <SearchPanel
            catalog={searchCatalog}
            resultsPath={resultsPath}
            resultsHash="#estoque"
            defaultCondition={params.condicao ?? 'usado'}
            showPrice={false}
            showMakeModel={false}
            showQuery
            defaultQuery={defaultQueryLabel}
            defaultMake={selectedMakeSlug}
            defaultModel={selectedModelSlug}
            queryPlaceholder={copy.searchPlaceholder}
            querySuggestions={querySuggestions}
            onOpenFilters={() => setFiltersOpen(true)}
            advancedFiltersCount={modalFiltersCount}
            className={styles.storefrontHome__heroSearch}
          />
        }
      />

      <section
        id="estoque"
        className={styles.storefrontHome__catalogSection}
        aria-labelledby="storefront-catalog-title"
      >
        <div className={styles.storefrontHome__catalogHead}>
          <Heading as="h2" id="storefront-catalog-title" className={styles.storefrontHome__catalogTitle}>
            {copy.catalogTitle}
          </Heading>
          <p className={styles.storefrontHome__catalogMeta}>{copy.results(result.total)}</p>
        </div>
        <StorefrontCatalog
          storefrontBasePath={resultsPath}
          params={params}
          result={result}
          vehicleHrefPrefix={vehicleHrefPrefix}
          filtersOpen={filtersOpen}
          onFiltersOpenChange={setFiltersOpen}
          showToolbarFilterButton={false}
          showMakeModelInToolbar
          hiddenFilterSections={['makeModel', 'year', 'condition']}
        />
      </section>
    </>
  );
}
