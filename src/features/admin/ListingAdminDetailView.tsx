'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge, Button, Field, useToast } from '@components/ui';
import { LISTING_STATUS, LISTING_STATUS_LABELS, type ListingStatus } from '@app-types/status';
import type { AuditEventRow, ListingRow, StoreRow, VehicleRow } from '@lib/db';
import {
  adminCreateReportAction,
  adminModerateListingAction,
} from '@server/admin/admin-actions';

import { AdminChrome } from './AdminChrome';
import styles from './admin.module.css';

export type ListingAdminDetailViewProps = {
  userName: string;
  listing: ListingRow;
  store: StoreRow;
  vehicle: VehicleRow;
  audit: AuditEventRow[];
};

export function ListingAdminDetailView({
  userName,
  listing,
  store,
  vehicle,
  audit,
}: ListingAdminDetailViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);

  async function moderate(toStatus: 'suspended' | 'paused' | 'published') {
    setPending(true);
    const result = await adminModerateListingAction({
      listingId: listing.id,
      toStatus,
      reason,
    });
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Falha', description: result.message, variant: 'error' });
      return;
    }

    toast({ title: 'Anúncio atualizado', variant: 'success' });
    router.refresh();
  }

  async function openReport() {
    setPending(true);
    const result = await adminCreateReportAction({
      listingId: listing.id,
      reason: reason || 'Denúncia registrada pelo admin',
    });
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Falha', description: result.message, variant: 'error' });
      return;
    }

    toast({ title: 'Denúncia registrada', variant: 'success' });
    router.push('/admin/denuncias');
  }

  return (
    <AdminChrome userName={userName} title="Moderação">
      <div className={styles.admin}>
        <header className={styles.admin__header}>
          <div>
            <h1 className={styles.admin__title}>{listing.title}</h1>
            <p className={styles.admin__subtitle}>
              {vehicle.make} {vehicle.model} ·{' '}
              <Link className={styles.admin__rowLink} href={`/admin/lojas/${store.id}`}>
                {store.publicName}
              </Link>
            </p>
            <Badge variant="soft" className="mt-2">
              {LISTING_STATUS_LABELS[listing.status as ListingStatus] ?? listing.status}
            </Badge>
          </div>
          <Button asChild variant="ghost">
            <Link href="/admin/anuncios">Voltar</Link>
          </Button>
        </header>

        <section className={styles.admin__panel}>
          <h2 className="text-sm font-semibold">Conteúdo</h2>
          <p className={styles.admin__meta}>
            Preço: {(listing.priceCents / 100).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </p>
          <p className="text-sm text-text whitespace-pre-wrap">{listing.description}</p>
        </section>

        <section className={styles.admin__panel}>
          <h2 className="text-sm font-semibold">Moderação</h2>
          <Field
            label="Motivo (obrigatório)"
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className={styles.admin__actions}>
            {listing.status !== LISTING_STATUS.SUSPENDED ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending || reason.trim().length < 5}
                onClick={() => moderate('suspended')}
              >
                Suspender publicação
              </Button>
            ) : null}
            {listing.status === LISTING_STATUS.SUSPENDED ? (
              <Button
                type="button"
                disabled={pending || reason.trim().length < 5}
                onClick={() => moderate('published')}
              >
                Liberar (republicar)
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              disabled={pending || reason.trim().length < 5}
              onClick={openReport}
            >
              Registrar denúncia
            </Button>
          </div>
        </section>

        <section className={styles.admin__panel}>
          <h2 className="text-sm font-semibold">Histórico</h2>
          {audit.length === 0 ? (
            <p className={styles.admin__empty}>Sem eventos.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {audit.map((event) => (
                <li key={event.id}>
                  <strong>{event.action}</strong> · {event.createdAt}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminChrome>
  );
}
