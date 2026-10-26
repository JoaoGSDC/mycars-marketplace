'use client';

import { RangeSlider } from '@components/ui/RangeSlider';

import { FilterCard, type FilterCardVariant } from '../FilterCard';

export type RangeFilterProps = {
  title: string;
  min: number;
  max: number;
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  onValueCommit?: (value: [number, number]) => void;
  onInputCommit?: (value: [number, number]) => void;
  histogram?: number[];
  minLabel?: string;
  maxLabel?: string;
  prefix?: string;
  suffix?: string;
  step?: number;
  onClear?: () => void;
  variant?: FilterCardVariant;
  className?: string;
};

export function RangeFilter({
  title,
  min,
  max,
  value,
  onValueChange,
  onValueCommit,
  onInputCommit,
  histogram,
  minLabel,
  maxLabel,
  prefix,
  suffix,
  step,
  onClear,
  variant,
  className,
}: RangeFilterProps) {
  return (
    <FilterCard title={title} onClear={onClear} variant={variant} className={className}>
      <RangeSlider
        min={min}
        max={max}
        value={value}
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
        onInputCommit={onInputCommit}
        histogram={histogram}
        minLabel={minLabel}
        maxLabel={maxLabel}
        prefix={prefix}
        suffix={suffix}
        step={step}
      />
    </FilterCard>
  );
}
