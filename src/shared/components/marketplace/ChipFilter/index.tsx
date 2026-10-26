'use client';

import { Chip, ChipGroup } from '@components/ui/Chip';

import { FilterCard, type FilterCardVariant } from '../FilterCard';
import styles from './styles.module.css';

export type ChipFilterOption = {
  value: string;
  label: string;
};

export type ChipFilterProps = {
  title: string;
  mode?: 'single' | 'multi';
  options: ChipFilterOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  onClear?: () => void;
  variant?: FilterCardVariant;
  className?: string;
};

export function ChipFilter({
  title,
  mode = 'multi',
  options,
  value,
  onValueChange,
  onClear,
  variant,
  className,
}: ChipFilterProps) {
  return (
    <FilterCard title={title} onClear={onClear} variant={variant} className={className}>
      <ChipGroup mode={mode} value={value} onValueChange={onValueChange} className={styles.chipFilter}>
        {options.map((option) => (
          <Chip key={option.value} value={option.value}>
            {option.label}
          </Chip>
        ))}
      </ChipGroup>
    </FilterCard>
  );
}
