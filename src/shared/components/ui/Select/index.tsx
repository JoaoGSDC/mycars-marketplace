'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@utils/cn';

export type SelectVariant = 'filled' | 'underline';

export type SelectProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Root> & {
  variant?: SelectVariant;
  label?: string;
  placeholder?: string;
  error?: string;
  className?: string;
  labelClassName?: string;
  triggerClassName?: string;
  iconClassName?: string;
};

export function Select({
  variant = 'filled',
  label,
  placeholder = 'Selecione…',
  error,
  className,
  labelClassName,
  triggerClassName,
  iconClassName,
  children,
  ...props
}: SelectProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <span className={cn('text-sm font-medium', labelClassName ?? 'text-text')}>{label}</span>
      ) : null}
      <SelectPrimitive.Root {...props}>
        <SelectPrimitive.Trigger
          aria-invalid={error ? true : undefined}
          className={cn(
            'flex h-11 w-full items-center justify-between gap-2 text-sm text-text',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong',
            'disabled:cursor-not-allowed disabled:opacity-50',
            variant === 'filled' &&
              'rounded-md border border-border bg-surface px-3 data-[placeholder]:text-text-subtle',
            variant === 'underline' && 'border-b border-border px-0 py-2 data-[placeholder]:text-text-subtle',
            error && 'border-error-fg',
            triggerClassName
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <ChevronDown className={cn('size-4 text-text-muted', iconClassName)} strokeWidth={1.5} />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="z-[var(--z-portal)] overflow-hidden rounded-md border border-border bg-surface shadow-popover"
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {error ? (
        <p className="text-xs text-error-fg" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SelectItem({ className, children, ...props }: ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm text-text outline-none',
        'focus:bg-surface-sunken data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4 text-accent-strong" strokeWidth={1.5} />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export function SelectGroup(props: ComponentPropsWithoutRef<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group {...props} />;
}

export function SelectLabel({ className, ...props }: ComponentPropsWithoutRef<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label className={cn('px-2 py-1.5 text-xs font-medium text-text-muted', className)} {...props} />
  );
}

export function SelectSeparator({ className, ...props }: ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
}
