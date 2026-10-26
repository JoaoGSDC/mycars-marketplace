'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  SALE_EVENT_TYPE_LABELS,
  SALE_MODALITY_LABELS,
  type SaleEventDto,
  type SaleEventType,
  type SaleListItemDto,
  type SaleModality,
} from '@app-types/sale';
import { SALE_STATUS, SALE_STATUS_LABELS, type SaleStatus } from '@app-types/status';
import { AdminPageHeader, ConfirmDialog } from '@components/dashboard';
import { Badge, Button, Field, useToast } from '@components/ui';
import { cancelSaleAction } from '@server/sales/sale-actions';

import { formatCents, formatDateTime } from './sales.format';
import styles from './sales.module.css';

export type SaleDetailViewProps = {
  storeId: string;
  sale: SaleListItemDto;
  events: SaleEventDto[];
  canWrite: boolean;
  canViewCosts?: boolean;
};

export function SaleDetailView({
  storeId,
  sale,
  events,
  canWrite,
  canViewCosts = false,
}: SaleDetailViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const isCompleted = sale.status === SALE_STATUS.COMPLETED;

  async function onCancel() {
    if (reason.trim().length < 5) {
      toast({
        title: 'Justificativa obrigatória',
        description: 'Informe ao menos 5 caracteres.',
        variant: 'error',
      });
      return;
    }

    setPending(true);
    const result = await cancelSaleAction({
      storeId,
      saleId: sale.id,
      reason: reason.trim(),
    });
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Falha ao estornar', description: result.message, variant: 'error' });
      return;
    }

    toast({
      title: 'Venda cancelada',
      description:
        'O veículo voltou à disponibilidade. Anúncios não são republicados automaticamente.',
      variant: 'success',
    });
    router.refresh();
  }

  return (
    <div className={styles.sales}>
      <AdminPageHeader
        title={sale.vehicleLabel}
        description={
          <>
            {sale.customerName} · {sale.customerPhone}
            <span className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="soft">
                {SALE_STATUS_LABELS[sale.status as SaleStatus] ?? sale.status}
              </Badge>
              <span className={styles.sales__meta}>{formatDateTime(sale.soldAt)}</span>
            </span>
          </>
        }
        secondaryActions={
          <>
            <Button asChild variant="ghost">
              <Link href="/painel/vendas">Voltar</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/painel/estoque/${sale.vehicleId}`}>Veículo</Link>
            </Button>
            {sale.opportunityId ? (
              <Button asChild variant="outline">
                <Link href={`/painel/oportunidades/${sale.opportunityId}`}>Oportunidade</Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className={styles.sales__detail}>
        <section className={styles.sales__panel}>
          <h2 className={styles.sales__panelTitle}>Histórico</h2>
          {events.map((event) => (
            <article key={event.id} className={styles.sales__activity}>
              <div className={styles.sales__meta}>
                {SALE_EVENT_TYPE_LABELS[event.type as SaleEventType] ?? event.type}
                {event.actorName ? ` · ${event.actorName}` : ''}
                {' · '}
                {formatDateTime(event.createdAt)}
              </div>
              <p className="mt-1 text-sm text-text">{event.body}</p>
            </article>
          ))}
        </section>

        <aside className="flex flex-col gap-4">
          <section className={styles.sales__panel}>
            <h2 className={styles.sales__panelTitle}>Valores</h2>
            <p className={styles.sales__meta}>
              Referência: {formatCents(sale.listedPriceCents)}
            </p>
            <p className="text-sm font-semibold text-text">
              Negociado: {formatCents(sale.negotiatedPriceCents)}
            </p>
            {canViewCosts ? (
              <>
                <p className={styles.sales__meta}>
                  Custos considerados: {formatCents(sale.costsCents)}
                  {sale.costsIncomplete === true || sale.costsIncomplete === 'true'
                    ? ' · incompletos'
                    : ''}
                </p>
                <p className={styles.sales__meta}>
                  Resultado bruto estimado:{' '}
                  {sale.grossResultCents === null
                    ? sale.ownership === 'consigned'
                      ? 'N/A (consignado)'
                      : 'Indisponível (dados incompletos)'
                    : formatCents(sale.grossResultCents)}
                </p>
                <p className={styles.sales__hint}>
                  Não é lucro líquido nem confirmação de pagamento.
                </p>
              </>
            ) : (
              <p className={styles.sales__hint}>
                Custos e resultado bruto restritos a quem tem permissão de custos.
              </p>
            )}
            <p className={styles.sales__meta}>
              Modalidade:{' '}
              {SALE_MODALITY_LABELS[sale.modality as SaleModality] ?? sale.modality}
            </p>
            <p className={styles.sales__meta}>Vendedor: {sale.sellerName}</p>
            {sale.hasTradeIn === true || sale.hasTradeIn === 'true' ? (
              <p className="text-sm text-text">
                Troca: {sale.tradeInDescription ?? 'Informada'}
              </p>
            ) : null}
            {sale.notes ? <p className="text-sm text-text">{sale.notes}</p> : null}
            {sale.cancelReason ? (
              <p className={styles.sales__alert}>Estorno: {sale.cancelReason}</p>
            ) : null}
          </section>

          {canWrite && isCompleted ? (
            <section className={styles.sales__panel}>
              <h2 className={styles.sales__panelTitle}>Cancelar / estornar</h2>
              <Field
                label="Justificativa"
                name="reason"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <ConfirmDialog
                tone="danger"
                title="Estornar esta venda?"
                description="O registro permanece no histórico. O veículo volta a disponível; anúncios não são republicados automaticamente."
                confirmLabel="Confirmar estorno"
                trigger={
                  <Button type="button" variant="outline" size="sm" disabled={pending}>
                    Estornar venda
                  </Button>
                }
                action={onCancel}
              />
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
