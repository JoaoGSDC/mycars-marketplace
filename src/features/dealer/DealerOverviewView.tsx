import Link from 'next/link';

import { Badge, Button } from '@components/ui';
import { STORE_STATUS, STORE_STATUS_LABELS, type StoreStatus } from '@app-types/status';
import {
  SUBSCRIPTION_STATUS_LABELS,
  type SubscriptionStatus,
} from '@app-types/subscription';
import type { StoreRow } from '@lib/db';

import { DealerModulePlaceholder } from './DealerModulePlaceholder';
import styles from './module.module.css';

export type DealerOverviewViewProps = {
  store: StoreRow;
};

export function DealerOverviewView({ store }: DealerOverviewViewProps) {
  const status = store.status as StoreStatus;
  const subscription = (store.subscriptionStatus ?? 'none') as SubscriptionStatus;

  return (
    <div className={styles.module}>
      <header className={styles.module__header}>
        <h2 className={styles.module__title}>{store.publicName}</h2>
        <p className={styles.module__description}>
          Situação cadastral{' '}
          <Badge variant="soft">{STORE_STATUS_LABELS[status] ?? status}</Badge>
          {' · '}
          Assinatura{' '}
          <Badge variant="neutral">{SUBSCRIPTION_STATUS_LABELS[subscription]}</Badge>
        </p>
      </header>

      {status === STORE_STATUS.PENDING ? (
        <DealerModulePlaceholder
          title="Cadastro em análise"
          description="Enquanto a solicitação não for aprovada, os módulos operacionais ficam limitados. Acompanhe o status ou complete dados pendentes."
          action={
            <Button variant="outline" asChild>
              <Link href="/painel/solicitacao">Ver solicitação</Link>
            </Button>
          }
        />
      ) : null}

      {status === STORE_STATUS.ACTIVE ? (
        <DealerModulePlaceholder
          title="Painel pronto para os próximos módulos"
          description="Estoque, anúncios, clientes e vendas entrarão aqui sem inventar métricas. Use a navegação lateral para abrir cada área — placeholders até a implementação do domínio."
          action={
            <Button asChild>
              <Link href="/painel/vitrine">Configurar vitrine</Link>
            </Button>
          }
        />
      ) : null}

      {status === STORE_STATUS.REJECTED || status === STORE_STATUS.SUSPENDED ? (
        <DealerModulePlaceholder
          title={status === STORE_STATUS.REJECTED ? 'Solicitação rejeitada' : 'Loja suspensa'}
          description={
            store.rejectionReason ??
            'Os dados foram preservados. Consulte a solicitação ou o suporte da plataforma.'
          }
          action={
            <Button variant="outline" asChild>
              <Link href="/painel/solicitacao">Detalhes</Link>
            </Button>
          }
        />
      ) : null}
    </div>
  );
}
