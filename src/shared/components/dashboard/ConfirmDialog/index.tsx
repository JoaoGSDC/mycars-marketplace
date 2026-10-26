'use client';

import type { ReactNode } from 'react';

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@components/ui';

export type ConfirmDialogProps = {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Form action (server action) ou onConfirm client. */
  action?: () => void | Promise<void>;
  formAction?: ((formData: FormData) => void | Promise<void>) | (() => void | Promise<void>);
  tone?: 'default' | 'danger';
};

/** Confirmação para ações críticas — reutiliza Dialog do DS. */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  action,
  formAction,
  tone = 'default',
}: ConfirmDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <span className="inline-flex">{trigger}</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 flex flex-wrap justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {cancelLabel}
            </Button>
          </DialogClose>
          {formAction ? (
            <form action={formAction}>
              <Button type="submit" variant={tone === 'danger' ? 'dark' : 'primary'}>
                {confirmLabel}
              </Button>
            </form>
          ) : (
            <DialogClose asChild>
              <Button
                type="button"
                variant={tone === 'danger' ? 'dark' : 'primary'}
                onClick={() => {
                  void action?.();
                }}
              >
                {confirmLabel}
              </Button>
            </DialogClose>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
