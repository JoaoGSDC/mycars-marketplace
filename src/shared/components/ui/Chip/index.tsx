'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { cn } from '@utils/cn';

type ChipGroupMode = 'single' | 'multi';

type ChipGroupContextValue = {
  mode: ChipGroupMode;
  selected: string[];
  toggle: (value: string) => void;
};

const ChipGroupContext = createContext<ChipGroupContextValue | null>(null);

function useChipGroupContext() {
  const ctx = useContext(ChipGroupContext);

  if (!ctx) {
    throw new Error('Chip deve ser usado dentro de ChipGroup');
  }

  return ctx;
}

export type ChipGroupProps = {
  mode?: ChipGroupMode;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  className?: string;
  children: ReactNode;
};

export function ChipGroup({
  mode = 'single',
  value,
  defaultValue = [],
  onValueChange,
  className,
  children,
}: ChipGroupProps) {
  const [internal, setInternal] = useState<string[]>(defaultValue);
  const selected = value ?? internal;

  const toggle = useCallback(
    (chipValue: string) => {
      let next: string[];

      if (mode === 'single') {
        next = selected.includes(chipValue) ? [] : [chipValue];
      } else {
        next = selected.includes(chipValue) ? selected.filter((v) => v !== chipValue) : [...selected, chipValue];
      }

      if (value === undefined) {
        setInternal(next);
      }

      onValueChange?.(next);
    },
    [mode, onValueChange, selected, value]
  );

  const contextValue = useMemo(
    () => ({
      mode,
      selected,
      toggle,
    }),
    [mode, selected, toggle]
  );

  return (
    <ChipGroupContext.Provider value={contextValue}>
      <div className={cn('flex flex-wrap gap-2', className)} role="group">
        {children}
      </div>
    </ChipGroupContext.Provider>
  );
}

export type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value'> & {
  value: string;
  children: ReactNode;
};

export function Chip({ value, className, children, type = 'button', onClick, ...props }: ChipProps) {
  const { selected, toggle } = useChipGroupContext();
  const isActive = selected.includes(value);

  return (
    <button
      type={type}
      aria-pressed={isActive}
      className={cn(
        'rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-200',
        'bg-surface-sunken text-text',
        isActive ? 'border-ink' : 'border-transparent hover:border-border',
        className
      )}
      {...props}
      onClick={(event) => {
        toggle(value);
        onClick?.(event);
      }}
    >
      {children}
    </button>
  );
}
