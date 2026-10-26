'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@utils/cn';

const tabsListVariants = cva('inline-flex items-center gap-1', {
  variants: {
    variant: {
      pills: 'rounded-full bg-surface-sunken p-1',
      underline: 'gap-6 border-b border-border',
    },
  },
  defaultVariants: {
    variant: 'pills',
  },
});

const tabsTriggerVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        pills:
          'rounded-full px-4 py-2 text-text-muted data-[state=active]:bg-accent-button data-[state=active]:text-inverse',
        underline:
          'border-b-2 border-transparent px-1 pb-3 text-text-muted data-[state=active]:border-accent data-[state=active]:text-accent-strong',
      },
    },
    defaultVariants: {
      variant: 'pills',
    },
  }
);

export type TabsVariant = NonNullable<VariantProps<typeof tabsListVariants>['variant']>;

export type TabsProps = ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & {
  variant?: TabsVariant;
};

export function Tabs({ className, variant: _variant = 'pills', ...props }: TabsProps) {
  return <TabsPrimitive.Root className={cn('flex flex-col gap-4', className)} {...props} />;
}

export type TabsListProps = ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
  variant?: TabsVariant;
};

export function TabsList({ className, variant = 'pills', ...props }: TabsListProps) {
  return <TabsPrimitive.List className={cn(tabsListVariants({ variant }), className)} {...props} />;
}

export type TabsTriggerProps = ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
  variant?: TabsVariant;
};

export function TabsTrigger({ className, variant = 'pills', ...props }: TabsTriggerProps) {
  return <TabsPrimitive.Trigger className={cn(tabsTriggerVariants({ variant }), className)} {...props} />;
}

export function TabsContent({ className, ...props }: ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn('focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong', className)}
      {...props}
    />
  );
}
