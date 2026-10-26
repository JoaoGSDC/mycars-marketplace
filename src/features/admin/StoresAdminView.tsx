'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Badge, Button, Field, Select, SelectItem } from '@components/ui';
import { STORE_STATUS, STORE_STATUS_LABELS, type StoreStatus } from '@app-types/status';
import {
  SUBSCRIPTION_STATUS_LABELS,
  type SubscriptionStatus,
} from '@app-types/subscription';
import type { StoreRow } from '@lib/db';

import { AdminChrome } from './AdminChrome';
import styles from './admin.module.css';

export type StoresAdminViewProps = {
  userName: string;
  items: StoreRow[];
  total: number;
  filters: { status?: string; q?: string };
};

export function StoresAdminView({ userName, items, total, filters }: StoresAdminViewProps) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q ?? '');
  const [status, setStatus] = useState(filters.status ?? 'all');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (status !== 'all') params.set('status', status);
    router.push(`/admin/lojas${params.toString() ? `?${params}` : ''}`);
  }

  return (
    <AdminChrome userName={userName} title="Lojas">
      <div className={styles.admin}>
        <header className={styles.admin__header}>
          <div>
            <h1 className={styles.admin__title}>Lojas</h1>
            <p className={styles.admin__subtitle}>{total} registro(s)</p>
          </div>
        </header>

        <form className={styles.admin__filters} onSubmit={onSubmit}>
          <Field label="Busca" name="q" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select label="Situação" value={status} onValueChange={setStatus}>
            <SelectItem value="all">Todas</SelectItem>
            {Object.values(STORE_STATUS).map((value) => (
              <SelectItem key={value} value={value}>
                {STORE_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </Select>
          <Button type="submit">Filtrar</Button>
        </form>

        {items.length === 0 ? (
          <p className={styles.admin__empty}>Nenhuma loja encontrada.</p>
        ) : (
          <div className={styles.admin__table}>
            <table>
              <thead>
                <tr>
                  <th>Loja</th>
                  <th>Status</th>
                  <th>Assinatura</th>
                  <th>Cidade</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((store) => (
                  <tr key={store.id}>
                    <td>
                      <div>{store.publicName}</div>
                      <div className={styles.admin__hint}>{store.slug}</div>
                    </td>
                    <td>
                      <Badge variant="soft">
                        {STORE_STATUS_LABELS[store.status as StoreStatus] ?? store.status}
                      </Badge>
                    </td>
                    <td>
                      {SUBSCRIPTION_STATUS_LABELS[
                        (store.subscriptionStatus ?? 'none') as SubscriptionStatus
                      ]}
                    </td>
                    <td>
                      {store.city}/{store.state}
                    </td>
                    <td>
                      <Link className={styles.admin__rowLink} href={`/admin/lojas/${store.id}`}>
                        Abrir
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
