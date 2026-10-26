'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@utils/cn';

const iconButtonVariants = cva(
  'inline-flex shrink-0 items-center justify-center transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        'square-accent': 'rounded-md bg-accent-button text-inverse hover:bg-accent-button-hover',
        'circle-white': 'rounded-full border border-border bg-surface text-text hover:bg-surface-sunken',
        'circle-dark': 'rounded-full bg-ink text-inverse hover:bg-ink/90',
        'square-outline': 'rounded-md border border-border bg-transparent text-text hover:bg-surface-sunken',
      },
      size: {
        sm: 'size-9',
        md: 'size-11',
        lg: 'size-12',
      },
    },
    defaultVariants: {
      variant: 'square-outline',
      size: 'md',
    },
  }
);

export type IconButtonVariant = NonNullable<VariantProps<typeof iconButtonVariants>['variant']>;
export type IconButtonSize = NonNullable<VariantProps<typeof iconButtonVariants>['size']>;

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> &
  VariantProps<typeof iconButtonVariants> & {
    /** Obrigatório para acessibilidade */
    'aria-label': string;
    icon: ReactNode;
  };

export function IconButton({ className, variant, size, icon, type = 'button', ...props }: IconButtonProps) {
  return (
    <button type={type} className={cn(iconButtonVariants({ variant, size }), className)} {...props}>
      {icon}
    </button>
  );
}
