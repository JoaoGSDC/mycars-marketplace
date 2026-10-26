'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge, Button, Field, useToast } from '@components/ui';
import {
  LISTING_REPORT_STATUS,
  LISTING_REPORT_STATUS_LABELS,
  type ListingReportStatus,
} from '@app-types/platform';
import type { ListingReportListItem } from '@server/repositories/listing-reports.repository';
import { adminResolveReportAction } from '@server/admin/admin-actions';

import { AdminChrome } from './AdminChrome';
import styles from './admin.module.css';

export type ReportsAdminViewProps = {
  userName: string;
  items: ListingReportListItem[];
  total: number;
};

export function ReportsAdminView({ userName, items, total }: ReportsAdminViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function resolve(
    reportId: string,
    status: 'resolved' | 'dismissed',
    suspendListing: boolean
  ) {
    setPendingId(reportId);
    const result = await adminResolveReportAction({
      reportId,
      status,
      resolutionNotes: notes[reportId] || 'Resolução administrativa',
      suspendListing,
    });
    setPendingId(null);

    if (!result.ok) {
      toast({ title: 'Falha', description: result.message, variant: 'error' });
      return;
    }

    toast({ title: 'Denúncia atualizada', variant: 'success' });
    router.refresh();
  }

  return (
    <AdminChrome userName={userName} title="Denúncias">
      <div className={styles.admin}>
        <header className={styles.admin__header}>
          <div>
            <h1 className={styles.admin__title}>Denúncias de anúncios</h1>
            <p className={styles.admin__subtitle}>{total} registro(s)</p>
          </div>
        </header>

        {items.length === 0 ? (
          <p className={styles.admin__empty}>Nenhuma denúncia.</p>
        ) : (
          items.map((item) => (
            <article key={item.id} className={styles.admin__panel}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-text">{item.listingTitle}</h2>
                  <p className={styles.admin__meta}>
                    {item.storeName} ·{' '}
                    <Link className={styles.admin__rowLink} href={`/admin/anuncios/${item.listingId}`}>
                      ver anúncio
                    </Link>
                  </p>
                </div>
                <Badge variant="soft">
                  {LISTING_REPORT_STATUS_LABELS[item.status as ListingReportStatus] ?? item.status}
                </Badge>
              </div>
              <p className="text-sm text-text">{item.reason}</p>
              {item.status === LISTING_REPORT_STATUS.OPEN ||
              item.status === LISTING_REPORT_STATUS.REVIEWING ? (
                <>
                  <Field
                    label="Notas de resolução"
                    name={`notes-${item.id}`}
                    value={notes[item.id] ?? ''}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                  />
                  <div className={styles.admin__actions}>
                    <Button
                      type="button"
                      disabled={pendingId === item.id}
                      onClick={() => resolve(item.id, 'resolved', true)}
                    >
                      Resolver e suspender anúncio
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pendingId === item.id}
                      onClick={() => resolve(item.id, 'dismissed', false)}
                    >
                      Descartar
                    </Button>
                  </div>
                </>
              ) : (
                <p className={styles.admin__hint}>{item.resolutionNotes}</p>
              )}
            </article>
          ))
        )}
      </div>
    </AdminChrome>
  );
}
