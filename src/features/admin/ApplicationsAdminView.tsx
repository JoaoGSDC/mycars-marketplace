'use client';

import { useState } from 'react';

import { Badge, Button, Field, useToast } from '@components/ui';
import { STORE_STATUS_LABELS } from '@app-types/status';
import type { StoreRow } from '@lib/db';
import { adminReviewApplicationAction } from '@server/admin/admin-actions';
import { formatCnpj } from '@utils/cnpj';

import { AdminChrome } from './AdminChrome';
import styles from './admin-apps.module.css';

export type ApplicationsAdminViewProps = {
  userName: string;
  applications: StoreRow[];
};

export function ApplicationsAdminView({ userName, applications }: ApplicationsAdminViewProps) {
  const { toast } = useToast();
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  async function review(storeId: string, decision: 'approve' | 'reject') {
    setBusyId(storeId);
    const result = await adminReviewApplicationAction({
      storeId,
      decision,
      rejectionReason: decision === 'reject' ? reasonById[storeId] : undefined,
    });
    setBusyId(null);

    if (!result.ok) {
      toast({ title: 'Falha na análise', description: result.message, variant: 'error' });
      return;
    }

    toast({
      title: decision === 'approve' ? 'Aprovada' : 'Rejeitada',
      variant: decision === 'approve' ? 'success' : 'default',
    });
  }

  return (
    <AdminChrome userName={userName} title="Solicitações">
      <div className={styles.apps}>
        {applications.length === 0 ? (
          <p className={styles.apps__empty}>Nenhuma solicitação pendente.</p>
        ) : (
          applications.map((store) => (
            <article key={store.id} className={styles.apps__card}>
              <div className={styles.apps__header}>
                <div>
                  <h2 className={styles.apps__title}>{store.publicName}</h2>
                  <p className={styles.apps__meta}>
                    {store.tradeName} · {store.document ? formatCnpj(store.document) : '—'} ·{' '}
                    {store.city}/{store.state}
                  </p>
                </div>
                <Badge variant="soft">{STORE_STATUS_LABELS.pending}</Badge>
              </div>
              <p className={styles.apps__body}>{store.institutionalInfo}</p>
              <p className={styles.apps__meta}>
                Responsável: {store.responsibleName} · {store.responsibleEmail} · Subdomínio:{' '}
                {store.subdomain}
              </p>
              <Field
                label="Motivo da rejeição (obrigatório se rejeitar)"
                name={`reason-${store.id}`}
                value={reasonById[store.id] ?? ''}
                onChange={(e) =>
                  setReasonById((prev) => ({ ...prev, [store.id]: e.target.value }))
                }
              />
              <div className={styles.apps__actions}>
                <Button
                  type="button"
                  disabled={busyId === store.id}
                  onClick={() => review(store.id, 'approve')}
                >
                  Aprovar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busyId === store.id}
                  onClick={() => review(store.id, 'reject')}
                >
                  Rejeitar
                </Button>
              </div>
              <p className={styles.apps__note}>
                Aprovação não confirma pagamento. Assinatura permanece independente.
              </p>
            </article>
          ))
        )}
      </div>
    </AdminChrome>
  );
}
