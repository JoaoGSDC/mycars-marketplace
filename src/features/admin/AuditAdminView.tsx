'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button, Field } from '@components/ui';
import type { PlatformAuditItem } from '@server/repositories/audit-events.repository';

import { AdminChrome } from './AdminChrome';
import styles from './admin.module.css';

export type AuditAdminViewProps = {
  userName: string;
  items: PlatformAuditItem[];
  total: number;
  filters: { q?: string; actionPrefix?: string };
};

export function AuditAdminView({ userName, items, total, filters }: AuditAdminViewProps) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q ?? '');
  const [actionPrefix, setActionPrefix] = useState(filters.actionPrefix ?? '');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (actionPrefix.trim()) params.set('actionPrefix', actionPrefix.trim());
    router.push(`/admin/auditoria${params.toString() ? `?${params}` : ''}`);
  }

  return (
    <AdminChrome userName={userName} title="Auditoria">
      <div className={styles.admin}>
        <header className={styles.admin__header}>
          <div>
            <h1 className={styles.admin__title}>Auditoria administrativa</h1>
            <p className={styles.admin__subtitle}>{total} evento(s)</p>
          </div>
        </header>

        <form className={styles.admin__filters} onSubmit={onSubmit}>
          <Field label="Busca" name="q" value={q} onChange={(e) => setQ(e.target.value)} />
          <Field
            label="Prefixo da ação"
            name="actionPrefix"
            value={actionPrefix}
            onChange={(e) => setActionPrefix(e.target.value)}
            placeholder="store. | listing. | subscription."
          />
          <Button type="submit">Filtrar</Button>
        </form>

        {items.length === 0 ? (
          <p className={styles.admin__empty}>Nenhum evento.</p>
        ) : (
          <div className={styles.admin__table}>
            <table>
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Ação</th>
                  <th>Ator</th>
                  <th>Entidade</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="tabular-nums">{item.createdAt}</td>
                    <td>{item.action}</td>
                    <td>{item.actorName ?? '—'}</td>
                    <td>
                      {item.entityType}
                      {item.entityId ? ` · ${item.entityId.slice(0, 8)}` : ''}
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
