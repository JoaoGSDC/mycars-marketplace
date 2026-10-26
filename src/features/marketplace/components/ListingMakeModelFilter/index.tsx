'use client';

import { X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Field } from '@components/ui';
import { FilterCard, type FilterCardVariant } from '@components/marketplace/FilterCard';
import type { MakeFacet } from '@services';
import { cn } from '@utils/cn';

import styles from './styles.module.css';

export type ListingMakeModelSelection = {
  marca: string[];
  modelo: string[];
};

export type ListingMakeModelFilterProps = {
  facets: MakeFacet[];
  value: ListingMakeModelSelection;
  onChange: (next: ListingMakeModelSelection) => void;
  onClear?: () => void;
  variant?: FilterCardVariant;
  className?: string;
};

function monogram(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function ListingMakeModelFilter({
  facets,
  value,
  onChange,
  onClear,
  variant,
  className,
}: ListingMakeModelFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [draftMakes, setDraftMakes] = useState<string[]>(value.marca);
  const [draftModels, setDraftModels] = useState<string[]>(value.modelo);

  const selectedRows = useMemo(() => {
    return value.marca.map((makeSlug) => {
      const facet = facets.find((item) => item.slug === makeSlug);
      const models = value.modelo
        .filter((entry) => entry.startsWith(`${makeSlug}:`))
        .map((entry) => {
          const modelSlug = entry.slice(makeSlug.length + 1);
          const model = facet?.models.find((item) => item.slug === modelSlug);

          return model?.name ?? modelSlug;
        });

      return {
        makeSlug,
        makeName: facet?.name ?? makeSlug,
        models,
      };
    });
  }, [facets, value.marca, value.modelo]);

  const filteredFacets = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return facets;
    }

    return facets
      .map((make) => ({
        ...make,
        models: make.models.filter(
          (model) => make.name.toLowerCase().includes(normalized) || model.name.toLowerCase().includes(normalized)
        ),
      }))
      .filter((make) => make.name.toLowerCase().includes(normalized) || make.models.length > 0);
  }, [facets, query]);

  function openPicker() {
    setDraftMakes(value.marca);
    setDraftModels(value.modelo);
    setQuery('');
    setOpen(true);
  }

  function toggleMake(slug: string) {
    setDraftMakes((current) => {
      if (current.includes(slug)) {
        setDraftModels((models) => models.filter((entry) => !entry.startsWith(`${slug}:`)));

        return current.filter((item) => item !== slug);
      }

      return [...current, slug];
    });
  }

  function toggleModel(makeSlug: string, modelSlug: string) {
    const key = `${makeSlug}:${modelSlug}`;

    setDraftModels((current) => {
      if (current.includes(key)) {
        return current.filter((item) => item !== key);
      }

      setDraftMakes((makes) => (makes.includes(makeSlug) ? makes : [...makes, makeSlug]));

      return [...current, key];
    });
  }

  function applyDraft() {
    onChange({ marca: draftMakes, modelo: draftModels });
    setOpen(false);
  }

  function removeRow(makeSlug: string) {
    onChange({
      marca: value.marca.filter((item) => item !== makeSlug),
      modelo: value.modelo.filter((item) => !item.startsWith(`${makeSlug}:`)),
    });
  }

  return (
    <>
      <FilterCard title="Marca e modelo" onClear={onClear} variant={variant} className={className}>
        <div className={styles.listingMakeModel}>
          {selectedRows.map((row) => (
            <div key={row.makeSlug} className={styles.listingMakeModel__row}>
              <span className={styles.listingMakeModel__mono} aria-hidden>
                {monogram(row.makeName)}
              </span>
              <div className={styles.listingMakeModel__copy}>
                <p className={styles.listingMakeModel__make}>{row.makeName}</p>
                {row.models.length > 0 ? (
                  <p className={styles.listingMakeModel__models}>{row.models.join(', ')}</p>
                ) : (
                  <p className={styles.listingMakeModel__models}>Todos os modelos</p>
                )}
              </div>
              <button
                type="button"
                className={styles.listingMakeModel__remove}
                aria-label={`Remover ${row.makeName}`}
                onClick={() => {
                  removeRow(row.makeSlug);
                }}
              >
                <X className="size-4" strokeWidth={1.5} />
              </button>
            </div>
          ))}
          <Button variant="primary" size="sm" className={styles.listingMakeModel__add} onClick={openPicker}>
            + Adicionar modelo
          </Button>
        </div>
      </FilterCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={styles.listingMakeModel__dialog}>
          <DialogHeader>
            <DialogTitle>Marca e modelo</DialogTitle>
            <DialogDescription>Busque e selecione marcas e modelos.</DialogDescription>
          </DialogHeader>
          <Field
            label="Buscar"
            variant="filled"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder="Ex.: Volkswagen, Corolla…"
          />
          <ul className={styles.listingMakeModel__list} role="list">
            {filteredFacets.map((make) => {
              const makeChecked = draftMakes.includes(make.slug);

              return (
                <li key={make.slug} className={styles.listingMakeModel__group}>
                  <label className={styles.listingMakeModel__check}>
                    <input
                      type="checkbox"
                      checked={makeChecked}
                      onChange={() => {
                        toggleMake(make.slug);
                      }}
                    />
                    <span className={styles.listingMakeModel__mono} aria-hidden>
                      {monogram(make.name)}
                    </span>
                    <span>
                      {make.name} <span className={styles.listingMakeModel__count}>({make.count})</span>
                    </span>
                  </label>
                  <ul className={styles.listingMakeModel__modelsList}>
                    {make.models.map((model) => {
                      const key = `${make.slug}:${model.slug}`;
                      const checked = draftModels.includes(key);

                      return (
                        <li key={key}>
                          <label
                            className={cn(styles.listingMakeModel__check, styles['listingMakeModel__check--nested'])}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                toggleModel(make.slug, model.slug);
                              }}
                            />
                            <span>
                              {model.name} <span className={styles.listingMakeModel__count}>({model.count})</span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
          <div className={styles.listingMakeModel__footer}>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={applyDraft}>
              Aplicar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
