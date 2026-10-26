'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { VEHICLE_STATUS_LABELS, type VehicleStatus } from '@app-types/status';
import { StatusBadge } from '@components/marketplace';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectItem,
  useToast,
} from '@components/ui';
import { transitionVehicleStatusAction } from '@server/vehicles/inventory-actions';
import { cn } from '@utils/cn';

import { INVENTORY_TRANSITIONS } from './inventory.transitions';
import styles from './inventory.module.css';

export type InventoryStatusCellProps = {
  storeId: string;
  vehicleId: string;
  status: VehicleStatus;
  canWrite: boolean;
  /** Chamado após transição bem-sucedida (ex.: fechar drawer de operações). */
  onSuccess?: () => void;
  /** Rótulo acessível / visual do select. */
  label?: string;
  /** `badge` = pill da tabela; `field` = select de formulário (drawer/ops). */
  appearance?: 'badge' | 'field';
  className?: string;
};

const badgeToneClass: Record<VehicleStatus, string> = {
  available: styles.inventory__statusTriggerSuccess,
  reserved: styles.inventory__statusTriggerWarning,
  preparing: styles.inventory__statusTriggerInfo,
  sold: styles.inventory__statusTriggerNeutral,
  withdrawn: styles.inventory__statusTriggerError,
};

export function InventoryStatusCell({
  storeId,
  vehicleId,
  status,
  canWrite,
  onSuccess,
  label,
  appearance = 'badge',
  className,
}: InventoryStatusCellProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [confirmTo, setConfirmTo] = useState<VehicleStatus | null>(null);

  const transitions = INVENTORY_TRANSITIONS[status] ?? [];
  const editable = canWrite && transitions.length > 0;
  const selectLabel = label ?? (appearance === 'field' ? 'Situação' : undefined);
  const isField = appearance === 'field';

  async function applyTransition(toStatus: VehicleStatus) {
    setPending(true);
    const result = await transitionVehicleStatusAction({
      storeId,
      vehicleId,
      toStatus,
      source: 'inventory',
    });
    setPending(false);
    setConfirmTo(null);

    if (!result.ok) {
      toast({ title: 'Transição bloqueada', description: result.message, variant: 'error' });
      return;
    }

    toast({
      title: 'Situação atualizada',
      description: VEHICLE_STATUS_LABELS[toStatus],
      variant: 'success',
    });
    onSuccess?.();
    router.refresh();
  }

  if (!editable) {
    if (isField) {
      return (
        <div className={cn(styles.inventory__statusFieldReadonly, className)}>
          {selectLabel ? (
            <span className={styles.inventory__statusFieldLabel}>{selectLabel}</span>
          ) : null}
          <StatusBadge kind="vehicle" status={status} />
        </div>
      );
    }

    return <StatusBadge kind="vehicle" status={status} className={className} />;
  }

  return (
    <>
      <Select
        value={status}
        disabled={pending}
        label={selectLabel}
        aria-label={selectLabel ?? 'Alterar situação'}
        onValueChange={(value) => {
          if (value === status) {
            return;
          }

          setConfirmTo(value as VehicleStatus);
        }}
        className={cn(isField ? styles.inventory__statusField : styles.inventory__statusSelect, className)}
        triggerClassName={
          isField
            ? undefined
            : cn(styles.inventory__statusTrigger, badgeToneClass[status])
        }
        iconClassName={isField ? undefined : styles.inventory__statusTriggerIcon}
      >
        <SelectItem value={status}>{VEHICLE_STATUS_LABELS[status]}</SelectItem>
        {transitions.map((toStatus) => (
          <SelectItem key={toStatus} value={toStatus}>
            {VEHICLE_STATUS_LABELS[toStatus]}
          </SelectItem>
        ))}
      </Select>

      <Dialog
        open={confirmTo !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmTo(null);
          }
        }}
      >
        <DialogContent className={styles.inventory__confirmDialog}>
          <DialogHeader className={styles.inventory__confirmHeader}>
            <DialogTitle className={styles.inventory__confirmTitle}>
              {confirmTo
                ? `Marcar como ${VEHICLE_STATUS_LABELS[confirmTo]}?`
                : 'Alterar situação'}
            </DialogTitle>
            <DialogDescription>
              A mudança será registrada na auditoria da loja.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className={styles.inventory__confirmFooter}>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm" disabled={pending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={pending || !confirmTo}
              onClick={() => {
                if (confirmTo) {
                  void applyTransition(confirmTo);
                }
              }}
            >
              {pending ? 'Salvando…' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
