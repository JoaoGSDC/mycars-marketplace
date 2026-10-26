'use client';

import type { FormEvent, ReactNode } from 'react';
import { useMemo, useState } from 'react';

import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
} from '@components/ui/BottomSheet';
import { Autocomplete } from '@components/ui/Autocomplete';
import { IconButton } from '@components/ui/IconButton';
import { SpecIcon } from '@components/ui/Icon';
import { Select, SelectItem } from '@components/ui/Select';
import { Tabs, TabsList, TabsTrigger } from '@components/ui/Tabs';
import { Button } from '@components/ui/Button';
import { Search } from 'lucide-react';
import {
  PRICE_RANGE_PRESETS,
  VEHICLE_SEARCH_PATH,
  type VehicleSearchCondition,
  type VehicleSearchParams,
  serializeVehicleSearchParams,
  pricePresetToBounds,
} from '@utils/vehicle-search-params';
import { cn } from '@utils/cn';

import styles from './styles.module.css';

export type SearchPanelSelectOption = {
  value: string;
  label: string;
};

export type SearchPanelCatalogMake = {
  slug: string;
  name: string;
  models: SearchPanelSelectOption[];
};

export type SearchPanelProps = {
  /** Catálogo para selects Marca/Modelo. */
  catalog?: SearchPanelCatalogMake[];
  /** Anos (valor = ano_min). */
  yearOptions?: SearchPanelSelectOption[];
  defaultCondition?: VehicleSearchCondition;
  /**
   * Path base dos resultados (serializável — não passe funções do Server Component).
   * Default: `/veiculos`.
   */
  resultsPath?: string;
  /** Hash opcional após a query (ex.: `#estoque` na vitrine). */
  resultsHash?: string;
  /** Exibe select de faixa de preço. Default true (marketplace). */
  showPrice?: boolean;
  /** Exibe selects Marca/Modelo. Default true. */
  showMakeModel?: boolean;
  /** Exibe campo de busca textual (q). Default false. */
  showQuery?: boolean;
  /** Valor inicial do campo de busca. */
  defaultQuery?: string;
  /** Marca inicial (slug) — preenchida pela URL ou pela sugestão do Buscar. */
  defaultMake?: string;
  /** Modelo inicial (slug) — preenchido pela URL ou pela sugestão do Buscar. */
  defaultModel?: string;
  /** Placeholder do campo de busca. */
  queryPlaceholder?: string;
  /** Sugestões do autocomplete de busca (`value` = `model:makeSlug:modelSlug`). */
  querySuggestions?: { value: string; label: string; inputValue?: string; description?: string }[];
  /**
   * Quando definido, o botão de filtros (sliders) abre este callback
   * em vez de navegar para a listagem (uso na vitrine).
   */
  onOpenFilters?: () => void;
  /** Contagem para badge acessível no botão de filtros. */
  advancedFiltersCount?: number;
  regionSlot?: ReactNode;
  className?: string;
};

function buildResultsHref(
  path: string,
  input: Partial<VehicleSearchParams>,
  hash?: string
): string {
  const qs = serializeVehicleSearchParams(input);
  const base = path || '/';
  const withQuery = qs ? `${base}?${qs}` : base;

  if (!hash) {
    return withQuery;
  }

  const normalized = hash.startsWith('#') ? hash : `#${hash}`;
  return `${withQuery}${normalized}`;
}

const CONDITION_TABS: { value: VehicleSearchCondition; label: string }[] = [
  { value: 'novo', label: 'Novos' },
  { value: 'seminovo', label: 'Seminovos' },
  { value: 'usado', label: 'Usados' },
];

const DEFAULT_YEARS: SearchPanelSelectOption[] = Array.from({ length: 12 }, (_, i) => {
  const year = 2025 - i;

  return { value: String(year), label: `A partir de ${year}` };
});

/**
 * Painel glass do hero. Form GET nativo → `/veiculos` (funciona sem JS).
 * Selects customizados sincronizam inputs hidden.
 */
export function SearchPanel({
  catalog = [],
  yearOptions = DEFAULT_YEARS,
  defaultCondition = 'usado',
  resultsPath = VEHICLE_SEARCH_PATH,
  resultsHash,
  showPrice = true,
  showMakeModel = true,
  showQuery = false,
  defaultQuery = '',
  defaultMake = '',
  defaultModel = '',
  queryPlaceholder = 'Buscar',
  querySuggestions = [],
  onOpenFilters,
  advancedFiltersCount = 0,
  regionSlot,
  className,
}: SearchPanelProps) {
  const [condition, setCondition] = useState<VehicleSearchCondition>(defaultCondition);
  const [make, setMake] = useState(defaultMake);
  const [model, setModel] = useState(defaultModel);
  const [year, setYear] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [query, setQuery] = useState(defaultQuery);
  const [moreOpen, setMoreOpen] = useState(false);
  const storefrontMode = Boolean(onOpenFilters);
  const hasStructuredMakeModel = Boolean(make && model);

  const makeOptions = useMemo(
    () => catalog.map((item) => ({ value: item.slug, label: item.name })),
    [catalog]
  );

  const modelOptions = useMemo(() => {
    const entry = catalog.find((item) => item.slug === make);

    return entry?.models ?? [];
  }, [catalog, make]);

  const priceBounds = showPrice ? pricePresetToBounds(priceRange) : {};

  const advancedHref = buildResultsHref(
    resultsPath,
    {
      condicao: condition,
      // Marca/modelo podem vir dos selects OU da sugestão do Buscar.
      marca: make ? [make] : [],
      modelo: hasStructuredMakeModel ? [`${make}:${model}`] : [],
      anoMin: year ? Number(year) : undefined,
      precoMin: priceBounds.precoMin,
      precoMax: priceBounds.precoMax,
      // Com marca+modelo estruturados, `q` é redundante e pode atrapalhar o LIKE.
      q: showQuery && query.trim() && !hasStructuredMakeModel ? query.trim() : undefined,
    },
    resultsHash
  );

  function handleMakeChange(value: string) {
    setMake(value);
    setModel('');
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    // Digitação livre invalida a sugestão estruturada.
    if (make || model) {
      setMake('');
      setModel('');
    }
  }

  function handleQuerySelect(option: { value: string; inputValue?: string; label: string }) {
    const match = /^model:([^:]+):(.+)$/.exec(option.value);

    if (!match) {
      return;
    }

    const nextMake = match[1]!;
    const nextModel = match[2]!;

    setMake(nextMake);
    setModel(nextModel);
    setQuery(option.inputValue ?? option.label);

    // Sugestão estruturada → marca/modelo no endpoint (sem `q` redundante).
    window.location.assign(
      buildResultsHref(
        resultsPath,
        {
          condicao: condition,
          marca: [nextMake],
          modelo: [`${nextMake}:${nextModel}`],
          anoMin: year ? Number(year) : undefined,
          precoMin: priceBounds.precoMin,
          precoMax: priceBounds.precoMax,
        },
        resultsHash
      )
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.location.assign(advancedHref);
  }

  function applyMoreFilters() {
    setMoreOpen(false);
    window.location.assign(advancedHref);
  }

  function handleFiltersClick() {
    if (onOpenFilters) {
      onOpenFilters();
      return;
    }

    window.location.assign(advancedHref);
  }

  function handleMobileMore() {
    if (onOpenFilters) {
      onOpenFilters();
      return;
    }

    setMoreOpen(true);
  }

  const filtersLabel =
    advancedFiltersCount > 0
      ? `Filtros avançados (${advancedFiltersCount})`
      : 'Filtros avançados';

  return (
    <>
      <form
        method="GET"
        action={resultsPath || '/'}
        className={cn(styles.searchPanel, className)}
        onSubmit={handleSubmit}
      >
        <input type="hidden" name="condicao" value={condition} />
        {make ? <input type="hidden" name="marca" value={make} /> : null}
        {hasStructuredMakeModel ? (
          <input type="hidden" name="modelo" value={`${make}:${model}`} />
        ) : null}
        {year ? <input type="hidden" name="ano_min" value={year} /> : null}
        {showQuery && query.trim() && !hasStructuredMakeModel ? (
          <input type="hidden" name="q" value={query.trim()} />
        ) : null}
        {showPrice && priceBounds.precoMin !== undefined ? (
          <input type="hidden" name="preco_min" value={priceBounds.precoMin} />
        ) : null}
        {showPrice && priceBounds.precoMax !== undefined ? (
          <input type="hidden" name="preco_max" value={priceBounds.precoMax} />
        ) : null}

        <div className={styles.searchPanel__top}>
          <Tabs
            value={condition}
            onValueChange={(next) => {
              if (next === 'novo' || next === 'seminovo' || next === 'usado') {
                setCondition(next);
              }
            }}
            className={styles.searchPanel__tabs}
          >
            <TabsList variant="pills" className={styles.searchPanel__tabList}>
              {CONDITION_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  variant="pills"
                  value={tab.value}
                  className={styles.searchPanel__tabTrigger}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className={styles.searchPanel__row}>
          <div
            className={cn(
              styles.searchPanel__fields,
              showQuery && !showMakeModel && styles['searchPanel__fields--query']
            )}
          >
            {showQuery ? (
              <Autocomplete
                label="Buscar"
                placeholder={queryPlaceholder}
                value={query}
                onValueChange={handleQueryChange}
                onSelectOption={handleQuerySelect}
                options={querySuggestions}
                emptyMessage="Digite para buscar"
                className={styles.searchPanel__query}
                prefix={<Search className="size-4 text-white/55" strokeWidth={1.5} aria-hidden />}
                fieldProps={{
                  variant: 'underline',
                  className: styles.searchPanel__queryField,
                  inputClassName: styles.searchPanel__queryInput,
                }}
              />
            ) : null}

            {showMakeModel ? (
              <>
                <Select
                  variant="underline"
                  label="Marca"
                  placeholder="Marca"
                  value={make || undefined}
                  onValueChange={handleMakeChange}
                  className={styles.searchPanel__select}
                  labelClassName={styles.searchPanel__selectLabel}
                  triggerClassName={styles.searchPanel__selectTrigger}
                  iconClassName={styles.searchPanel__selectIcon}
                >
                  {makeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  variant="underline"
                  label="Modelo"
                  placeholder={make ? 'Modelo' : 'Escolha a marca'}
                  value={model || undefined}
                  onValueChange={setModel}
                  disabled={!make}
                  className={cn(
                    styles.searchPanel__select,
                    !storefrontMode && styles['searchPanel__select--desktopOnly']
                  )}
                  labelClassName={styles.searchPanel__selectLabel}
                  triggerClassName={styles.searchPanel__selectTrigger}
                  iconClassName={styles.searchPanel__selectIcon}
                >
                  {modelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>
              </>
            ) : null}

            <Select
              variant="underline"
              label="Ano"
              placeholder="Ano"
              value={year || undefined}
              onValueChange={setYear}
              className={cn(
                styles.searchPanel__select,
                !storefrontMode && styles['searchPanel__select--desktopOnly']
              )}
              labelClassName={styles.searchPanel__selectLabel}
              triggerClassName={styles.searchPanel__selectTrigger}
              iconClassName={styles.searchPanel__selectIcon}
            >
              {yearOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>

            {showPrice ? (
              <Select
                variant="underline"
                label="Faixa de preço"
                placeholder="Faixa de preço"
                value={priceRange || undefined}
                onValueChange={setPriceRange}
                className={cn(styles.searchPanel__select, styles['searchPanel__select--desktopOnly'])}
                labelClassName={styles.searchPanel__selectLabel}
                triggerClassName={styles.searchPanel__selectTrigger}
                iconClassName={styles.searchPanel__selectIcon}
              >
                {PRICE_RANGE_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.label}
                  </SelectItem>
                ))}
              </Select>
            ) : null}
          </div>

          <div className={styles.searchPanel__actions}>
            <IconButton
              type="submit"
              variant="circle-white"
              size="lg"
              aria-label="Buscar veículos"
              className={cn(styles.searchPanel__action, styles['searchPanel__action--desktop'])}
              icon={<SpecIcon name="Search" size="md" className={styles.searchPanel__actionIcon} />}
            />
            <IconButton
              type="button"
              variant="circle-white"
              size="lg"
              aria-label={filtersLabel}
              aria-expanded={onOpenFilters ? undefined : undefined}
              className={cn(styles.searchPanel__action, styles['searchPanel__action--desktop'])}
              onClick={handleFiltersClick}
              icon={<SpecIcon name="Sliders" size="md" className={styles.searchPanel__actionIcon} />}
            />
            <Button type="submit" variant="primary" size="lg" className={styles['searchPanel__mobileSubmit']}>
              Buscar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={styles['searchPanel__mobileMore']}
              onClick={handleMobileMore}
            >
              {storefrontMode
                ? advancedFiltersCount > 0
                  ? `Filtros (${advancedFiltersCount})`
                  : 'Filtros'
                : 'Mais filtros'}
            </Button>
          </div>
        </div>

        {regionSlot ? <div className={styles.searchPanel__region}>{regionSlot}</div> : null}
      </form>

      {!storefrontMode ? (
        <BottomSheet open={moreOpen} onOpenChange={setMoreOpen}>
          <BottomSheetContent height="content">
            <BottomSheetHeader>
              <BottomSheetTitle>Mais filtros</BottomSheetTitle>
            </BottomSheetHeader>
            <BottomSheetBody className={styles.searchPanel__drawerBody}>
              <Select
                variant="filled"
                label="Modelo"
                placeholder={make ? 'Modelo' : 'Escolha a marca'}
                value={model || undefined}
                onValueChange={setModel}
                disabled={!make}
              >
                {modelOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
              <Select variant="filled" label="Ano" placeholder="Ano" value={year || undefined} onValueChange={setYear}>
                {yearOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
              {showPrice ? (
                <Select
                  variant="filled"
                  label="Faixa de preço"
                  placeholder="Faixa de preço"
                  value={priceRange || undefined}
                  onValueChange={setPriceRange}
                >
                  {PRICE_RANGE_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </Select>
              ) : null}
            </BottomSheetBody>
            <BottomSheetFooter>
              <Button type="button" variant="primary" className="w-full" withArrow onClick={applyMoreFilters}>
                Aplicar e ver listagem
              </Button>
            </BottomSheetFooter>
          </BottomSheetContent>
        </BottomSheet>
      ) : null}
    </>
  );
}
