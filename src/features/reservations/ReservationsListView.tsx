'use client';

import { Pencil } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import type { ReservationListItemDto } from '@app-types/reservation';
import {
  RESERVATION_STATUS,
  RESERVATION_STATUS_LABELS,
  type ReservationStatus,
} from '@app-types/status';
import {
  AdminDataTable,
  AdminFilterBar,
  AdminPageHeader,
  AdminStatChips,
  adminTableStyles,
} from '@components/dashboard';
import { Badge, Button, EmptyState, Field, Pagination } from '@components/ui';

import styles from './reservations.module.css';

export type ReservationsListViewProps = {
  items: ReservationListItemDto[];
  total: number;
  page: number;
  totalPages: number;
  statusCounts: Record<string, number>;
  canWrite: boolean;
  filters: { status?: string; q?: string };
};

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && value !== 'all') {
      search.set(key, value);
    }
  }

  const qs = search.toString();

  return qs ? `?${qs}` : '';
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function statusBadgeVariant(status: string): 'soft' | 'neutral' {
  if (status === RESERVATION_STATUS.ACTIVE || status === RESERVATION_STATUS.COMPLETED) {
    return 'soft';
  }

  return 'neutral';
}

export function ReservationsListView({
  items,
  total,
  page,
  totalPages,
  statusCounts,
  canWrite,
  filters,
}: ReservationsListViewProps) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q ?? '');

  const statusFilters: Array<ReservationStatus | 'all'> = [
    'all',
    RESERVATION_STATUS.ACTIVE,
    RESERVATION_STATUS.COMPLETED,
    RESERVATION_STATUS.CANCELLED,
    RESERVATION_STATUS.EXPIRED,
  ];

  function applyFilters(extra: Record<string, string | undefined> = {}) {
    router.push(
      '/painel/reservas' +
        buildQuery({
          q: q || undefined,
          status: filters.status,
          page: '1',
          ...extra,
        })
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    applyFilters();
  }

  const chips = statusFilters.map((key) => {
    const count =
      key === 'all'
        ? Object.values(statusCounts).reduce((sum, value) => sum + value, 0)
        : (statusCounts[key] ?? 0);
    const active = (filters.status ?? 'all') === key;

    return {
      id: key,
      label: key === 'all' ? 'Todas' : RESERVATION_STATUS_LABELS[key],
      count,
      active,
      onClick: () => applyFilters({ status: key === 'all' ? undefined : key, page: '1' }),
    };
  });

  return (
    <div className={styles.reservations}>
      <AdminPageHeader
        title="Reservas"
        description={`Unidades temporariamente bloqueadas · ${total} registro${total === 1 ? '' : 's'}`}
        primaryAction={
          canWrite ? (
            <Button asChild>
              <Link href="/painel/reservas/nova">Nova reserva</Link>
            </Button>
          ) : undefined
        }
      />

      <AdminStatChips items={chips} aria-label="Filtrar por situação" />

      <AdminFilterBar
        onSubmit={onSubmit}
        actions={<Button type="submit">Filtrar</Button>}
      >
        <Field
          label="Pesquisar"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cliente, telefone ou veículo"
        />
      </AdminFilterBar>

      <AdminDataTable
        head={
          <tr>
            <th>Veículo</th>
            <th>Cliente</th>
            <th>Situação</th>
            <th>Validade</th>
            <th>Responsável</th>
            {canWrite ? <th className="w-[1%] whitespace-nowrap">Ações</th> : null}
          </tr>
        }
        empty={
          <EmptyState
            title="Nenhuma reserva"
            description="Reserve um veículo disponível a partir do estoque ou de uma oportunidade."
          />
        }
        footer={
          <>
            <span className={adminTableStyles.meta}>
              Página {page} de {totalPages}
            </span>
            <Pagination
              page={page}
              totalPages={totalPages}
              getHref={(p) =>
                '/painel/reservas' +
                buildQuery({ q: filters.q, status: filters.status, page: String(p) })
              }
            />
          </>
        }
      >
        {items.length === 0
          ? null
          : items.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link
                    className={adminTableStyles.rowLink}
                    href={`/painel/reservas/${item.id}`}
                  >
                    {item.vehicleLabel}
                  </Link>
                </td>
                <td>
                  <div>{item.customerName}</div>
                  <div className={adminTableStyles.rowMeta}>{item.customerPhone}</div>
                </td>
                <td>
                  <Badge variant={statusBadgeVariant(item.status)}>
                    {RESERVATION_STATUS_LABELS[item.status as ReservationStatus] ??
                      item.status}
                  </Badge>
                </td>
                <td>
                  <span
                    className={
                      item.isOverdue ? styles.reservations__overdue : adminTableStyles.meta
                    }
                  >
                    {formatWhen(item.expiresAt)}
                    {item.isOverdue ? ' · vencida' : ''}
                  </span>
                </td>
                <td>
                  <span className={adminTableStyles.meta}>{item.assigneeName ?? '—'}</span>
                </td>
                {canWrite ? (
                  <td>
                    <div className={adminTableStyles.rowActions}>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/painel/reservas/${item.id}`}>
                          <Pencil className="size-3.5" aria-hidden />
                          Editar
                        </Link>
                      </Button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
      </AdminDataTable>
    </div>
  );
}
