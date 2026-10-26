'use client';

import * as ToastPrimitives from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';

import { cn } from '@utils/cn';

type ToastVariant = 'default' | 'success' | 'error';

export type ToastData = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastContextValue = {
  toasts: ToastData[];
  toast: (data: Omit<ToastData, 'id'>) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function genId() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const variantClasses: Record<ToastVariant, string> = {
  default: 'border-border bg-surface',
  success: 'border-success-fg/20 bg-success-bg text-success-fg',
  error: 'border-error-fg/20 bg-error-bg text-error-fg',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((data: Omit<ToastData, 'id'>) => {
    const id = genId();

    setToasts((prev) => [...prev, { ...data, id }]);
  }, []);

  const value = useMemo(() => ({ toasts, toast, dismiss }), [toasts, toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitives.Provider swipeDirection="right">
        {children}
        {toasts.map((item) => (
          <ToastPrimitives.Root
            key={item.id}
            open
            duration={item.duration ?? 5000}
            className={cn(
              'relative flex w-full max-w-sm flex-col gap-1 rounded-lg border p-4 shadow-popover',
              variantClasses[item.variant ?? 'default']
            )}
            onOpenChange={(open) => {
              if (!open) {
                dismiss(item.id);
              }
            }}
          >
            <ToastPrimitives.Title className="text-sm font-semibold">{item.title}</ToastPrimitives.Title>
            {item.description ? (
              <ToastPrimitives.Description className="text-sm opacity-90">
                {item.description}
              </ToastPrimitives.Description>
            ) : null}
            <ToastPrimitives.Close
              className="absolute right-2 top-2 rounded-md p-1 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
              aria-label="Fechar"
            >
              <X className="size-4" strokeWidth={1.5} />
            </ToastPrimitives.Close>
          </ToastPrimitives.Root>
        ))}
        <ToastViewport />
      </ToastPrimitives.Provider>
    </ToastContext.Provider>
  );
}

export function ToastViewport({ className, ...props }: ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>) {
  return (
    <ToastPrimitives.Viewport
      className={cn(
        'fixed bottom-0 right-0 z-[var(--z-toast)] flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-md',
        className
      )}
      {...props}
    />
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);

  if (!ctx) {
    throw new Error('useToast deve ser usado dentro de ToastProvider');
  }

  return ctx;
}
