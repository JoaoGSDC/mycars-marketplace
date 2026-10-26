'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentPropsWithoutRef, HTMLAttributes } from 'react';

import { cn } from '@utils/cn';

export type DrawerSide = 'bottom' | 'left' | 'right';

const sideClasses: Record<DrawerSide, string> = {
  bottom:
    'inset-x-0 bottom-0 max-h-[min(90dvh,90%)] rounded-t-2xl border-t pb-[env(safe-area-inset-bottom,0px)] data-[state=open]:animate-[drawer-in-bottom_var(--duration-normal)_var(--ease-out)] data-[state=closed]:animate-[drawer-out-bottom_var(--duration-fast)_ease-in]',
  left: 'inset-y-0 left-0 h-full w-full max-w-sm border-r pt-[env(safe-area-inset-top,0px)] data-[state=open]:animate-[drawer-in-left_var(--duration-normal)_var(--ease-out)] data-[state=closed]:animate-[drawer-out-left_var(--duration-fast)_ease-in]',
  right:
    'inset-y-0 right-0 h-full w-full max-w-sm border-l pt-[env(safe-area-inset-top,0px)] data-[state=open]:animate-[drawer-in-right_var(--duration-normal)_var(--ease-out)] data-[state=closed]:animate-[drawer-out-right_var(--duration-fast)_ease-in]',
};

export function Drawer(props: ComponentPropsWithoutRef<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />;
}

export function DrawerTrigger(props: ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger {...props} />;
}

export function DrawerClose(props: ComponentPropsWithoutRef<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close {...props} />;
}

export type DrawerContentProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  side?: DrawerSide;
};

export function DrawerContent({ className, children, side = 'bottom', ...props }: DrawerContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          'fixed inset-0 z-[var(--z-overlay)] bg-ink/40',
          'data-[state=open]:animate-[drawer-fade-in_var(--duration-normal)_var(--ease-out)]',
          'data-[state=closed]:animate-[drawer-fade-out_var(--duration-fast)_ease-in]'
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-[var(--z-modal)] flex flex-col border-border bg-surface shadow-popover focus-visible:outline-none',
          sideClasses[side],
          className
        )}
        {...props}
      >
        {side === 'bottom' ? (
          <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border" aria-hidden />
        ) : null}
        {children}
        <DialogPrimitive.Close
          className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top,0px))] z-10 flex size-11 items-center justify-center rounded-md text-text-muted hover:bg-surface-sunken hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
          aria-label="Fechar"
        >
          <X className="size-5" strokeWidth={1.5} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DrawerHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex shrink-0 flex-col gap-1 px-5 pb-0 pt-5 pr-14', className)} {...props} />;
}

export function DrawerTitle({ className, ...props }: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-lg font-semibold text-text', className)} {...props} />;
}

export function DrawerDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-sm text-text-muted', className)} {...props} />;
}

export function DrawerBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 py-4', className)}
      {...props}
    />
  );
}

export function DrawerFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mt-auto flex shrink-0 flex-col gap-3 border-t border-border bg-surface px-5 py-4',
        'pb-[max(1rem,env(safe-area-inset-bottom,0px))]',
        className
      )}
      {...props}
    />
  );
}
