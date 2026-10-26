'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import type { StoreIntegrityPolicyDto } from '@app-types/integrity';
import { RETENTION_POLICY_DAYS } from '@app-types/privacy';
import { Button, Field, Heading, useToast } from '@components/ui';
import {
  requestPrivacyDeletionAction,
  requestPrivacyExportAction,
  updateIntegrityPolicyAction,
} from '@server/integrity/integrity-actions';

import styles from './integrity.module.css';

export type PrivacyRequestListItem = {
  id: string;
  type: string;
  status: string;
  processedAt: string | null;
  hasResultPayload?: boolean;
};

export type IntegritySettingsViewProps = {
  storeId: string;
  policy: StoreIntegrityPolicyDto;
  privacyRequests: PrivacyRequestListItem[];
  canWrite: boolean;
};

export function IntegritySettingsView({
  storeId,
  policy,
  privacyRequests,
  canWrite,
}: IntegritySettingsViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [intervalDays, setIntervalDays] = useState(String(policy.confirmationIntervalDays));
  const [graceDays, setGraceDays] = useState(String(policy.graceDays));
  const [autoPause, setAutoPause] = useState(policy.autoPausePublished);
  const [enabled, setEnabled] = useState(policy.enabled);

  async function onSavePolicy(event: FormEvent) {
    event.preventDefault();

    if (!canWrite) {
      return;
    }

    setPending(true);
    const result = await updateIntegrityPolicyAction({
      storeId,
      confirmationIntervalDays: Number(intervalDays),
      graceDays: Number(graceDays),
      autoPausePublished: autoPause,
      enabled,
    });
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Não foi possível salvar', description: result.message, variant: 'error' });
      return;
    }

    toast({ title: 'Política atualizada', variant: 'success' });
    router.refresh();
  }

  async function onExport() {
    setPending(true);
    const result = await requestPrivacyExportAction({ storeId });
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Exportação falhou', description: result.message, variant: 'error' });
      return;
    }

    toast({ title: 'Exportação concluída', description: `Solicitação ${result.data.id}`, variant: 'success' });
    router.refresh();
  }

  async function onDeletion() {
    const confirmed = window.confirm(
      'Solicitar exclusão/anonimização? Dados comerciais sob retenção serão preservados.'
    );

    if (!confirmed) {
      return;
    }

    setPending(true);
    const result = await requestPrivacyDeletionAction({
      storeId,
      reason: 'Solicitação do lojista via painel',
    });
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Solicitação rejeitada', description: result.message, variant: 'error' });
      return;
    }

    toast({
      title: 'Exclusão sob retenção',
      description: result.data.retentionHoldUntil
        ? `Hold até ${new Date(result.data.retentionHoldUntil).toLocaleDateString('pt-BR')}`
        : undefined,
      variant: 'success',
    });
    router.refresh();
  }

  return (
    <div className={styles.integrity}>
      <header className={styles.integrity__header}>
        <div>
          <Heading as="h1">Configurações</Heading>
          <p className={styles.integrity__subtitle}>
            Integridade comercial, confirmação de estoque e privacidade da loja.
          </p>
        </div>
      </header>

      <section className={styles.integrity__section}>
        <h2 className={styles.integrity__sectionTitle}>Confirmação de disponibilidade</h2>
        <p className={styles.integrity__subtitle}>
          Ausência de confirmação pausa o anúncio (quando configurado), nunca marca o veículo como
          vendido. Reserva, venda e suspensão administrativa têm prioridade.
        </p>
        <form className={styles.integrity__form} onSubmit={onSavePolicy}>
          <Field
            label="Prazo (dias)"
            type="number"
            name="confirmationIntervalDays"
            min={1}
            max={180}
            value={intervalDays}
            disabled={!canWrite || pending}
            onChange={(event) => setIntervalDays(event.target.value)}
          />
          <Field
            label="Tolerância (dias)"
            type="number"
            name="graceDays"
            min={0}
            max={30}
            value={graceDays}
            disabled={!canWrite || pending}
            onChange={(event) => setGraceDays(event.target.value)}
          />
          <label className={styles.integrity__check}>
            <input
              type="checkbox"
              checked={autoPause}
              disabled={!canWrite || pending}
              onChange={(event) => setAutoPause(event.target.checked)}
            />
            Pausar anúncios publicados após expiração + tolerância
          </label>
          <label className={styles.integrity__check}>
            <input
              type="checkbox"
              checked={enabled}
              disabled={!canWrite || pending}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            Política habilitada
          </label>
          {canWrite ? (
            <Button type="submit" disabled={pending}>
              Salvar política
            </Button>
          ) : null}
        </form>
      </section>

      <section className={styles.integrity__section}>
        <h2 className={styles.integrity__sectionTitle}>Privacidade e retenção</h2>
        <p className={styles.integrity__subtitle}>
          Retenção: clientes ociosos {RETENTION_POLICY_DAYS.CUSTOMER_IDLE} dias · auditoria/vendas{' '}
          {RETENTION_POLICY_DAYS.SALES} dias · confirmações{' '}
          {RETENTION_POLICY_DAYS.AVAILABILITY_CONFIRMATIONS} dias. Exportação sem senhas ou tokens.
        </p>
        {canWrite ? (
          <div className={styles.integrity__actions}>
            <Button type="button" variant="outline" disabled={pending} onClick={onExport}>
              Exportar dados da loja
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={onDeletion}>
              Solicitar exclusão / anonimização
            </Button>
          </div>
        ) : null}

        {privacyRequests.length > 0 ? (
          <ul className={styles.integrity__requestList}>
            {privacyRequests.map((row) => (
              <li key={row.id}>
                <strong>{row.type}</strong> · {row.status}
                {row.processedAt
                  ? ` · ${new Date(row.processedAt).toLocaleString('pt-BR')}`
                  : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.integrity__subtitle}>Nenhuma solicitação registrada.</p>
        )}
      </section>
    </div>
  );
}
