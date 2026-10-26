'use client';

import { Field } from '@components/ui/Field';

import { FilterCard, type FilterCardVariant } from '../FilterCard';
import styles from './styles.module.css';

export type YearRangeFilterProps = {
  minYear: number;
  maxYear: number;
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  onClear?: () => void;
  variant?: FilterCardVariant;
  className?: string;
};

export function YearRangeFilter({
  minYear,
  maxYear,
  value,
  onValueChange,
  onClear,
  variant,
  className,
}: YearRangeFilterProps) {
  const hasRange = maxYear > minYear;
  const safeValue: [number, number] = hasRange
    ? [Math.min(Math.max(value[0], minYear), maxYear), Math.min(Math.max(value[1], minYear), maxYear)]
    : [minYear, maxYear];

  return (
    <FilterCard title="Ano" onClear={onClear} variant={variant} className={className}>
      {!hasRange ? (
        <p className="rounded-md bg-surface-sunken px-3 py-2 text-xs text-text-muted">
          Apenas {minYear} disponível nos resultados atuais.
        </p>
      ) : null}
      <div className={styles.yearRangeFilter}>
        <Field
          label="De"
          variant="filled"
          type="number"
          min={minYear}
          max={safeValue[1]}
          value={safeValue[0]}
          disabled={!hasRange}
          onChange={(event) => {
            const parsed = Number(event.target.value);

            if (Number.isNaN(parsed) || !hasRange) {
              return;
            }

            const clamped = Math.min(Math.max(parsed, minYear), safeValue[1]);

            onValueChange([clamped, safeValue[1]]);
          }}
        />
        <Field
          label="Até"
          variant="filled"
          type="number"
          min={safeValue[0]}
          max={maxYear}
          value={safeValue[1]}
          disabled={!hasRange}
          onChange={(event) => {
            const parsed = Number(event.target.value);

            if (Number.isNaN(parsed) || !hasRange) {
              return;
            }

            const clamped = Math.max(Math.min(parsed, maxYear), safeValue[0]);

            onValueChange([safeValue[0], clamped]);
          }}
        />
      </div>
    </FilterCard>
  );
}
