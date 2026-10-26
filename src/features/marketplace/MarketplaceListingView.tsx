'use client';

import { LayoutGrid, List, Search, SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

import { PageShell, SiteFooter, SiteHeader, buildMarketplaceNav } from '@components/layout';
import { BodyTypeSelector, VehicleCard } from '@components/marketplace';
import {
  Badge,
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  Breadcrumb,
  Button,
  EmptyState,
  Field,
  IconButton,
  Pagination,
  Select,
  SelectItem,
} from '@components/ui';
import type { VehicleSearchResult } from '@services';
import { useFavorites } from '@hooks/use-favorites';
import {
  buildVehicleSearchHref,
  createEmptyVehicleSearchParams,
  type VehicleSearchParams,
  type VehicleSearchSort,
} from '@utils/vehicle-search-params';
import { cn } from '@utils/cn';

import { ListingFiltersForm } from './components/ListingFiltersForm';
import { bodyTypeToSearch, searchBodyToType } from './lib/listing-body-map';
import { LISTING_SORT_OPTIONS, listingContent } from './marketplace.listing.content';
import styles from './listing.styles.module.css';

export type MarketplaceListingViewProps = {
  params: VehicleSearchParams;
  result: VehicleSearchResult;
  cityOptions: { value: string; label: string }[];
};

function countActiveFilters(params: VehicleSearchParams): number {
  let count = 0;

  if (params.q) {
    count += 1;
  }

  if (params.condicao) {
    count += 1;
  }

  count += params.marca.length;
  count += params.modelo.length;

  if (params.precoMin !== undefined || params.precoMax !== undefined) {
    count += 1;
  }

  if (params.kmMin !== undefined || params.kmMax !== undefined) {
    count += 1;
  }

  if (params.anoMin !== undefined || params.anoMax !== undefined) {
    count += 1;
  }

  count += params.combustivel.length;
  count += params.cambio.length;
  count += params.carroceria.length;

  if (params.local) {
    count += 1;
  }

  return count;
}

function buildActiveChips(
  params: VehicleSearchParams,
  facets: VehicleSearchResult['facets']
): { key: string; label: string; clear: Partial<VehicleSearchParams> }[] {
  const chips: { key: string; label: string; clear: Partial<VehicleSearchParams> }[] = [];

  if (params.q) {
    chips.push({ key: 'q', label: `Busca: ${params.q}`, clear: { q: undefined } });
  }

  if (params.condicao) {
    const label = { novo: 'Novo', seminovo: 'Seminovo', usado: 'Usado' }[params.condicao];
    chips.push({ key: 'condicao', label, clear: { condicao: undefined } });
  }

  params.marca.forEach((slug) => {
    const name = facets.makes.find((make) => make.slug === slug)?.name ?? slug;
    chips.push({
      key: `marca-${slug}`,
      label: name,
      clear: {
        marca: params.marca.filter((item) => item !== slug),
        modelo: params.modelo.filter((item) => !item.startsWith(`${slug}:`)),
      },
    });
  });

  params.modelo.forEach((entry) => {
    const [makeSlug, modelSlug] = entry.split(':');
    const make = facets.makes.find((item) => item.slug === makeSlug);
    const model = make?.models.find((item) => item.slug === modelSlug);
    chips.push({
      key: `modelo-${entry}`,
      label: model ? `${make?.name} ${model.name}` : entry,
      clear: { modelo: params.modelo.filter((item) => item !== entry) },
    });
  });

  if (params.precoMin !== undefined || params.precoMax !== undefined) {
    chips.push({
      key: 'preco',
      label: `Preço ${params.precoMin ?? '…'}–${params.precoMax ?? '…'}`,
      clear: { precoMin: undefined, precoMax: undefined },
    });
  }

  if (params.kmMin !== undefined || params.kmMax !== undefined) {
    chips.push({
      key: 'km',
      label: `Km ${params.kmMin ?? '…'}–${params.kmMax ?? '…'}`,
      clear: { kmMin: undefined, kmMax: undefined },
    });
  }

  if (params.anoMin !== undefined || params.anoMax !== undefined) {
    chips.push({
      key: 'ano',
      label: `Ano ${params.anoMin ?? '…'}–${params.anoMax ?? '…'}`,
      clear: { anoMin: undefined, anoMax: undefined },
    });
  }

  params.combustivel.forEach((fuel) => {
    chips.push({
      key: `fuel-${fuel}`,
      label: fuel,
      clear: { combustivel: params.combustivel.filter((item) => item !== fuel) },
    });
  });

  params.cambio.forEach((item) => {
    chips.push({
      key: `cambio-${item}`,
      label: item,
      clear: { cambio: params.cambio.filter((value) => value !== item) },
    });
  });

  params.carroceria.forEach((item) => {
    chips.push({
      key: `body-${item}`,
      label: item,
      clear: { carroceria: params.carroceria.filter((value) => value !== item) },
    });
  });

  if (params.local) {
    chips.push({ key: 'local', label: params.local, clear: { local: undefined } });
  }

  return chips;
}

export function MarketplaceListingView({ params, result, cityOptions }: MarketplaceListingViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const favorites = useFavorites();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [draftParams, setDraftParams] = useState(params);
  const [queryDraft, setQueryDraft] = useState(params.q ?? '');
  const [priceValue, setPriceValue] = useState<[number, number]>([
    params.precoMin ?? result.facets.priceMin,
    params.precoMax ?? result.facets.priceMax,
  ]);
  const [mileageValue, setMileageValue] = useState<[number, number]>([
    params.kmMin ?? result.facets.mileageMin,
    params.kmMax ?? result.facets.mileageMax,
  ]);
  const [draftPrice, setDraftPrice] = useState(priceValue);
  const [draftMileage, setDraftMileage] = useState(mileageValue);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(next: VehicleSearchParams) {
    const href = buildVehicleSearchHref(next);

    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  function patchParams(patch: Partial<VehicleSearchParams>, base: VehicleSearchParams = params) {
    navigate({
      ...base,
      ...patch,
      marca: patch.marca ?? base.marca,
      modelo: patch.modelo ?? base.modelo,
      combustivel: patch.combustivel ?? base.combustivel,
      cambio: patch.cambio ?? base.cambio,
      carroceria: patch.carroceria ?? base.carroceria,
      pagina: 1,
    });
  }

  function patchDraft(patch: Partial<VehicleSearchParams>) {
    setDraftParams((current) => ({
      ...current,
      ...patch,
      marca: patch.marca ?? current.marca,
      modelo: patch.modelo ?? current.modelo,
      combustivel: patch.combustivel ?? current.combustivel,
      cambio: patch.cambio ?? current.cambio,
      carroceria: patch.carroceria ?? current.carroceria,
      pagina: 1,
    }));
  }

  function commitPrice(value: [number, number], target: 'live' | 'draft' = 'live') {
    const precoMin = value[0] <= result.facets.priceMin ? undefined : value[0];
    const precoMax = value[1] >= result.facets.priceMax ? undefined : value[1];

    if (target === 'draft') {
      setDraftPrice(value);
      patchDraft({ precoMin, precoMax });

      return;
    }

    setPriceValue(value);
    patchParams({ precoMin, precoMax });
  }

  function commitMileage(value: [number, number], target: 'live' | 'draft' = 'live') {
    const kmMin = value[0] <= result.facets.mileageMin ? undefined : value[0];
    const kmMax = value[1] >= result.facets.mileageMax ? undefined : value[1];

    if (target === 'draft') {
      setDraftMileage(value);
      patchDraft({ kmMin, kmMax });

      return;
    }

    setMileageValue(value);
    patchParams({ kmMin, kmMax });
  }

  function clearAll() {
    navigate(createEmptyVehicleSearchParams());
  }

  function onQueryChange(value: string) {
    setQueryDraft(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      patchParams({ q: value.trim() || undefined });
    }, 400);
  }

  const activeCount = countActiveFilters(params);
  const activeChips = buildActiveChips(params, result.facets);
  const bodyType = searchBodyToType(params.carroceria);

  return (
    <PageShell className={styles.listing}>
      <a href="#resultados" className={styles.listing__skip}>
        Ir para resultados
      </a>

      <SiteHeader
        variant="solid"
        navItems={buildMarketplaceNav('/veiculos')}
        city="Limeira-SP"
        favoritesCount={favorites.count}
        favoritesNote={listingContent.favoritesNote}
        showMessages={false}
        showUser={false}
      />

      <div className={styles.listing__main}>
        <Breadcrumb items={[...listingContent.breadcrumb]} className={styles.listing__breadcrumb} />

        <div className={styles.listing__titleRow}>
          <div className={styles.listing__titleGroup}>
            <h1 className={styles.listing__title}>{listingContent.title}</h1>
            <p className={styles.listing__titleMeta} aria-live="polite">
              {listingContent.resultsLive(result.total)}
              {activeCount > 0 ? (
                <span className={styles.listing__titleMetaFilters}>
                  {' '}
                  · {activeCount} {activeCount === 1 ? 'filtro ativo' : 'filtros ativos'}
                </span>
              ) : null}
            </p>
          </div>
          <BodyTypeSelector
            className={styles.listing__bodyTypes}
            value={bodyType}
            onChange={(next) => {
              patchParams({ carroceria: bodyTypeToSearch(next) });
            }}
          />
        </div>

        <div className={styles.listing__layout}>
          <aside className={styles.listing__sidebar} aria-label="Filtros">
            <div className={styles.listing__filtersPanel}>
              <div className={styles.listing__filtersHead}>
                <div className={styles.listing__filtersTitleRow}>
                  <h2 className={styles.listing__filtersTitle}>Filtros</h2>
                  {activeCount > 0 ? <Badge variant="count">{activeCount}</Badge> : null}
                </div>
                {activeCount > 0 ? (
                  <button type="button" className={styles.listing__filtersClear} onClick={clearAll}>
                    Limpar filtros
                  </button>
                ) : null}
              </div>
              <ListingFiltersForm
                params={params}
                facets={result.facets}
                priceValue={priceValue}
                mileageValue={mileageValue}
                onPriceChange={setPriceValue}
                onPriceCommit={(value) => {
                  commitPrice(value, 'live');
                }}
                onMileageChange={setMileageValue}
                onMileageCommit={(value) => {
                  commitMileage(value, 'live');
                }}
                onParamsPatch={patchParams}
                locationOptions={cityOptions}
                presentation="section"
              />
            </div>
          </aside>

          <section id="resultados" className={styles.listing__results} aria-busy={isPending}>
            <div className={styles.listing__toolbar}>
              <Field
                aria-label="Buscar"
                variant="underline"
                className={styles.listing__search}
                prefix={<Search className="size-4 text-text-muted" strokeWidth={1.5} aria-hidden />}
                value={queryDraft}
                placeholder={listingContent.searchPlaceholder}
                onChange={(event) => {
                  onQueryChange(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    if (debounceRef.current) {
                      clearTimeout(debounceRef.current);
                    }

                    patchParams({ q: queryDraft.trim() || undefined });
                  }
                }}
              />
              <div className={styles.listing__toolbarMeta}>
                <Select
                  aria-label="Ordenar"
                  value={params.ordem}
                  onValueChange={(value) => {
                    patchParams({ ordem: value as VehicleSearchSort });
                  }}
                  className={styles.listing__sort}
                >
                  {LISTING_SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>
                <div className={styles.listing__viewToggle} role="group" aria-label="Modo de visualização">
                  <IconButton
                    type="button"
                    variant="square-outline"
                    size="sm"
                    aria-label="Ver em grade"
                    aria-pressed={viewMode === 'grid'}
                    className={cn(styles.listing__viewBtn, viewMode === 'grid' && styles['listing__viewBtn--active'])}
                    onClick={() => {
                      setViewMode('grid');
                    }}
                    icon={<LayoutGrid className="size-4" strokeWidth={1.5} aria-hidden />}
                  />
                  <IconButton
                    type="button"
                    variant="square-outline"
                    size="sm"
                    aria-label="Ver em lista"
                    aria-pressed={viewMode === 'list'}
                    className={cn(styles.listing__viewBtn, viewMode === 'list' && styles['listing__viewBtn--active'])}
                    onClick={() => {
                      setViewMode('list');
                    }}
                    icon={<List className="size-4" strokeWidth={1.5} aria-hidden />}
                  />
                </div>
              </div>
            </div>

            {activeChips.length > 0 ? (
              <div className={styles.listing__chips}>
                {activeChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    className={styles.listing__chip}
                    onClick={() => {
                      patchParams(chip.clear);
                    }}
                  >
                    {chip.label} ×
                  </button>
                ))}
                <button type="button" className={styles.listing__chipsClear} onClick={clearAll}>
                  Limpar tudo
                </button>
              </div>
            ) : null}

            <div
              className={cn(
                viewMode === 'grid' ? styles.listing__grid : styles.listing__list,
                isPending && styles.listing__resultsPending
              )}
            >
              {isPending
                ? Array.from({ length: 6 }).map((_, index) => (
                    <div key={`skeleton-${index}`} className={styles.listing__gridItem}>
                      <VehicleCard variant={viewMode === 'grid' ? 'grid' : 'listing'} loading />
                    </div>
                  ))
                : null}
              {!isPending && result.items.length === 0 ? (
                <EmptyState
                  className={styles.listing__empty}
                  title={listingContent.emptyTitle}
                  description={listingContent.emptyDescription}
                  action={
                    <Button variant="primary" onClick={clearAll}>
                      {listingContent.emptyAction}
                    </Button>
                  }
                />
              ) : null}
              {!isPending
                ? result.items.map((vehicle) => (
                    <div key={vehicle.id} className={styles.listing__gridItem}>
                      <VehicleCard
                        variant={viewMode === 'grid' ? 'grid' : 'listing'}
                        vehicle={vehicle}
                        href={`/veiculos/${vehicle.slug}`}
                        favorited={favorites.has(vehicle.id)}
                        onFavoriteToggle={() => {
                          favorites.toggle(vehicle.id);
                        }}
                      />
                    </div>
                  ))
                : null}
            </div>

            <Pagination
              page={result.pagina}
              totalPages={result.totalPaginas}
              getHref={(page) => buildVehicleSearchHref({ ...params, pagina: page })}
              className={styles.listing__pagination}
            />
          </section>
        </div>
      </div>

      <div className={styles.listing__mobileBar}>
        <button
          type="button"
          className={styles.listing__mobileBtn}
          onClick={() => {
            setDraftParams(params);
            setDraftPrice(priceValue);
            setDraftMileage(mileageValue);
            setFiltersOpen(true);
          }}
        >
          <SlidersHorizontal className="size-4" strokeWidth={1.5} aria-hidden />
          {listingContent.mobileFilters}
          {activeCount > 0 ? ` (${activeCount})` : ''}
        </button>
        <span className={styles.listing__mobileDivider} aria-hidden />
        <button
          type="button"
          className={styles.listing__mobileBtn}
          onClick={() => {
            setSortOpen(true);
          }}
        >
          {listingContent.mobileSort}
        </button>
      </div>

      <BottomSheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <BottomSheetContent height="full">
          <BottomSheetHeader>
            <BottomSheetTitle>Filtros</BottomSheetTitle>
          </BottomSheetHeader>
          <BottomSheetBody>
            <ListingFiltersForm
              params={draftParams}
              facets={result.facets}
              priceValue={draftPrice}
              mileageValue={draftMileage}
              onPriceChange={setDraftPrice}
              onPriceCommit={(value) => {
                commitPrice(value, 'draft');
              }}
              onMileageChange={setDraftMileage}
              onMileageCommit={(value) => {
                commitMileage(value, 'draft');
              }}
              onParamsPatch={patchDraft}
              locationOptions={cityOptions}
            />
          </BottomSheetBody>
          <BottomSheetFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDraftParams(createEmptyVehicleSearchParams());
                setDraftPrice([result.facets.priceMin, result.facets.priceMax]);
                setDraftMileage([result.facets.mileageMin, result.facets.mileageMax]);
              }}
            >
              Limpar tudo
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                navigate({ ...draftParams, pagina: 1 });
                setFiltersOpen(false);
              }}
            >
              {listingContent.applyResults(result.total)}
            </Button>
          </BottomSheetFooter>
        </BottomSheetContent>
      </BottomSheet>

      <BottomSheet open={sortOpen} onOpenChange={setSortOpen}>
        <BottomSheetContent height="content">
          <BottomSheetHeader>
            <BottomSheetTitle>Ordenar</BottomSheetTitle>
          </BottomSheetHeader>
          <BottomSheetBody>
            <ul className={styles.listing__sortList}>
              {LISTING_SORT_OPTIONS.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    className={cn(
                      styles.listing__sortOption,
                      params.ordem === option.value && styles['listing__sortOption--active']
                    )}
                    onClick={() => {
                      patchParams({ ordem: option.value as VehicleSearchSort });
                      setSortOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          </BottomSheetBody>
        </BottomSheetContent>
      </BottomSheet>

      <SiteFooter />
    </PageShell>
  );
}
