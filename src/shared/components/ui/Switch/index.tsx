'use client';

import * as SwitchPrimitive from '@radix-ui/react-switch';
import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@utils/cn';

export type SwitchProps = ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & {
  label?: string;
};

export function Switch({ className, label, id, ...props }: SwitchProps) {
  const switchId = id ?? props.name;

  return (
    <div className="flex items-center gap-2">
      <SwitchPrimitive.Root
        id={switchId}
        className={cn(
          'peer inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-border bg-surface-sunken transition-colors',
          'data-[state=checked]:border-accent-button data-[state=checked]:bg-accent-soft',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'pointer-events-none block size-4 translate-x-0.5 rounded-full bg-surface shadow-card transition-transform',
            'data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-accent-button'
          )}
        />
      </SwitchPrimitive.Root>
      {label ? (
        <label htmlFor={switchId} className="cursor-pointer text-sm text-text">
          {label}
        </label>
      ) : null}
    </div>
  );
}
