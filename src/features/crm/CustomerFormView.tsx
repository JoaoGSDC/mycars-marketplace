'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import {
  CUSTOMER_DATA_PURPOSE_LABELS,
  CUSTOMER_DATA_PURPOSES,
  OPPORTUNITY_ORIGIN_LABELS,
  OPPORTUNITY_ORIGINS,
  type CustomerDataPurpose,
  type OpportunityOrigin,
} from '@app-types/crm';
import {
  AdminFormActions,
  AdminFormActionsSpacer,
  AdminFormErrorSummary,
  AdminFormLayout,
  AdminPageHeader,
} from '@components/dashboard';
import { Button, Field, Select, SelectItem } from '@components/ui';
import { createCustomerAction } from '@server/crm/crm-actions';

import styles from './crm.module.css';

export type CustomerFormViewProps = {
  storeId: string;
};

export function CustomerFormView({ storeId }: CustomerFormViewProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [source, setSource] = useState<OpportunityOrigin>(OPPORTUNITY_ORIGINS.WALK_IN);
  const [dataPurpose, setDataPurpose] = useState<CustomerDataPurpose>(
    CUSTOMER_DATA_PURPOSES.COMMERCIAL_CONTACT
  );
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await createCustomerAction({
      storeId,
      name,
      phone,
      email: email || undefined,
      notes: notes || undefined,
      source,
      dataPurpose,
      allowDuplicate,
    });

    setPending(false);

    if (!result.ok) {
      if (result.code === 'CONFLICT') {
        setAllowDuplicate(true);
      }

      setError(result.message);
      return;
    }

    router.push(`/painel/clientes/${result.data.customer.id}`);
    router.refresh();
  }

  return (
    <div className={styles.crm}>
      <AdminPageHeader
        title="Novo cliente"
        description="Cadastro manual · dados mínimos para contato comercial (LGPD)"
      />

      <AdminFormLayout width="sm">
        <form className={styles.crm__formFields} onSubmit={onSubmit}>
          <AdminFormErrorSummary
            errors={error ? [{ id: 'form', message: error }] : []}
          />
          <Field
            label="Nome"
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
            placeholder="(19) 99999-9999"
          />
          <Field
            label="E-mail"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Select
            label="Origem"
            value={source}
            onValueChange={(v) => setSource(v as OpportunityOrigin)}
          >
            {Object.values(OPPORTUNITY_ORIGINS).map((origin) => (
              <SelectItem key={origin} value={origin}>
                {OPPORTUNITY_ORIGIN_LABELS[origin]}
              </SelectItem>
            ))}
          </Select>
          <Select
            label="Finalidade"
            value={dataPurpose}
            onValueChange={(v) => setDataPurpose(v as CustomerDataPurpose)}
          >
            {Object.values(CUSTOMER_DATA_PURPOSES).map((purpose) => (
              <SelectItem key={purpose} value={purpose}>
                {CUSTOMER_DATA_PURPOSE_LABELS[purpose]}
              </SelectItem>
            ))}
          </Select>
          <Field
            label="Observações"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {allowDuplicate ? (
            <p className={styles.crm__meta}>
              Há possível duplicado nesta loja. Envie novamente para confirmar o cadastro.
            </p>
          ) : null}
          <AdminFormActions>
            <Button asChild variant="outline">
              <Link href="/painel/clientes">Cancelar</Link>
            </Button>
            <AdminFormActionsSpacer />
            <Button type="submit" disabled={pending}>
              {pending ? 'Salvando…' : allowDuplicate ? 'Cadastrar mesmo assim' : 'Salvar'}
            </Button>
          </AdminFormActions>
        </form>
      </AdminFormLayout>
    </div>
  );
}
