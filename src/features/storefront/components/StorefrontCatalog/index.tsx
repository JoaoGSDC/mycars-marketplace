'use client';

import { ArrowUpDown, Search, SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { VehicleCard } from '@components/marketplace';
import {
  Autocomplete,
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  IconButton,
  Pagination,
  Select,
  SelectItem,
} from '@components/ui';
import {
  ListingFiltersForm,
  type ListingFilterSection,
} from '@features/marketplace/components/ListingFiltersForm';
import { useMediaQuery } from '@hooks/use-media-query';
import type { VehicleSearchResult } from '@services';
import { cn } from '@utils/cn';
import {
  createEmptyVehicleSearchParams,
  serializeVehicleSearchParams,
  type VehicleSearchParams,
  type VehicleSearchSort,
} from '@utils/vehicle-search-params';

import { STOREFRONT_SORT_OPTIONS, storefrontContent } from '../../storefront.content';
import styles from '../../styles.module.css';

export type StorefrontCatalogProps = {
  storefrontBasePath: string;
  params: VehicleSearchParams;
  result: VehicleSearchResult;
  /** Prefixo de path para links de veículo ('' no subdomínio). */
  vehicleHrefPrefix: string;
  /** Controle externo do modal (ex.: botão de filtros do hero). */
  filtersOpen?: boolean;
  onFiltersOpenChange?: (open: boolean) => void;
  /** Esconde o botão de filtros ao lado da ordenação. */
  showToolbarFilterButton?: boolean;
  /** Troca o campo Buscar por selects Marca/Modelo na toolbar. */
  showMakeModelInToolbar?: boolean;
  /** Seções omitidas no modal (já cobertas pelo hero). */
  hiddenFilterSections?: ListingFilterSection[];
};

function catalogHref(basePath: string, params: Partial<VehicleSearchParams>): string {
  const qs = serializeVehicleSearchParams(params);
  const path = basePath || '/';

  if (!qs) {
    return path;
  }

  return `${path}?${qs}`;
}

function countActiveFilters(params: VehicleSearchParams): number {
  let count = 0;

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

function mergeParams(base: VehicleSearchParams, patch: Partial<VehicleSearchParams>): VehicleSearchParams {
  return {
    ...base,
    ...patch,
    marca: patch.marca ?? base.marca,
    modelo: patch.modelo ?? base.modelo,
    combustivel: patch.combustivel ?? base.combustivel,
    cambio: patch.cambio ?? base.cambio,
    carroceria: patch.carroceria ?? base.carroceria,
    pagina: 1,
  };
}

export function StorefrontCatalog({
  storefrontBasePath,
  params,
  result,
  vehicleHrefPrefix,
  filtersOpen: filtersOpenProp,
  onFiltersOpenChange,
  showToolbarFilterButton = true,
  showMakeModelInToolbar = false,
  hiddenFilterSections = [],
}: StorefrontCatalogProps) {
  const router = useRouter();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [pending, startTransition] = useTransition();
  const [filtersOpenInternal, setFiltersOpenInternal] = useState(false);
  const filtersOpen = filtersOpenProp ?? filtersOpenInternal;
  const setFiltersOpen = onFiltersOpenChange ?? setFiltersOpenInternal;
  const [sortOpen, setSortOpen] = useState(false);
  const [queryDraft, setQueryDraft] = useState(params.q ?? '');
  const [draftParams, setDraftParams] = useState(params);
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copy = storefrontContent;
  const count = result.items.length;
  const activeFilters = countActiveFilters(params);
  const showToolbar =
    showMakeModelInToolbar ||
    result.total > 1 ||
    Boolean(params.q) ||
    Boolean(params.ordem && params.ordem !== 'recentes') ||
    activeFilters > 0;

  const makeOptions = useMemo(
    () => result.facets.makes.map((make) => ({ value: make.slug, label: make.name })),
    [result.facets.makes]
  );

  const selectedMake = params.marca[0] ?? '';
  const modelOptions = useMemo(() => {
    const make = result.facets.makes.find((item) => item.slug === selectedMake);
    return make?.models.map((model) => ({ value: model.slug, label: model.name })) ?? [];
  }, [result.facets.makes, selectedMake]);

  const selectedModel = useMemo(() => {
    const raw = params.modelo[0];
    if (!raw) {
      return '';
    }
    const parts = raw.split(':');
    return parts.length > 1 ? parts[1]! : raw;
  }, [params.modelo]);

  function navigate(next: VehicleSearchParams) {
    const href = catalogHref(storefrontBasePath, next);

    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  function patchParams(patch: Partial<VehicleSearchParams>) {
    navigate(mergeParams(params, patch));
  }

  function patchDraft(patch: Partial<VehicleSearchParams>) {
    setDraftParams((current) => mergeParams(current, patch));
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

  function syncDraftFromParams() {
    setDraftParams(params);
    setDraftPrice(priceValue);
    setDraftMileage(mileageValue);
  }

  function openFilters() {
    syncDraftFromParams();
    setFiltersOpen(true);
  }

  function onFiltersDialogChange(open: boolean) {
    if (open) {
      openFilters();
      return;
    }

    setFiltersOpen(false);
  }

  useEffect(() => {
    if (filtersOpen) {
      syncDraftFromParams();
    }
    // Só ao abrir o modal (incluindo via hero).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersOpen]);

  function onQueryChange(value: string) {
    setQueryDraft(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      navigate({
        ...params,
        q: value.trim() || undefined,
        pagina: 1,
      });
    }, 400);
  }

  function onMakeChange(value: string) {
    patchParams({
      marca: value ? [value] : [],
      modelo: [],
    });
  }

  function onModelChange(value: string) {
    if (!selectedMake || !value) {
      patchParams({ modelo: [] });
      return;
    }

    patchParams({ modelo: [`${selectedMake}:${value}`] });
  }

  const gridClass =
    count === 1
      ? styles['storefrontHome__grid--single']
      : count === 2
        ? styles['storefrontHome__grid--pair']
        : styles.storefrontHome__grid;

  const filtersForm = (
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
      hiddenSections={hiddenFilterSections}
    />
  );

  const filtersActions = (
    <>
      <Button
        variant="outline"
        onClick={() => {
          const empty = createEmptyVehicleSearchParams();
          const hidden = new Set(hiddenFilterSections);
          setDraftParams({
            ...empty,
            // Preserva o que vem do hero quando essas seções estão ocultas no modal.
            condicao: hidden.has('condition') ? params.condicao : empty.condicao,
            marca: hidden.has('makeModel') ? params.marca : empty.marca,
            modelo: hidden.has('makeModel') ? params.modelo : empty.modelo,
            anoMin: hidden.has('year') ? params.anoMin : empty.anoMin,
            anoMax: hidden.has('year') ? params.anoMax : empty.anoMax,
            q: params.q,
            ordem: params.ordem,
          });
          setDraftPrice([result.facets.priceMin, result.facets.priceMax]);
          setDraftMileage([result.facets.mileageMin, result.facets.mileageMax]);
        }}
      >
        {copy.clearFilters}
      </Button>
      <Button
        variant="primary"
        onClick={() => {
          navigate({ ...draftParams, pagina: 1 });
          setFiltersOpen(false);
        }}
      >
        {copy.applyFilters(result.total)}
      </Button>
    </>
  );

  return (
    <div className={styles.storefrontHome__catalog} data-pending={pending || undefined}>
      {showToolbar ? (
        <div className={styles.storefrontHome__toolbar}>
          {showMakeModelInToolbar ? (
            <div className={styles.storefrontHome__makeModel}>
              <Select
                label="Marca"
                value={selectedMake || undefined}
                onValueChange={onMakeChange}
                placeholder="Marca"
                className={styles.storefrontHome__makeSelect}
              >
                {makeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
              <Select
                label="Modelo"
                value={selectedModel || undefined}
                onValueChange={onModelChange}
                placeholder={selectedMake ? 'Modelo' : 'Escolha a marca'}
                disabled={!selectedMake}
                className={styles.storefrontHome__modelSelect}
              >
                {modelOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
          ) : (
            <Autocomplete
              placeholder={copy.searchPlaceholder}
              name="q"
              value={queryDraft}
              onValueChange={onQueryChange}
              options={[]}
              emptyMessage="Digite para buscar no estoque"
              className={styles.storefrontHome__search}
              prefix={<Search className="size-4 text-text-muted" strokeWidth={1.5} aria-hidden />}
              fieldProps={{
                variant: 'underline',
                'aria-label': copy.searchPlaceholder,
              }}
            />
          )}
          <div className={styles.storefrontHome__toolbarEnd}>
            <Select
              value={params.ordem}
              onValueChange={(value) => {
                navigate({ ...params, ordem: value as VehicleSearchSort, pagina: 1 });
              }}
              aria-label={copy.sortLabel}
              className={styles.storefrontHome__sort}
            >
              {STOREFRONT_SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
            {showToolbarFilterButton ? (
              <IconButton
                variant="square-outline"
                size="md"
                className={styles.storefrontHome__filterBtn}
                aria-label={
                  activeFilters > 0 ? `${copy.filtersLabel} (${activeFilters})` : copy.filtersLabel
                }
                aria-expanded={filtersOpen}
                icon={<SlidersHorizontal className="size-4" strokeWidth={1.5} aria-hidden />}
                onClick={openFilters}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {result.items.length === 0 ? (
        <EmptyState title={copy.emptyTitle} description={copy.emptyDescription} />
      ) : (
        <div className={cn(gridClass)}>
          {result.items.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              variant={count === 1 ? 'listing' : 'grid'}
              vehicle={vehicle}
              href={`${vehicleHrefPrefix || ''}/veiculos/${vehicle.slug}`}
            />
          ))}
        </div>
      )}

      {result.totalPaginas > 1 ? (
        <Pagination
          page={result.pagina}
          totalPages={result.totalPaginas}
          onPageChange={(page) => {
            navigate({ ...params, pagina: page });
          }}
        />
      ) : null}

      {showToolbar ? (
        <div className={styles.storefrontHome__mobileBar}>
          <button
            type="button"
            className={styles.storefrontHome__mobileBtn}
            onClick={openFilters}
          >
            <SlidersHorizontal className="size-4" strokeWidth={1.5} aria-hidden />
            {copy.filtersLabel}
            {activeFilters > 0 ? ` (${activeFilters})` : ''}
          </button>
          <span className={styles.storefrontHome__mobileDivider} aria-hidden />
          <button
            type="button"
            className={styles.storefrontHome__mobileBtn}
            onClick={() => {
              setSortOpen(true);
            }}
          >
            <ArrowUpDown className="size-4" strokeWidth={1.5} aria-hidden />
            {copy.sortLabel}
          </button>
        </div>
      ) : null}

      {isDesktop ? (
        <Dialog open={filtersOpen} onOpenChange={onFiltersDialogChange}>
          <DialogContent className={styles.storefrontHome__filtersDialog}>
            <DialogHeader className={styles.storefrontHome__filtersDialogHeader}>
              <DialogTitle>{copy.filtersTitle}</DialogTitle>
            </DialogHeader>
            <DialogBody className={styles.storefrontHome__filtersDialogBody}>{filtersForm}</DialogBody>
            <DialogFooter className={styles.storefrontHome__filtersDialogFooter}>
              {filtersActions}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <BottomSheet open={filtersOpen} onOpenChange={onFiltersDialogChange}>
          <BottomSheetContent height="full">
            <BottomSheetHeader>
              <BottomSheetTitle>{copy.filtersTitle}</BottomSheetTitle>
            </BottomSheetHeader>
            <BottomSheetBody>{filtersForm}</BottomSheetBody>
            <BottomSheetFooter>{filtersActions}</BottomSheetFooter>
          </BottomSheetContent>
        </BottomSheet>
      )}

      <BottomSheet open={sortOpen} onOpenChange={setSortOpen}>
        <BottomSheetContent height="content">
          <BottomSheetHeader>
            <BottomSheetTitle>{copy.sortLabel}</BottomSheetTitle>
          </BottomSheetHeader>
          <BottomSheetBody>
            <ul className={styles.storefrontHome__sortList}>
              {STOREFRONT_SORT_OPTIONS.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    className={cn(
                      styles.storefrontHome__sortOption,
                      params.ordem === option.value && styles['storefrontHome__sortOption--active']
                    )}
                    onClick={() => {
                      navigate({ ...params, ordem: option.value as VehicleSearchSort, pagina: 1 });
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

      <button
        type="button"
        className="sr-only"
        onClick={() => navigate(createEmptyVehicleSearchParams())}
      >
        Limpar
      </button>
    </div>
  );
}
