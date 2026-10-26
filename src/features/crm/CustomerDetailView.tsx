'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import {
  CUSTOMER_DATA_PURPOSE_LABELS,
  OPPORTUNITY_ORIGIN_LABELS,
  type CustomerDataPurpose,
  type OpportunityOrigin,
} from '@app-types/crm';
import { OPPORTUNITY_STATUS_LABELS, type OpportunityStatus } from '@app-types/status';
import { AdminPageHeader, AdminSection } from '@components/dashboard';
import { StatusBadge } from '@components/marketplace';
import { Button, Field } from '@components/ui';
import type { OpportunityListItemDto } from '@app-types/crm-dto';
import type { CustomerRow } from '@lib/db';
import { updateCustomerAction } from '@server/crm/crm-actions';

import { formatDate, formatDateTime, formatPhoneDisplay } from './crm.format';
import styles from './crm.module.css';

export type CustomerDetailViewProps = {
  storeId: string;
  customer: CustomerRow;
  opportunities: OpportunityListItemDto[];
  possibleDuplicates: Array<{ id: string; name: string; phone: string }>;
  canWrite: boolean;
};

export function CustomerDetailView({
  storeId,
  customer,
  opportunities,
  possibleDuplicates,
  canWrite,
}: CustomerDetailViewProps) {
  const router = useRouter();
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [email, setEmail] = useState(customer.email ?? '');
  const [notes, setNotes] = useState(customer.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    if (!canWrite) {
      return;
    }

    setPending(true);
    setError(null);

    const result = await updateCustomerAction({
      storeId,
      customerId: customer.id,
      name,
      phone,
      email: email || null,
      notes: notes || null,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className={styles.crm}>
      <AdminPageHeader
        title={customer.name}
        description={
          <>
            {formatPhoneDisplay(customer.phone)}
            {customer.email ? ` · ${customer.email}` : ''}
          </>
        }
        secondaryActions={
          <Button asChild variant="ghost">
            <Link href="/painel/clientes">Voltar</Link>
          </Button>
        }
        primaryAction={
          canWrite ? (
            <Button asChild>
              <Link href={`/painel/oportunidades/nova?customerId=${customer.id}`}>
                Nova oportunidade
              </Link>
            </Button>
          ) : undefined
        }
      />

      {possibleDuplicates.length > 0 ? (
        <div className={styles.crm__alert}>
          Possíveis duplicados na loja:{' '}
          {possibleDuplicates.map((dup, index) => (
            <span key={dup.id}>
              {index > 0 ? ', ' : ''}
              <Link href={`/painel/clientes/${dup.id}`}>{dup.name}</Link>
            </span>
          ))}
        </div>
      ) : null}

      <div className={styles.crm__detail}>
        <AdminSection title="Dados">
          <form className={styles.crm__panel} onSubmit={onSubmit}>
            <Field
              label="Nome"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canWrite}
            />
            <Field
              label="Telefone"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!canWrite}
            />
            <Field
              label="E-mail"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!canWrite}
            />
            <Field
              label="Observações"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!canWrite}
            />
            <p className={styles.crm__meta}>
              Origem:{' '}
              {OPPORTUNITY_ORIGIN_LABELS[customer.source as OpportunityOrigin] ?? customer.source}
              {' · '}
              Finalidade:{' '}
              {CUSTOMER_DATA_PURPOSE_LABELS[customer.dataPurpose as CustomerDataPurpose] ??
                customer.dataPurpose}
              {' · '}
              Coletado em {formatDateTime(customer.collectedAt)}
            </p>
            {error ? <p className={styles.crm__alert}>{error}</p> : null}
            {canWrite ? (
              <div className={styles.crm__formActions}>
                <Button type="submit" disabled={pending}>
                  {pending ? 'Salvando…' : 'Salvar alterações'}
                </Button>
              </div>
            ) : null}
          </form>
        </AdminSection>

        <AdminSection title="Oportunidades">
          {opportunities.length === 0 ? (
            <p className={styles.crm__meta}>Nenhuma oportunidade ainda.</p>
          ) : (
            <div className={styles.crm__stack}>
              {opportunities.map((opp) => (
                <Link
                  key={opp.id}
                  href={`/painel/oportunidades/${opp.id}`}
                  className={styles.crm__kanbanCard}
                >
                  <div className={styles.crm__kanbanCardTitle}>
                    {opp.vehicleLabel ?? 'Sem veículo'}
                  </div>
                  <div className={styles.crm__meta}>
                    {formatDate(opp.enteredAt)} ·{' '}
                    {OPPORTUNITY_ORIGIN_LABELS[opp.origin as OpportunityOrigin] ?? opp.origin}
                  </div>
                  <StatusBadge kind="opportunity" status={opp.stage as OpportunityStatus} />
                </Link>
              ))}
            </div>
          )}
        </AdminSection>
      </div>
    </div>
  );
}
