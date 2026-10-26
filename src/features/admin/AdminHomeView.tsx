import Link from 'next/link';

import { StatCard } from '@components/marketplace';
import { Button, SectionHeader } from '@components/ui';
import type { PlatformMetricsSnapshot } from '@server/repositories/platform-metrics.repository';

import { AdminChrome } from './AdminChrome';
import styles from './admin.module.css';

export type AdminHomeViewProps = {
  userName: string;
  pendingCount: number;
  metrics: PlatformMetricsSnapshot;
  periodLabel: string;
};

export function AdminHomeView({
  userName,
  pendingCount,
  metrics,
  periodLabel,
}: AdminHomeViewProps) {
  return (
    <AdminChrome userName={userName} title="Administração">
      <div className={styles.admin}>
        <header className={styles.admin__header}>
          <div>
            <h1 className={styles.admin__title}>Painel da plataforma</h1>
            <p className={styles.admin__subtitle}>
              Operação piloto · indicadores reais · {periodLabel}
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/solicitacoes">
              Solicitações{pendingCount > 0 ? ` (${pendingCount})` : ''}
            </Link>
          </Button>
        </header>

        <SectionHeader
          eyebrow="Plataforma"
          title="Indicadores"
          description="Lojas, publicação e oportunidades. Sem números demonstrativos."
        />

        <div className={styles.admin__grid}>
          <StatCard label="Lojas cadastradas" value={metrics.storesRegistered} />
          <StatCard label="Lojas ativas" value={metrics.storesActive} />
          <StatCard
            label="Lojas pagantes / com plano"
            value={metrics.storesPaying}
            hint="Assinatura trial, active ou past_due"
          />
          <StatCard label="Anúncios publicados" value={metrics.vehiclesPublished} />
        </div>

        <div className={styles.admin__grid}>
          <article className={styles.admin__stat}>
            <p className={styles.admin__statLabel}>Pendentes de análise</p>
            <p className={styles.admin__statValue}>{metrics.storesPending}</p>
          </article>
          <article className={styles.admin__stat}>
            <p className={styles.admin__statLabel}>Suspensas</p>
            <p className={styles.admin__statValue}>{metrics.storesSuspended}</p>
          </article>
          <article className={styles.admin__stat}>
            <p className={styles.admin__statLabel}>Oportunidades (total)</p>
            <p className={styles.admin__statValue}>{metrics.opportunitiesGenerated}</p>
          </article>
          <article className={styles.admin__stat}>
            <p className={styles.admin__statLabel}>Utilização no período</p>
            <p className={styles.admin__statValue}>
              {metrics.opportunitiesInPeriod} leads · {metrics.listingsPublishedInPeriod} pubs ·{' '}
              {metrics.storesRegisteredInPeriod} lojas
            </p>
          </article>
        </div>

        <div className={styles.admin__actions}>
          <Button asChild variant="outline">
            <Link href="/admin/lojas">Lojas</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/anuncios">Anúncios</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/planos">Planos</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/auditoria">Auditoria</Link>
          </Button>
        </div>
      </div>
    </AdminChrome>
  );
}
