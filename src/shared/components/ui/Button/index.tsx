'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Children, cloneElement, isValidElement, type ButtonHTMLAttributes, type ReactElement } from 'react';

import { cn } from '@utils/cn';

const buttonVariants = cva(
  [
    'group inline-flex items-center justify-center gap-2 rounded-md',
    /* Tipografia travada — igual em <button> e asChild <a> (UA/reset não divergem). */
    '!font-sans !font-semibold !uppercase !tracking-[0.06em] !leading-none',
    'transition-colors duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        /* !*: resets globais (`a { color }` / legado `button { background }`) em asChild e <button> */
        primary:
          '!bg-accent-button !text-white hover:!bg-accent-button-hover [&]:!text-white',
        whatsapp:
          '!bg-whatsapp-button !text-white hover:!bg-whatsapp-button-hover [&]:!text-white',
        dark: '!bg-ink !text-white hover:!bg-ink/90 [&]:!text-white',
        outline:
          '!border !border-border !bg-transparent !text-text hover:!bg-surface-sunken [&]:!text-text',
        /** Contorno laranja — ações secundárias (ex.: salvar rascunho). */
        'outline-accent':
          '!border !border-accent-strong !bg-transparent !text-accent-strong hover:!bg-accent-soft [&]:!text-accent-strong',
        ghost: '!bg-transparent !text-text hover:!bg-surface-sunken [&]:!text-text',
        white:
          '!border !border-border !bg-surface !text-text hover:!bg-surface-sunken [&]:!text-text',
      },
      size: {
        sm: '!h-9 !px-3 !text-xs',
        md: '!h-11 !px-5 !text-sm',
        lg: '!h-12 !px-6 !text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
    withArrow?: boolean;
  };

const arrow = (
  <ArrowRight
    className="size-4 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
    strokeWidth={1.5}
    aria-hidden
  />
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  withArrow = false,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);

  if (asChild) {
    const child = Children.toArray(children).find((node) => isValidElement(node));

    if (!isValidElement(child)) {
      return null;
    }

    const element = child as ReactElement<{ children?: React.ReactNode; className?: string }>;
    const slottedChildren = loading ? (
      <Loader2 className="size-4 shrink-0 animate-spin" strokeWidth={1.5} aria-hidden />
    ) : (
      <>
        {element.props.children}
        {withArrow ? arrow : null}
      </>
    );

    return (
      <Slot aria-busy={loading || undefined} {...props}>
        {cloneElement(element, {
          className: cn(classes, element.props.className),
        }, slottedChildren)}
      </Slot>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="size-4 shrink-0 animate-spin" strokeWidth={1.5} aria-hidden /> : null}
      {children}
      {withArrow && !loading ? arrow : null}
    </button>
  );
}

export { buttonVariants };
