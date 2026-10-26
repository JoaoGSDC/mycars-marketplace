'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { AvailabilityReviewItem, StoreIntegrityPolicyDto } from '@app-types/integrity';
import { VEHICLE_STATUS_LABELS, type VehicleStatus } from '@app-types/status';
import { StatusBadge } from '@components/marketplace';
import { Button, EmptyState, Heading, useToast } from '@components/ui';
import {
  confirmAvailabilityAction,
  confirmAvailabilityBatchAction,
} from '@server/integrity/integrity-actions';

import styles from './integrity.module.css';

export type AvailabilityReviewViewProps = {
  storeId: string;
  items: AvailabilityReviewItem[];
  overdueCount: number;
  policy: StoreIntegrityPolicyDto;
  canWrite: boolean;
};

const STATE_LABEL: Record<AvailabilityReviewItem['reviewState'], string> = {
  ok: 'Em dia',
  due_soon: 'Vence em breve',
  overdue: 'Vencido',
};

export function AvailabilityReviewView({
  storeId,
  items,
  overdueCount,
  policy,
  canWrite,
}: AvailabilityReviewViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);

  const confirmable = items.filter(
    (item) => item.status === 'available' || item.status === 'preparing'
  );

  function toggle(vehicleId: string) {
    setSelected((prev) => {
      const next = new Set(prev);

      if (next.has(vehicleId)) {
        next.delete(vehicleId);
      } else {
        next.add(vehicleId);
      }

      return next;
    });
  }

  function toggleAll() {
    if (selected.size === confirmable.length) {
      setSelected(new Set());
      return;
    }

    setSelected(new Set(confirmable.map((item) => item.vehicleId)));
  }

  async function confirmOne(vehicleId: string) {
    setPending(true);
    const result = await confirmAvailabilityAction({ storeId, vehicleId });
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Confirmação bloqueada', description: result.message, variant: 'error' });
      return;
    }

    toast({
      title: 'Disponibilidade confirmada',
      description: result.data.resumedListing
        ? 'Anúncio retomado após hold de confirmação'
        : undefined,
      variant: 'success',
    });
    router.refresh();
  }

  async function confirmBatch() {
    if (selected.size === 0) {
      toast({ title: 'Selecione ao menos um veículo', variant: 'error' });
      return;
    }

    setPending(true);
    const result = await confirmAvailabilityBatchAction({
      storeId,
      vehicleIds: [...selected],
    });
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Lote não processado', description: result.message, variant: 'error' });
      return;
    }

    setSelected(new Set());
    toast({
      title: 'Confirmação em lote',
      description: `${result.data.confirmed.length} confirmado(s), ${result.data.skipped.length} ignorado(s)`,
      variant: 'success',
    });
    router.refresh();
  }

  return (
    <div className={styles.integrity}>
      <header className={styles.integrity__header}>
        <div>
          <Heading as="h1">Confirmação de estoque</Heading>
          <p className={styles.integrity__subtitle}>
            Prazo padrão: {policy.confirmationIntervalDays} dias · Tolerância:{' '}
            {policy.graceDays} dias
            {policy.autoPausePublished
              ? ' · Anúncios publicados podem ser pausados após expiração'
              : ' · Pausa automática desligada'}
            {!policy.enabled ? ' · Política desativada' : ''}
          </p>
        </div>
        <div className={styles.integrity__actions}>
          <Button asChild variant="outline" size="sm">
            <Link href="/painel/configuracoes">Política e privacidade</Link>
          </Button>
          {canWrite ? (
            <Button type="button" size="sm" disabled={pending || selected.size === 0} onClick={confirmBatch}>
              Confirmar selecionados ({selected.size})
            </Button>
          ) : null}
        </div>
      </header>

      {overdueCount > 0 ? (
        <p className={styles.integrity__alert} role="status">
          {overdueCount} veículo(s) com confirmação vencida — revise a disponibilidade sem marcar
          como vendido.
        </p>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          title="Nada na fila de revisão"
          description="Publique anúncios ou aguarde o ciclo de confirmação para ver itens aqui."
        />
      ) : (
        <div className={styles.integrity__tableWrap}>
          <table className={styles.integrity__table}>
            <thead>
              <tr>
                <th>
                  {canWrite ? (
                    <input
                      type="checkbox"
                      aria-label="Selecionar todos"
                      checked={selected.size > 0 && selected.size === confirmable.length}
                      onChange={toggleAll}
                    />
                  ) : null}
                </th>
                <th>Veículo</th>
                <th>Status</th>
                <th>Anúncio</th>
                <th>Vencimento</th>
                <th>Revisão</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.vehicleId}
                  className={
                    item.reviewState === 'overdue'
                      ? styles.integrity__rowOverdue
                      : item.reviewState === 'due_soon'
                        ? styles.integrity__rowSoon
                        : undefined
                  }
                >
                  <td>
                    {canWrite ? (
                      <input
                        type="checkbox"
                        aria-label={`Selecionar ${item.label}`}
                        checked={selected.has(item.vehicleId)}
                        onChange={() => toggle(item.vehicleId)}
                      />
                    ) : null}
                  </td>
                  <td>
                    <Link href={`/painel/estoque/${item.vehicleId}`} className={styles.integrity__link}>
                      {item.label}
                    </Link>
                  </td>
                  <td>
                    <StatusBadge kind="vehicle" status={item.status as VehicleStatus} />
                  </td>
                  <td>
                    {item.listingId ? (
                      <span>
                        {item.listingStatus}
                        {item.availabilityHold ? ' · hold' : ''}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {item.availabilityDueAt
                      ? new Date(item.availabilityDueAt).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td>{STATE_LABEL[item.reviewState]}</td>
                  <td>
                    {canWrite ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => confirmOne(item.vehicleId)}
                      >
                        Confirmar
                      </Button>
                    ) : (
                      <span className="text-xs text-text-muted">
                        {VEHICLE_STATUS_LABELS[item.status as VehicleStatus] ?? item.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
