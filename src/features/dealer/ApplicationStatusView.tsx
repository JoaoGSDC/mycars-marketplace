import Link from 'next/link';

import { Badge, Button } from '@components/ui';
import {
  STORE_STATUS,
  STORE_STATUS_LABELS,
  type StoreStatus,
} from '@app-types/status';
import {
  SUBSCRIPTION_STATUS_LABELS,
  type SubscriptionStatus,
} from '@app-types/subscription';
import type { StoreRow } from '@lib/db';
import { formatCnpj } from '@utils/cnpj';

import styles from './onboarding-panel.module.css';

export type ApplicationStatusViewProps = {
  store: StoreRow | null;
};

function statusBadgeVariant(status: string): 'soft' | 'offer' | 'neutral' {
  if (status === STORE_STATUS.ACTIVE) return 'offer';
  if (status === STORE_STATUS.REJECTED || status === STORE_STATUS.SUSPENDED) return 'neutral';
  return 'soft';
}

export function ApplicationStatusView({ store }: ApplicationStatusViewProps) {
  if (!store) {
    return (
      <div className={styles.panel}>
        <h2 className={styles.panel__title}>Nenhuma solicitação encontrada</h2>
        <p className={styles.panel__text}>
          Envie o cadastro da sua empresa para iniciar a análise comercial.
        </p>
        <Button asChild>
          <Link href="/para-lojistas/cadastro">Solicitar cadastro</Link>
        </Button>
      </div>
    );
  }

  const status = store.status as StoreStatus;
  const subscription = (store.subscriptionStatus ?? 'none') as SubscriptionStatus;

  return (
    <div className={styles.panel}>
      <div className={styles.panel__header}>
        <div>
          <h2 className={styles.panel__title}>{store.publicName}</h2>
          <p className={styles.panel__text}>
            Situação cadastral{' '}
            <Badge variant={statusBadgeVariant(status)}>
              {STORE_STATUS_LABELS[status] ?? status}
            </Badge>
          </p>
        </div>
      </div>

      <dl className={styles.panel__grid}>
        <div>
          <dt>CNPJ</dt>
          <dd>{store.document ? formatCnpj(store.document) : '—'}</dd>
        </div>
        <div>
          <dt>Cidade</dt>
          <dd>
            {store.city}/{store.state}
          </dd>
        </div>
        <div>
          <dt>Subdomínio</dt>
          <dd>{store.subdomain ?? '—'}</dd>
        </div>
        <div>
          <dt>Assinatura</dt>
          <dd>{SUBSCRIPTION_STATUS_LABELS[subscription]}</dd>
        </div>
      </dl>

      {status === STORE_STATUS.PENDING ? (
        <p className={styles.panel__notice}>
          Sua solicitação está em análise. Lojas pendentes não publicam anúncios.
        </p>
      ) : null}

      {status === STORE_STATUS.REJECTED ? (
        <div className={styles.panel__alert}>
          <p className={styles.panel__alertTitle}>Solicitação rejeitada</p>
          <p>{store.rejectionReason ?? 'Sem motivo informado.'}</p>
          <Button variant="outline" asChild className="mt-3">
            <Link href="/para-lojistas/cadastro">Enviar nova solicitação</Link>
          </Button>
        </div>
      ) : null}

      {status === STORE_STATUS.ACTIVE ? (
        <div className={styles.panel__success}>
          <p>
            Cadastro aprovado. A assinatura permanece independente — configure a vitrine para
            operar.
          </p>
          <Button asChild className="mt-3">
            <Link href="/painel/vitrine">Configurar vitrine</Link>
          </Button>
        </div>
      ) : null}

      {status === STORE_STATUS.SUSPENDED ? (
        <div className={styles.panel__alert}>
          <p className={styles.panel__alertTitle}>Loja suspensa</p>
          <p>
            Os dados foram preservados. Motivo: {store.rejectionReason ?? 'contato com o suporte.'}
          </p>
        </div>
      ) : null}
    </div>
  );
}
