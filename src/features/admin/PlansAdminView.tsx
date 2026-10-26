'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge, Button, Field, useToast } from '@components/ui';
import type { PlanRow } from '@lib/db';
import { adminUpsertPlanAction } from '@server/admin/admin-actions';

import { AdminChrome } from './AdminChrome';
import styles from './admin.module.css';

export type PlansAdminViewProps = {
  userName: string;
  plans: PlanRow[];
};

const emptyForm = {
  code: '',
  name: '',
  description: '',
  maxPublishedListings: '25',
  maxVehicles: '100',
  maxMembers: '10',
  gracePeriodDays: '7',
  priceCentsMonthly: '0',
};

export function PlansAdminView({ userName, plans }: PlansAdminViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [pending, setPending] = useState(false);

  async function createPlan() {
    setPending(true);
    const result = await adminUpsertPlanAction({
      code: form.code,
      name: form.name,
      description: form.description || undefined,
      maxPublishedListings: Number(form.maxPublishedListings),
      maxVehicles: Number(form.maxVehicles),
      maxMembers: Number(form.maxMembers),
      gracePeriodDays: Number(form.gracePeriodDays),
      priceCentsMonthly: Math.round(Number(form.priceCentsMonthly) * 100),
      isActive: true,
    });
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Falha', description: result.message, variant: 'error' });
      return;
    }

    toast({ title: 'Plano criado', variant: 'success' });
    setForm(emptyForm);
    router.refresh();
  }

  return (
    <AdminChrome userName={userName} title="Planos">
      <div className={styles.admin}>
        <header className={styles.admin__header}>
          <div>
            <h1 className={styles.admin__title}>Planos e limites</h1>
            <p className={styles.admin__subtitle}>
              Sem gateway de pagamento. Ativação manual com auditoria.
            </p>
          </div>
        </header>

        <div className={styles.admin__table}>
          <table>
            <thead>
              <tr>
                <th>Plano</th>
                <th>Anúncios</th>
                <th>Veículos</th>
                <th>Tolerância</th>
                <th>Preço ref.</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id}>
                  <td>
                    <div>{plan.name}</div>
                    <div className={styles.admin__hint}>{plan.code}</div>
                  </td>
                  <td>{plan.maxPublishedListings}</td>
                  <td>{plan.maxVehicles}</td>
                  <td>{plan.gracePeriodDays} dias</td>
                  <td>
                    {(plan.priceCentsMonthly / 100).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </td>
                  <td>
                    <Badge variant="soft">
                      {plan.isActive === 'true' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className={styles.admin__panel}>
          <h2 className="text-sm font-semibold">Novo plano</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Código"
              name="code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
            <Field
              label="Nome"
              name="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Field
              label="Máx. anúncios publicados"
              name="maxPublishedListings"
              value={form.maxPublishedListings}
              onChange={(e) => setForm((f) => ({ ...f, maxPublishedListings: e.target.value }))}
            />
            <Field
              label="Máx. veículos"
              name="maxVehicles"
              value={form.maxVehicles}
              onChange={(e) => setForm((f) => ({ ...f, maxVehicles: e.target.value }))}
            />
            <Field
              label="Máx. membros"
              name="maxMembers"
              value={form.maxMembers}
              onChange={(e) => setForm((f) => ({ ...f, maxMembers: e.target.value }))}
            />
            <Field
              label="Tolerância (dias)"
              name="gracePeriodDays"
              value={form.gracePeriodDays}
              onChange={(e) => setForm((f) => ({ ...f, gracePeriodDays: e.target.value }))}
            />
            <Field
              label="Preço mensal ref. (R$)"
              name="priceCentsMonthly"
              value={form.priceCentsMonthly}
              onChange={(e) => setForm((f) => ({ ...f, priceCentsMonthly: e.target.value }))}
            />
            <Field
              label="Descrição"
              name="description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <Button type="button" disabled={pending} onClick={createPlan}>
            Cadastrar plano
          </Button>
        </section>
      </div>
    </AdminChrome>
  );
}
