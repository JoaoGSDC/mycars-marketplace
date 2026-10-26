'use client';

import { ChipFilter, FilterCard, RangeFilter, YearRangeFilter } from '@components/marketplace';
import { Field } from '@components/ui';
import type { MakeFacet } from '@services';
import type {
  VehicleSearchCondition,
  VehicleSearchFuel,
  VehicleSearchParams,
  VehicleSearchTransmission,
} from '@utils/vehicle-search-params';

import { ListingMakeModelFilter } from '../ListingMakeModelFilter';
import { CONDITION_OPTIONS, FUEL_OPTIONS, TRANSMISSION_OPTIONS } from '../../marketplace.listing.content';

export type ListingFilterSection =
  | 'makeModel'
  | 'price'
  | 'year'
  | 'mileage'
  | 'condition'
  | 'location'
  | 'fuel'
  | 'transmission';

export type ListingFiltersFormProps = {
  params: VehicleSearchParams;
  facets: {
    priceHistogram: number[];
    mileageHistogram: number[];
    priceMin: number;
    priceMax: number;
    mileageMin: number;
    mileageMax: number;
    yearMin: number;
    yearMax: number;
    makes: MakeFacet[];
  };
  priceValue: [number, number];
  mileageValue: [number, number];
  onPriceChange: (value: [number, number]) => void;
  onPriceCommit: (value: [number, number]) => void;
  onMileageChange: (value: [number, number]) => void;
  onMileageCommit: (value: [number, number]) => void;
  onParamsPatch: (patch: Partial<VehicleSearchParams>) => void;
  /** @deprecated Localização fixa em Limeira-SP por enquanto. */
  locationOptions?: { value: string; label: string }[];
  /** `section` unifica a sidebar; default `card` no drawer/mobile. */
  presentation?: 'card' | 'section';
  /** Seções omitidas (ex.: vitrine — marca/ano/condição ficam no hero). */
  hiddenSections?: ListingFilterSection[];
};

export function ListingFiltersForm({
  params,
  facets,
  priceValue,
  mileageValue,
  onPriceChange,
  onPriceCommit,
  onMileageChange,
  onMileageCommit,
  onParamsPatch,
  presentation = 'card',
  hiddenSections = [],
}: ListingFiltersFormProps) {
  const yearValue: [number, number] = [params.anoMin ?? facets.yearMin, params.anoMax ?? facets.yearMax];
  const section = presentation === 'section' ? 'section' : undefined;
  const hidden = new Set(hiddenSections);

  const priceActive =
    params.precoMin !== undefined ||
    params.precoMax !== undefined ||
    priceValue[0] !== facets.priceMin ||
    priceValue[1] !== facets.priceMax;

  const mileageActive =
    params.kmMin !== undefined ||
    params.kmMax !== undefined ||
    mileageValue[0] !== facets.mileageMin ||
    mileageValue[1] !== facets.mileageMax;

  return (
    <>
      {!hidden.has('makeModel') ? (
        <ListingMakeModelFilter
          facets={facets.makes}
          value={{ marca: params.marca, modelo: params.modelo }}
          variant={section}
          onChange={(next) => {
            onParamsPatch(next);
          }}
          onClear={
            params.marca.length || params.modelo.length
              ? () => {
                  onParamsPatch({ marca: [], modelo: [] });
                }
              : undefined
          }
        />
      ) : null}

      {!hidden.has('price') ? (
        <RangeFilter
          title="Preço"
          min={facets.priceMin}
          max={facets.priceMax}
          value={priceValue}
          onValueChange={onPriceChange}
          onValueCommit={onPriceCommit}
          onInputCommit={onPriceCommit}
          histogram={facets.priceHistogram}
          prefix="R$"
          step={1000}
          variant={section}
          onClear={
            priceActive
              ? () => {
                  onParamsPatch({ precoMin: undefined, precoMax: undefined });
                }
              : undefined
          }
        />
      ) : null}

      {!hidden.has('year') ? (
        <YearRangeFilter
          minYear={facets.yearMin}
          maxYear={facets.yearMax}
          value={yearValue}
          variant={section}
          onValueChange={(next) => {
            onParamsPatch({
              anoMin: next[0] === facets.yearMin ? undefined : next[0],
              anoMax: next[1] === facets.yearMax ? undefined : next[1],
            });
          }}
          onClear={
            params.anoMin !== undefined || params.anoMax !== undefined
              ? () => {
                  onParamsPatch({ anoMin: undefined, anoMax: undefined });
                }
              : undefined
          }
        />
      ) : null}

      {!hidden.has('mileage') ? (
        <RangeFilter
          title="Quilometragem"
          min={facets.mileageMin}
          max={facets.mileageMax}
          value={mileageValue}
          onValueChange={onMileageChange}
          onValueCommit={onMileageCommit}
          onInputCommit={onMileageCommit}
          histogram={facets.mileageHistogram}
          suffix="km"
          step={1000}
          variant={section}
          onClear={
            mileageActive
              ? () => {
                  onParamsPatch({ kmMin: undefined, kmMax: undefined });
                }
              : undefined
          }
        />
      ) : null}

      {!hidden.has('condition') ? (
        <ChipFilter
          title="Condição"
          mode="single"
          options={[...CONDITION_OPTIONS]}
          value={params.condicao ? [params.condicao] : []}
          variant={section}
          onValueChange={(next) => {
            onParamsPatch({
              condicao: (next[0] as VehicleSearchCondition | undefined) ?? undefined,
            });
          }}
          onClear={
            params.condicao
              ? () => {
                  onParamsPatch({ condicao: undefined });
                }
              : undefined
          }
        />
      ) : null}

      {!hidden.has('location') ? (
        <FilterCard title="Localização" variant={section}>
          <Field
            label="Cidade"
            variant="filled"
            value="Limeira-SP"
            readOnly
            disabled
            aria-readonly="true"
          />
        </FilterCard>
      ) : null}

      {!hidden.has('fuel') ? (
        <ChipFilter
          title="Combustível"
          mode="multi"
          options={[...FUEL_OPTIONS]}
          value={params.combustivel}
          variant={section}
          onValueChange={(next) => {
            onParamsPatch({ combustivel: next as VehicleSearchFuel[] });
          }}
          onClear={
            params.combustivel.length
              ? () => {
                  onParamsPatch({ combustivel: [] });
                }
              : undefined
          }
        />
      ) : null}

      {!hidden.has('transmission') ? (
        <ChipFilter
          title="Câmbio"
          mode="multi"
          options={[...TRANSMISSION_OPTIONS]}
          value={params.cambio}
          variant={section}
          onValueChange={(next) => {
            onParamsPatch({ cambio: next as VehicleSearchTransmission[] });
          }}
          onClear={
            params.cambio.length
              ? () => {
                  onParamsPatch({ cambio: [] });
                }
              : undefined
          }
        />
      ) : null}
    </>
  );
}
