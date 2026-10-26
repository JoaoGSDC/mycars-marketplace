'use client';

import { useMemo, useState } from 'react';

import { SearchPanel } from '@components/marketplace';
import {
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
} from '@components/ui';
import { useMediaQuery } from '@hooks/use-media-query';
import type { MakeFacet, VehicleSearchResult } from '@services';
import {
  VEHICLE_SEARCH_PATH,
  buildVehicleSearchHref,
  createEmptyVehicleSearchParams,
  type VehicleSearchParams,
} from '@utils/vehicle-search-params';

import { ListingFiltersForm } from '../ListingFiltersForm';

export type MarketplaceHomeSearchProps = {
  facets: VehicleSearchResult['facets'];
  className?: string;
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
 * Busca do hero da Home — mesmo padrão da vitrine:
 * tabs de condição + campo Buscar + filtros avançados em modal.
 */
export function MarketplaceHomeSearch({ facets, className }: MarketplaceHomeSearchProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [params, setParams] = useState<VehicleSearchParams>(() => ({
    ...createEmptyVehicleSearchParams(),
    condicao: 'usado',
  }));
  const [draftParams, setDraftParams] = useState(params);
  const [priceValue, setPriceValue] = useState<[number, number]>([facets.priceMin, facets.priceMax]);
  const [draftPrice, setDraftPrice] = useState<[number, number]>(priceValue);
  const [mileageValue, setMileageValue] = useState<[number, number]>([
    facets.mileageMin,
    facets.mileageMax,
  ]);
  const [draftMileage, setDraftMileage] = useState<[number, number]>(mileageValue);

  const searchCatalog = useMemo(
    () =>
      facets.makes.map((make: MakeFacet) => ({
        slug: make.slug,
        name: make.name,
        models: make.models.map((model) => ({ value: model.slug, label: model.name })),
      })),
    [facets.makes]
  );

  const querySuggestions = useMemo(() => {
    const options: { value: string; label: string; inputValue: string }[] = [];

    for (const make of facets.makes) {
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
  }, [facets.makes]);

  const modalFiltersCount = countModalFilters(params);

  function openFilters() {
    setDraftParams(params);
    setDraftPrice(priceValue);
    setDraftMileage(mileageValue);
    setFiltersOpen(true);
  }

  function onFiltersDialogChange(open: boolean) {
    if (open) {
      openFilters();
      return;
    }

    setFiltersOpen(false);
  }

  function patchDraft(patch: Partial<VehicleSearchParams>) {
    setDraftParams((prev) => ({ ...prev, ...patch }));
  }

  function commitPrice(value: [number, number]) {
    const precoMin = value[0] <= facets.priceMin ? undefined : value[0];
    const precoMax = value[1] >= facets.priceMax ? undefined : value[1];
    setDraftPrice(value);
    patchDraft({ precoMin, precoMax });
  }

  function commitMileage(value: [number, number]) {
    const kmMin = value[0] <= facets.mileageMin ? undefined : value[0];
    const kmMax = value[1] >= facets.mileageMax ? undefined : value[1];
    setDraftMileage(value);
    patchDraft({ kmMin, kmMax });
  }

  function applyFilters() {
    setParams(draftParams);
    setPriceValue(draftPrice);
    setMileageValue(draftMileage);
    setFiltersOpen(false);
    window.location.assign(buildVehicleSearchHref({ ...draftParams, pagina: 1 }));
  }

  function clearDraft() {
    const empty = {
      ...createEmptyVehicleSearchParams(),
      condicao: params.condicao,
      q: params.q,
      ordem: params.ordem,
    };
    setDraftParams(empty);
    setDraftPrice([facets.priceMin, facets.priceMax]);
    setDraftMileage([facets.mileageMin, facets.mileageMax]);
  }

  const filtersForm = (
    <ListingFiltersForm
      params={draftParams}
      facets={facets}
      priceValue={draftPrice}
      mileageValue={draftMileage}
      onPriceChange={setDraftPrice}
      onPriceCommit={commitPrice}
      onMileageChange={setDraftMileage}
      onMileageCommit={commitMileage}
      onParamsPatch={patchDraft}
      hiddenSections={['makeModel', 'year', 'condition']}
    />
  );

  const filtersActions = (
    <>
      <Button type="button" variant="outline" onClick={clearDraft}>
        Limpar filtros
      </Button>
      <Button type="button" variant="primary" onClick={applyFilters}>
        Aplicar e ver listagem
      </Button>
    </>
  );

  return (
    <>
      <SearchPanel
        catalog={searchCatalog}
        resultsPath={VEHICLE_SEARCH_PATH}
        defaultCondition={params.condicao ?? 'usado'}
        showPrice={false}
        showMakeModel={false}
        showQuery
        queryPlaceholder="Buscar marca ou modelo"
        querySuggestions={querySuggestions}
        onOpenFilters={openFilters}
        advancedFiltersCount={modalFiltersCount}
        className={className}
      />

      {isDesktop ? (
        <Dialog open={filtersOpen} onOpenChange={onFiltersDialogChange}>
          <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Filtros</DialogTitle>
            </DialogHeader>
            <DialogBody className="overflow-y-auto">{filtersForm}</DialogBody>
            <DialogFooter className="gap-2 sm:justify-between">{filtersActions}</DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <BottomSheet open={filtersOpen} onOpenChange={onFiltersDialogChange}>
          <BottomSheetContent height="full">
            <BottomSheetHeader>
              <BottomSheetTitle>Filtros</BottomSheetTitle>
            </BottomSheetHeader>
            <BottomSheetBody>{filtersForm}</BottomSheetBody>
            <BottomSheetFooter>{filtersActions}</BottomSheetFooter>
          </BottomSheetContent>
        </BottomSheet>
      )}
    </>
  );
}
