'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import {
  RESERVATION_EVENT_TYPE_LABELS,
  type ReservationEventType,
  type ReservationEventDto,
  type ReservationListItemDto,
} from '@app-types/reservation';
import {
  RESERVATION_STATUS,
  RESERVATION_STATUS_LABELS,
  type ReservationStatus,
} from '@app-types/status';
import { AdminPageHeader, ConfirmDialog } from '@components/dashboard';
import { Badge, Button, Field, useToast } from '@components/ui';
import {
  cancelReservationAction,
  extendReservationAction,
} from '@server/reservations/reservation-actions';

import styles from './reservations.module.css';

export type ReservationDetailViewProps = {
  storeId: string;
  reservation: ReservationListItemDto;
  events: ReservationEventDto[];
  canWrite: boolean;
};

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ReservationDetailView({
  storeId,
  reservation,
  events,
  canWrite,
}: ReservationDetailViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isActive = reservation.status === RESERVATION_STATUS.ACTIVE;

  const extendDefaultIso = new Date(
    Math.max(Date.now(), new Date(reservation.expiresAt).getTime()) + 24 * 60 * 60 * 1000
  ).toISOString();
  const [expiresAt, setExpiresAt] = useState(toDatetimeLocalValue(extendDefaultIso));
  const [cancelReason, setCancelReason] = useState('');
  const [pending, setPending] = useState(false);

  async function onExtend(event: FormEvent) {
    event.preventDefault();
    setPending(true);

    const result = await extendReservationAction({
      storeId,
      reservationId: reservation.id,
      expiresAt: new Date(expiresAt).toISOString(),
    });

    setPending(false);

    if (!result.ok) {
      toast({ title: 'Falha ao prorrogar', description: result.message, variant: 'error' });
      return;
    }

    toast({ title: 'Reserva prorrogada', variant: 'success' });
    router.refresh();
  }

  async function onCancel() {
    setPending(true);

    const result = await cancelReservationAction({
      storeId,
      reservationId: reservation.id,
      reason: cancelReason || undefined,
    });

    setPending(false);

    if (!result.ok) {
      toast({ title: 'Falha ao cancelar', description: result.message, variant: 'error' });
      return;
    }

    toast({
      title: 'Reserva cancelada',
      description: 'O veículo voltou à disponibilidade, se não houver outro bloqueio.',
      variant: 'success',
    });
    router.refresh();
  }

  return (
    <div className={styles.reservations}>
      <AdminPageHeader
        title={reservation.vehicleLabel}
        description={
          <>
            {reservation.customerName} · {reservation.customerPhone}
            <span className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={isActive ? 'soft' : 'neutral'}>
                {RESERVATION_STATUS_LABELS[reservation.status as ReservationStatus] ??
                  reservation.status}
              </Badge>
              <span
                className={
                  reservation.isOverdue
                    ? styles.reservations__overdue
                    : styles.reservations__meta
                }
              >
                Válida até {formatWhen(reservation.expiresAt)}
                {reservation.isOverdue ? ' · vencida' : ''}
              </span>
            </span>
          </>
        }
        secondaryActions={
          <>
            <Button asChild variant="ghost">
              <Link href="/painel/reservas">Voltar</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/painel/estoque/${reservation.vehicleId}`}>Veículo</Link>
            </Button>
            {reservation.opportunityId ? (
              <Button asChild variant="outline">
                <Link href={`/painel/oportunidades/${reservation.opportunityId}`}>
                  Oportunidade
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className={styles.reservations__detail}>
        <section className={styles.reservations__panel}>
          <h2 className={styles.reservations__panelTitle}>Histórico</h2>
          {events.length === 0 ? (
            <p className={styles.reservations__meta}>Sem eventos.</p>
          ) : (
            events.map((event) => (
              <article key={event.id} className={styles.reservations__activity}>
                <div className={styles.reservations__meta}>
                  {RESERVATION_EVENT_TYPE_LABELS[event.type as ReservationEventType] ??
                    event.type}
                  {event.actorName ? ` · ${event.actorName}` : ''}
                  {' · '}
                  {formatWhen(event.createdAt)}
                </div>
                <p className="mt-1 text-sm text-text">{event.body}</p>
              </article>
            ))
          )}
        </section>

        <aside className="flex flex-col gap-4">
          <section className={styles.reservations__panel}>
            <h2 className={styles.reservations__panelTitle}>Resumo</h2>
            <p className={styles.reservations__meta}>
              Início: {formatWhen(reservation.startsAt)}
            </p>
            <p className={styles.reservations__meta}>
              Responsável: {reservation.assigneeName ?? '—'}
            </p>
            {reservation.notes ? (
              <p className="text-sm text-text">{reservation.notes}</p>
            ) : null}
          </section>

          {canWrite && isActive ? (
            <>
              <form className={styles.reservations__panel} onSubmit={onExtend}>
                <h2 className={styles.reservations__panelTitle}>Prorrogar</h2>
                <Field
                  label="Nova validade"
                  name="expiresAt"
                  type="datetime-local"
                  required
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
                <Button type="submit" size="sm" disabled={pending}>
                  Prorrogar prazo
                </Button>
              </form>

              <section className={styles.reservations__panel}>
                <h2 className={styles.reservations__panelTitle}>Cancelar</h2>
                <Field
                  label="Motivo (opcional)"
                  name="cancelReason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <ConfirmDialog
                  tone="danger"
                  title="Cancelar esta reserva?"
                  description="O veículo voltará a disponível se não houver outro impedimento."
                  confirmLabel="Cancelar reserva"
                  trigger={
                    <Button type="button" variant="outline" size="sm" disabled={pending}>
                      Cancelar reserva
                    </Button>
                  }
                  action={onCancel}
                />
              </section>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
