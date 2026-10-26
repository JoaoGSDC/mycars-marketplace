'use client';

import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@utils/cn';

export function RadioGroup({ className, ...props }: ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root className={cn('grid gap-3', className)} {...props} />;
}

export type RadioItemProps = ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & {
  label?: string;
};

export function RadioItem({ className, label, id, ...props }: RadioItemProps) {
  const itemId = id ?? props.value;

  return (
    <div className="flex items-center gap-2">
      <RadioGroupPrimitive.Item
        id={itemId}
        className={cn(
          'aspect-square size-4 shrink-0 rounded-full border border-border bg-surface text-accent-button',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2',
          'data-[state=checked]:border-accent-button',
          className
        )}
        {...props}
      >
        <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
          <span className="size-2 rounded-full bg-accent-button" />
        </RadioGroupPrimitive.Indicator>
      </RadioGroupPrimitive.Item>
      {label ? (
        <label htmlFor={itemId} className="cursor-pointer text-sm text-text">
          {label}
        </label>
      ) : null}
    </div>
  );
}
