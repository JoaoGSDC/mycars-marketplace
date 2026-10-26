'use client';

import * as SliderPrimitive from '@radix-ui/react-slider';
import { useMemo } from 'react';

import { Field } from '@components/ui/Field';
import { formatCurrency, formatCount } from '@utils/format';
import { cn } from '@utils/cn';

export type RangeSliderProps = {
  min: number;
  max: number;
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  /** Disparado ao soltar o polegar (Radix onValueCommit). */
  onValueCommit?: (value: [number, number]) => void;
  /** Disparado em blur/Enter dos inputs numéricos. */
  onInputCommit?: (value: [number, number]) => void;
  histogram?: number[];
  className?: string;
  /** Rótulos dos inputs min/max */
  minLabel?: string;
  maxLabel?: string;
  /** Prefixo visual nos inputs (ex.: R$). */
  prefix?: string;
  /** Sufixo visual (ex.: km). */
  suffix?: string;
  step?: number;
};

function formatBound(value: number, prefix?: string, suffix?: string): string {
  if (prefix === 'R$') {
    return formatCurrency(value);
  }

  const formatted = formatCount(value);

  return suffix ? `${formatted} ${suffix}` : formatted;
}

export function RangeSlider({
  min,
  max,
  value,
  onValueChange,
  onValueCommit,
  onInputCommit,
  histogram,
  className,
  minLabel = 'Mínimo',
  maxLabel = 'Máximo',
  prefix,
  suffix,
  step = 1,
}: RangeSliderProps) {
  const histogramMax = useMemo(() => {
    if (!histogram?.length) {
      return 1;
    }

    return Math.max(...histogram, 1);
  }, [histogram]);

  const histogramHeightClasses = ['h-0', 'h-2', 'h-4', 'h-6', 'h-8', 'h-10', 'h-12', 'h-14', 'h-16'] as const;

  const hasRange = Number.isFinite(min) && Number.isFinite(max) && max > min;
  const safeStep = step > 0 ? step : 1;
  /** Radix exige max > min; em faixa degenerada usamos span artificial e desabilitamos. */
  const sliderMax = hasRange ? max : min + safeStep;
  const rangeSpan = hasRange ? max - min : safeStep;
  const sliderValue: [number, number] = hasRange
    ? [Math.min(Math.max(value[0], min), max), Math.min(Math.max(value[1], min), max)]
    : [min, min];

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <p className="text-sm font-medium tabular-nums text-text" aria-live="polite">
        {formatBound(sliderValue[0], prefix, suffix)}
        <span className="mx-1.5 text-text-subtle">–</span>
        {formatBound(sliderValue[1], prefix, suffix)}
      </p>

      {!hasRange ? (
        <p className="rounded-md bg-surface-sunken px-3 py-2 text-xs text-text-muted">
          Faixa única disponível — ajuste outros filtros para ampliar os valores.
        </p>
      ) : null}

      <div className="relative isolate flex w-full flex-col overflow-hidden">
        {hasRange && histogram?.length ? (
          <div className="pointer-events-none flex h-14 w-full items-end gap-px px-1" aria-hidden>
            {histogram.map((count, index) => {
              const barCenter = min + ((index + 0.5) / histogram.length) * rangeSpan;
              const inRange = barCenter >= sliderValue[0] && barCenter <= sliderValue[1];
              const heightIndex = Math.round((count / histogramMax) * (histogramHeightClasses.length - 1));
              const heightClass = histogramHeightClasses[heightIndex];

              return (
                <span
                  key={index}
                  className={cn(
                    'min-w-0 max-h-full flex-1 rounded-t-sm transition-colors',
                    heightClass,
                    inRange ? 'bg-accent' : 'bg-accent-soft'
                  )}
                />
              );
            })}
          </div>
        ) : null}
        <SliderPrimitive.Root
          className={cn(
            'relative z-[1] flex w-full touch-none select-none items-center py-1',
            !hasRange && 'pointer-events-none opacity-50'
          )}
          min={min}
          max={sliderMax}
          step={safeStep}
          value={hasRange ? sliderValue : [min, sliderMax]}
          disabled={!hasRange}
          onValueChange={(next) => {
            if (!hasRange || next.length < 2) {
              return;
            }

            onValueChange([next[0], next[1]]);
          }}
          onValueCommit={(next) => {
            if (!hasRange || next.length < 2) {
              return;
            }

            onValueCommit?.([next[0], next[1]]);
          }}
        >
          <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface-sunken">
            <SliderPrimitive.Range className="absolute h-full rounded-full bg-accent-button" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            aria-label={minLabel}
            className="block size-4 rounded-full border-2 border-accent-button bg-surface shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
          />
          <SliderPrimitive.Thumb
            aria-label={maxLabel}
            className="block size-4 rounded-full border-2 border-accent-button bg-surface shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
          />
        </SliderPrimitive.Root>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label={minLabel}
          variant="filled"
          type="number"
          min={min}
          max={hasRange ? sliderValue[1] : min}
          step={safeStep}
          value={sliderValue[0]}
          prefix={prefix}
          suffix={suffix}
          disabled={!hasRange}
          onChange={(e) => {
            const parsed = Number(e.target.value);

            if (Number.isNaN(parsed) || !hasRange) {
              return;
            }

            const clamped = Math.min(Math.max(parsed, min), sliderValue[1]);

            onValueChange([clamped, sliderValue[1]]);
          }}
          onBlur={() => {
            if (hasRange) {
              onInputCommit?.(sliderValue);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && hasRange) {
              onInputCommit?.(sliderValue);
            }
          }}
        />
        <Field
          label={maxLabel}
          variant="filled"
          type="number"
          min={hasRange ? sliderValue[0] : min}
          max={max}
          step={safeStep}
          value={sliderValue[1]}
          prefix={prefix}
          suffix={suffix}
          disabled={!hasRange}
          onChange={(e) => {
            const parsed = Number(e.target.value);

            if (Number.isNaN(parsed) || !hasRange) {
              return;
            }

            const clamped = Math.max(Math.min(parsed, max), sliderValue[0]);

            onValueChange([sliderValue[0], clamped]);
          }}
          onBlur={() => {
            if (hasRange) {
              onInputCommit?.(sliderValue);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && hasRange) {
              onInputCommit?.(sliderValue);
            }
          }}
        />
      </div>
    </div>
  );
}
