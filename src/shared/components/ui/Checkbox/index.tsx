'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@utils/cn';

export type CheckboxProps = ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
  label?: string;
};

export function Checkbox({ className, label, id, ...props }: CheckboxProps) {
  const checkboxId = id ?? props.name;

  return (
    <div className="flex items-center gap-2">
      <CheckboxPrimitive.Root
        id={checkboxId}
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded-sm border border-border bg-surface',
          'data-[state=checked]:border-accent-button data-[state=checked]:bg-accent-button data-[state=checked]:text-inverse',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2',
          className
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator>
          <Check className="size-3" strokeWidth={1.5} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label ? (
        <label htmlFor={checkboxId} className="cursor-pointer text-sm text-text">
          {label}
        </label>
      ) : null}
    </div>
  );
}
