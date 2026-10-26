'use client';

import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import type { InputHTMLAttributes, ReactNode } from 'react';

import { cn } from '@utils/cn';

const fieldInputVariants = cva(
  'w-full bg-transparent text-text placeholder:text-text-subtle focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        filled:
          'rounded-md border border-border bg-surface px-3 py-2.5 focus-visible:ring-2 focus-visible:ring-accent-strong',
        // Borda só no wrapper (prefix/suffix); evita linha dupla com o input.
        underline: 'border-0 px-0 py-2',
      },
      hasError: {
        true: 'border-error-fg focus-visible:ring-error-fg',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'filled',
      hasError: false,
    },
  }
);

export type FieldVariant = NonNullable<VariantProps<typeof fieldInputVariants>['variant']>;

export type FieldProps = {
  label?: string;
  error?: string;
  /** Texto auxiliar abaixo do campo (não substitui `error`). */
  hint?: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
  variant?: FieldVariant;
  className?: string;
  inputClassName?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'>;

export function Field({
  label,
  error,
  hint,
  prefix,
  suffix,
  variant = 'filled',
  className,
  inputClassName,
  id,
  ...inputProps
}: FieldProps) {
  const inputId = id ?? inputProps.name;
  const describedBy = [
    error && inputId ? `${inputId}-error` : null,
    hint && inputId ? `${inputId}-hint` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <LabelPrimitive.Root htmlFor={inputId} className="text-sm font-medium text-text">
          {label}
        </LabelPrimitive.Root>
      ) : null}
      <div
        className={cn(
          'flex items-center gap-2',
          variant === 'filled' && 'rounded-md border border-border bg-surface px-3',
          variant === 'filled' && error && 'border-error-fg',
          variant === 'underline' && 'border-b border-border focus-within:border-accent-strong',
          variant === 'underline' && error && 'border-error-fg'
        )}
      >
        {prefix ? <span className="shrink-0 text-text-muted">{prefix}</span> : null}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            fieldInputVariants({ variant, hasError: Boolean(error) }),
            variant === 'filled' && 'border-0 bg-transparent px-0 py-2.5 focus-visible:ring-0',
            inputClassName
          )}
          {...inputProps}
        />
        {suffix ? <span className="shrink-0 text-text-muted">{suffix}</span> : null}
      </div>
      {error ? (
        <p id={inputId ? `${inputId}-error` : undefined} className="text-xs text-error-fg" role="alert">
          {error}
        </p>
      ) : null}
      {!error && hint ? (
        <p id={inputId ? `${inputId}-hint` : undefined} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export type NumberInputProps = Omit<FieldProps, 'type'> & {
  min?: number;
  max?: number;
  step?: number;
};

export function NumberInput({ min, max, step = 1, ...props }: NumberInputProps) {
  return <Field type="number" min={min} max={max} step={step} inputMode="decimal" {...props} />;
}
