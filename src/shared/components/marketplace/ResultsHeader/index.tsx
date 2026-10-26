'use client';

import type { BodyType } from '@app-types/vehicle';
import { Badge } from '@components/ui/Badge';
import { Select, SelectItem } from '@components/ui/Select';
import { formatCount } from '@utils/format';
import { cn } from '@utils/cn';

import { BodyTypeSelector } from '../BodyTypeSelector';
import styles from './styles.module.css';

export type ResultsSortOption = {
  value: string;
  label: string;
};

export type ResultsHeaderProps = {
  title?: string;
  totalCount: number;
  sort?: string;
  onSortChange?: (value: string) => void;
  sortOptions?: ResultsSortOption[];
  bodyType?: BodyType | null;
  onBodyTypeChange?: (value: BodyType | null) => void;
  className?: string;
};

export function ResultsHeader({
  title = 'Veículos encontrados',
  totalCount,
  sort,
  onSortChange,
  sortOptions = [],
  bodyType,
  onBodyTypeChange,
  className,
}: ResultsHeaderProps) {
  return (
    <header className={cn(styles.resultsHeader, className)}>
      <div className={styles.resultsHeader__top}>
        <div className={styles.resultsHeader__titleRow}>
          <h2 className={styles.resultsHeader__title}>{title}</h2>
          <Badge variant="count">{formatCount(totalCount)}</Badge>
        </div>
        {sortOptions.length > 0 ? (
          <Select
            label="Ordenar"
            placeholder="Ordenar por"
            value={sort}
            onValueChange={onSortChange}
            className={styles.resultsHeader__sort}
          >
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </Select>
        ) : null}
      </div>
      <BodyTypeSelector value={bodyType} onChange={onBodyTypeChange} />
    </header>
  );
}
