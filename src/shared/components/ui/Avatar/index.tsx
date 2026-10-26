'use client';

import * as AvatarPrimitive from '@radix-ui/react-avatar';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@utils/cn';

export function Avatar({ className, ...props }: ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      className={cn('relative flex size-10 shrink-0 overflow-hidden rounded-full bg-surface-sunken', className)}
      {...props}
    />
  );
}

export function AvatarImage({ className, ...props }: ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>) {
  return <AvatarPrimitive.Image className={cn('aspect-square size-full object-cover', className)} {...props} />;
}

export function AvatarFallback({ className, ...props }: ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        'flex size-full items-center justify-center bg-surface-sunken text-sm font-medium text-text-muted',
        className
      )}
      {...props}
    />
  );
}

export type AvatarGroupProps = {
  className?: string;
  children: ReactNode;
  max?: number;
};

export function AvatarGroup({ className, children, max = 4 }: AvatarGroupProps) {
  const items = Array.isArray(children) ? children : [children];
  const visible = items.slice(0, max);
  const overflow = items.length - visible.length;

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visible.map((child, index) => (
        <div key={index} className="ring-2 ring-surface rounded-full">
          {child}
        </div>
      ))}
      {overflow > 0 ? (
        <span className="flex size-10 items-center justify-center rounded-full bg-surface-sunken text-xs font-medium text-text-muted ring-2 ring-surface">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
