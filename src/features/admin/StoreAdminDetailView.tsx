'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge, Button, Field, Select, SelectItem, useToast } from '@components/ui';
import { STORE_STATUS, STORE_STATUS_LABELS, type StoreStatus } from '@app-types/status';
import { SUBSCRIPTION_STATUS, SUBSCRIPTION_STATUS_LABELS } from '@app-types/subscription';
import type { AuditEventRow, PlanRow, StoreRow, StoreSubscriptionRow } from '@lib/db';
import type { StorePlanAccess } from '@server/admin/plan-limits';
import {
  adminAssignSubscriptionAction,
  adminReactivateStoreAction,
  adminSuspendStoreAction,
  adminUpdateSubscriptionAction,
} from '@server/admin/admin-actions';
import { formatCnpj } from '@utils/cnpj';

import { AdminChrome } from './AdminChrome';
import styles from './admin.module.css';

export type StoreAdminDetailViewProps = {
  userName: string;
  store: StoreRow;
  planAccess: StorePlanAccess;
  subscriptions: StoreSubscriptionRow[];
  plans: PlanRow[];
  audit: AuditEventRow[];
};

export function StoreAdminDetailView({
  userName,
  store,
  planAccess,
  subscriptions,
  plans,
  audit,
}: StoreAdminDetailViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [planId, setPlanId] = useState(plans[0]?.id ?? '');
  const [subStatus, setSubStatus] = useState<string>(SUBSCRIPTION_STATUS.TRIAL);
  const [pending, setPending] = useState(false);

  async function suspend() {
    setPending(true);
    const result = await adminSuspendStoreAction({ storeId: store.id, reason });
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Falha', description: result.message, variant: 'error' });
      return;
    }

    toast({ title: 'Loja suspensa', variant: 'success' });
    router.refresh();
  }

  async function reactivate() {
    setPending(true);
    const result = await adminReactivateStoreAction({ storeId: store.id, reason });
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Falha', description: result.message, variant: 'error' });
      return;
    }

    toast({ title: 'Loja reativada', variant: 'success' });
    router.refresh();
  }

  async function assignPlan() {
    setPending(true);
    const result = await adminAssignSubscriptionAction({
      storeId: store.id,
      planId,
      status: subStatus as 'trial' | 'active' | 'past_due' | 'canceled',
      notes: 'Ativação manual piloto',
    });
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Falha', description: result.message, variant: 'error' });
      return;
    }

    toast({ title: 'Assinatura vinculada', variant: 'success' });
    router.refresh();
  }

  async function markPastDue(subscriptionId: string) {
    setPending(true);
    const result = await adminUpdateSubscriptionAction({
      subscriptionId,
      status: SUBSCRIPTION_STATUS.PAST_DUE,
      reason: reason || 'Marcado past_due no painel admin',
    });
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Falha', description: result.message, variant: 'error' });
      return;
    }

    toast({ title: 'Status atualizado', variant: 'success' });
    router.refresh();
  }

  return (
    <AdminChrome userName={userName} title={store.publicName}>
      <div className={styles.admin}>
        <header className={styles.admin__header}>
          <div>
            <h1 className={styles.admin__title}>{store.publicName}</h1>
            <p className={styles.admin__subtitle}>
              {store.tradeName} · {store.document ? formatCnpj(store.document) : '—'} ·{' '}
              {store.city}/{store.state}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="soft">
                {STORE_STATUS_LABELS[store.status as StoreStatus] ?? store.status}
              </Badge>
              <Badge variant="neutral">
                {SUBSCRIPTION_STATUS_LABELS[
                  (store.subscriptionStatus ?? 'none') as keyof typeof SUBSCRIPTION_STATUS_LABELS
                ]}
              </Badge>
            </div>
          </div>
          <Button asChild variant="ghost">
            <Link href="/admin/lojas">Voltar</Link>
          </Button>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className={styles.admin__panel}>
            <h2 className="text-sm font-semibold">Cadastro</h2>
            <p className={styles.admin__meta}>
              Responsável: {store.responsibleName} · {store.responsibleEmail}
            </p>
            <p className={styles.admin__meta}>
              Subdomínio: {store.subdomain ?? '—'} · Slug: {store.slug}
            </p>
            <p className={styles.admin__meta}>{store.institutionalInfo}</p>
            {store.rejectionReason ? (
              <p className={styles.admin__hint}>Motivo registrado: {store.rejectionReason}</p>
            ) : null}
          </section>

          <section className={styles.admin__panel}>
            <h2 className="text-sm font-semibold">Situação comercial / plano</h2>
            <p className={styles.admin__meta}>
              {planAccess.hasBoundPlan
                ? `${planAccess.planName} (${planAccess.planCode}) · ${planAccess.status}`
                : 'Sem plano vinculado — limites não aplicados (piloto)'}
            </p>
            <p className={styles.admin__meta}>
              Publicados: {planAccess.publishedCount}
              {planAccess.maxPublishedListings !== null
                ? ` / ${planAccess.maxPublishedListings}`
                : ''}
              {planAccess.withinGrace ? ' · em tolerância' : ''}
            </p>
            <p className={styles.admin__hint}>
              Pode publicar: {planAccess.canPublish ? 'sim' : `não (${planAccess.reason})`}
            </p>
          </section>
        </div>

        <section className={styles.admin__panel}>
          <h2 className="text-sm font-semibold">Ações administrativas</h2>
          <Field
            label="Justificativa"
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Obrigatória para suspender/reativar"
          />
          <div className={styles.admin__actions}>
            {store.status === STORE_STATUS.ACTIVE || store.status === STORE_STATUS.PENDING ? (
              <Button type="button" variant="outline" disabled={pending} onClick={suspend}>
                Suspender
              </Button>
            ) : null}
            {store.status === STORE_STATUS.SUSPENDED ? (
              <Button type="button" disabled={pending} onClick={reactivate}>
                Reativar
              </Button>
            ) : null}
          </div>
        </section>

        <section className={styles.admin__panel}>
          <h2 className="text-sm font-semibold">Vincular plano (ativação manual)</h2>
          <div className={styles.admin__filters}>
            <Select label="Plano" value={planId} onValueChange={setPlanId}>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name} · até {plan.maxPublishedListings} anúncios
                </SelectItem>
              ))}
            </Select>
            <Select label="Status" value={subStatus} onValueChange={setSubStatus}>
              <SelectItem value={SUBSCRIPTION_STATUS.TRIAL}>Trial</SelectItem>
              <SelectItem value={SUBSCRIPTION_STATUS.ACTIVE}>Ativa</SelectItem>
              <SelectItem value={SUBSCRIPTION_STATUS.PAST_DUE}>Past due</SelectItem>
            </Select>
            <Button type="button" disabled={pending || !planId} onClick={assignPlan}>
              Vincular
            </Button>
          </div>
          <p className={styles.admin__hint}>
            Sem gateway nesta fase. Toda ativação gera auditoria.
          </p>
          {subscriptions[0] ? (
            <div className={styles.admin__actions}>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => markPastDue(subscriptions[0]!.id)}
              >
                Marcar assinatura vigente como past_due
              </Button>
            </div>
          ) : null}
        </section>

        <section className={styles.admin__panel}>
          <h2 className="text-sm font-semibold">Auditoria recente da loja</h2>
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
