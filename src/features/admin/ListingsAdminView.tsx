'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Badge, Button, Field, Select, SelectItem } from '@components/ui';
import { LISTING_STATUS, LISTING_STATUS_LABELS, type ListingStatus } from '@app-types/status';
import type { AdminListingListItem } from '@server/repositories/listings.repository';

import { AdminChrome } from './AdminChrome';
import styles from './admin.module.css';

export type ListingsAdminViewProps = {
  userName: string;
  items: AdminListingListItem[];
  total: number;
  filters: { status?: string; q?: string };
};

export function ListingsAdminView({ userName, items, total, filters }: ListingsAdminViewProps) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q ?? '');
  const [status, setStatus] = useState(filters.status ?? 'all');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (status !== 'all') params.set('status', status);
    router.push(`/admin/anuncios${params.toString() ? `?${params}` : ''}`);
  }

  return (
    <AdminChrome userName={userName} title="Anúncios">
      <div className={styles.admin}>
        <header className={styles.admin__header}>
          <div>
            <h1 className={styles.admin__title}>Anúncios</h1>
            <p className={styles.admin__subtitle}>{total} resultado(s)</p>
          </div>
        </header>

        <form className={styles.admin__filters} onSubmit={onSubmit}>
          <Field label="Busca" name="q" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select label="Status" value={status} onValueChange={setStatus}>
            <SelectItem value="all">Todos</SelectItem>
            {Object.values(LISTING_STATUS).map((value) => (
              <SelectItem key={value} value={value}>
                {LISTING_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </Select>
          <Button type="submit">Filtrar</Button>
        </form>

        {items.length === 0 ? (
          <p className={styles.admin__empty}>Nenhum anúncio encontrado.</p>
        ) : (
          <div className={styles.admin__table}>
            <table>
              <thead>
                <tr>
                  <th>Anúncio</th>
                  <th>Loja</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.listing.id}>
                    <td>
                      <div>{item.listing.title}</div>
                      <div className={styles.admin__hint}>{item.vehicleLabel}</div>
                    </td>
                    <td>{item.storeName}</td>
                    <td>
                      <Badge variant="soft">
                        {LISTING_STATUS_LABELS[item.listing.status as ListingStatus] ??
                          item.listing.status}
                      </Badge>
                    </td>
                    <td>
                      <Link
                        className={styles.admin__rowLink}
                        href={`/admin/anuncios/${item.listing.id}`}
                      >
                        Analisar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminChrome>
  );
}
