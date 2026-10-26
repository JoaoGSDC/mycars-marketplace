'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import {
  OPPORTUNITY_ORIGIN_LABELS,
  OPPORTUNITY_ORIGINS,
  type OpportunityOrigin,
} from '@app-types/crm';
import type { CrmAssigneeOption } from '@app-types/crm-dto';
import { AdminPageHeader } from '@components/dashboard';
import { Button, Field, Select, SelectItem } from '@components/ui';
import { createOpportunityAction } from '@server/crm/crm-actions';

import { fromDatetimeLocalValue } from './crm.format';
import styles from './crm.module.css';

export type QuickOpportunityFormViewProps = {
  storeId: string;
  assignees: CrmAssigneeOption[];
  initialCustomerId?: string;
  initialCustomerName?: string;
};

export function QuickOpportunityFormView({
  storeId,
  assignees,
  initialCustomerId,
  initialCustomerName,
}: QuickOpportunityFormViewProps) {
  const router = useRouter();
  const [customerId] = useState(initialCustomerId ?? '');
  const [name, setName] = useState(initialCustomerName ?? '');
  const [phone, setPhone] = useState('');
  const [origin, setOrigin] = useState<OpportunityOrigin>(OPPORTUNITY_ORIGINS.WALK_IN);
  const [assigneeUserId, setAssigneeUserId] = useState('none');
  const [notes, setNotes] = useState('');
  const [nextActionLabel, setNextActionLabel] = useState('');
  const [nextActionAt, setNextActionAt] = useState('');
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await createOpportunityAction({
      storeId,
      customerId: customerId || undefined,
      customer: customerId
        ? undefined
        : {
            name,
            phone,
            allowDuplicate,
          },
      origin,
      notes: notes || undefined,
      assigneeUserId: assigneeUserId !== 'none' ? assigneeUserId : undefined,
      nextActionAt: nextActionAt ? fromDatetimeLocalValue(nextActionAt) : undefined,
      nextActionLabel: nextActionLabel || undefined,
    });

    setPending(false);

    if (!result.ok) {
      if (result.code === 'CONFLICT') {
        setAllowDuplicate(true);
      }

      setError(result.message);
      return;
    }

    router.push(`/painel/oportunidades/${result.data.id}`);
    router.refresh();
  }

  return (
    <div className={styles.crm}>
      <AdminPageHeader
        title="Nova oportunidade"
        description="Formulário rápido de atendimento"
        secondaryActions={
          <Button asChild variant="ghost">
            <Link href="/painel/oportunidades">Voltar</Link>
          </Button>
        }
      />

      <form className={styles.crm__form} onSubmit={onSubmit}>
        {customerId ? (
          <p className={styles.crm__meta}>
            Cliente: {initialCustomerName ?? customerId}
          </p>
        ) : (
          <>
            <Field
              label="Nome do cliente"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Field
              label="Telefone"
              name="phone"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </>
        )}

        <Select
          label="Origem"
          value={origin}
          onValueChange={(v) => setOrigin(v as OpportunityOrigin)}
        >
          {Object.values(OPPORTUNITY_ORIGINS).map((value) => (
            <SelectItem key={value} value={value}>
              {OPPORTUNITY_ORIGIN_LABELS[value]}
            </SelectItem>
          ))}
        </Select>

        <Select
          label="Responsável"
          value={assigneeUserId}
          onValueChange={setAssigneeUserId}
        >
          <SelectItem value="none">Sem responsável</SelectItem>
          {assignees.map((member) => (
            <SelectItem key={member.userId} value={member.userId}>
              {member.name}
            </SelectItem>
          ))}
        </Select>

        <Field
          label="Observações"
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Field
          label="Próxima ação"
          name="nextActionLabel"
          value={nextActionLabel}
          onChange={(e) => setNextActionLabel(e.target.value)}
          placeholder="Ex.: Ligar para confirmar visita"
        />
        <Field
          label="Quando"
          name="nextActionAt"
          type="datetime-local"
          value={nextActionAt}
          onChange={(e) => setNextActionAt(e.target.value)}
        />

        {error ? <p className={styles.crm__alert}>{error}</p> : null}
        {allowDuplicate ? (
          <p className={styles.crm__meta}>
            Telefone já cadastrado. Envie novamente para confirmar.
          </p>
        ) : null}

        <div className={styles.crm__formActions}>
          <Button type="submit" disabled={pending}>
            {pending ? 'Salvando…' : 'Criar oportunidade'}
          </Button>
        </div>
      </form>
    </div>
  );
}
