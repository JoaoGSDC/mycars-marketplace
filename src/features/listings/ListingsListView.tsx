'use client';

import { Pencil } from 'lucide-react';
import Link from 'next/link';

import { LISTING_STATUS_LABELS, type ListingStatus } from '@app-types/status';
import {
  AdminDataTable,
  AdminPageHeader,
  adminTableStyles,
} from '@components/dashboard';
import { StatusBadge } from '@components/marketplace';
import { Button, EmptyState } from '@components/ui';
import type { ListingRow, VehicleRow } from '@lib/db';
import { formatCurrency } from '@utils/format';

import styles from './listings.module.css';

export type ListingListItem = {
  listing: ListingRow;
  vehicle: VehicleRow | null;
};

export type ListingsListViewProps = {
  items: ListingListItem[];
  canWrite: boolean;
};

export function ListingsListView({ items, canWrite }: ListingsListViewProps) {
  return (
    <div className={styles.listings}>
      <AdminPageHeader
        title="Anúncios"
        description="Publicações comerciais vinculadas ao estoque — marketplace e vitrine juntos."
        primaryAction={
          canWrite ? (
            <Button asChild variant="outline">
              <Link href="/painel/estoque">Criar a partir do estoque</Link>
            </Button>
          ) : undefined
        }
      />

      <AdminDataTable
        head={
          <tr>
            <th>Anúncio</th>
            <th>Situação</th>
            <th>Preço público</th>
            <th>Veículo</th>
            {canWrite ? <th className="w-[1%] whitespace-nowrap">Ações</th> : null}
          </tr>
        }
        empty={
          <EmptyState
            title="Nenhum anúncio ainda"
            description="Cadastre um veículo no estoque e publique quando estiver disponível."
            action={
              <Button asChild>
                <Link href="/painel/estoque">Ir ao estoque</Link>
              </Button>
            }
          />
        }
      >
        {items.length === 0
          ? null
          : items.map(({ listing, vehicle }) => (
              <tr key={listing.id}>
                <td>
                  <Link
                    href={
                      vehicle
                        ? `/painel/estoque/${vehicle.id}?aba=publicacao`
                        : '/painel/estoque'
                    }
                    className={adminTableStyles.rowLink}
                  >
                    {listing.title}
                  </Link>
                  <p className={adminTableStyles.rowMeta}>/{listing.slug}</p>
                </td>
                <td>
                  <StatusBadge kind="listing" status={listing.status as ListingStatus} />
                  <span className="sr-only">
                    {LISTING_STATUS_LABELS[listing.status as ListingStatus]}
                  </span>
                </td>
                <td className="tabular-nums">{formatCurrency(listing.priceCents / 100)}</td>
                <td>
                  {vehicle ? (
                    <Link
                      href={`/painel/estoque/${vehicle.id}`}
                      className={adminTableStyles.meta}
                    >
                      {vehicle.make} {vehicle.model}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                {canWrite ? (
                  <td>
                    <div className={adminTableStyles.rowActions}>
                      <Button asChild variant="ghost" size="sm">
                        <Link
                          href={
                            vehicle
                              ? `/painel/estoque/${vehicle.id}?aba=publicacao`
                              : '/painel/estoque'
                          }
                        >
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
