'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import type { CrmAssigneeOption } from '@app-types/crm-dto';
import { OPPORTUNITY_ORIGIN_LABELS, type OpportunityOrigin } from '@app-types/crm';
import {
  DASHBOARD_PERIOD_PRESET_LABELS,
  DASHBOARD_PERIOD_PRESETS,
  type DashboardPeriodPreset,
  type DashboardSnapshot,
} from '@app-types/dashboard';
import {
  AdminFilterBar,
  AdminPageHeader,
  AdminSection,
} from '@components/dashboard';
import { StatCard } from '@components/marketplace';
import {
  Button,
  EmptyState,
  Field,
  Select,
  SelectItem,
} from '@components/ui';

import {
  formatCents,
  formatDayLabel,
  formatDays,
  formatNumber,
  formatPercent,
} from './dashboard.format';
import styles from './dashboard.module.css';
import { MetricBarList } from './MetricBarList';

export type DealerDashboardViewProps = {
  storeName: string;
  snapshot: DashboardSnapshot;
  sellers: CrmAssigneeOption[];
  errorMessage?: string;
};

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && value !== 'all') {
      search.set(key, value);
    }
  }

  const qs = search.toString();

  return qs ? `?${qs}` : '';
}

function OperationalStat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number;
  hint?: string;
  href: string;
}) {
  return (
    <article className={styles.dashboard__stat}>
      <p className={styles.dashboard__statLabel}>{label}</p>
      <p className={styles.dashboard__statValue}>{formatNumber(value)}</p>
      {hint ? <p className={styles.dashboard__statHint}>{hint}</p> : null}
      <Link className={styles.dashboard__statLink} href={href}>
        Ver detalhes
      </Link>
    </article>
  );
}

export function DealerDashboardView({
  storeName,
  snapshot,
  sellers,
  errorMessage,
}: DealerDashboardViewProps) {
  const router = useRouter();
  const [preset, setPreset] = useState<DashboardPeriodPreset>(snapshot.period.preset);
  const [from, setFrom] = useState(snapshot.period.from.slice(0, 10));
  const [to, setTo] = useState(snapshot.period.to.slice(0, 10));
  const [sellerUserId, setSellerUserId] = useState(snapshot.sellerUserId ?? 'all');

  const { operational, commercial, capabilities } = snapshot;
  const hasCommercialMovement =
    commercial.salesCount > 0 || commercial.leadsReceived > 0;
  const maxSeries = Math.max(1, ...commercial.salesSeries.map((point) => point.salesCount));

  function applyFilters(event?: FormEvent) {
    event?.preventDefault();
    router.push(
      '/painel' +
        buildQuery({
          preset,
          from: preset === DASHBOARD_PERIOD_PRESETS.CUSTOM ? `${from}T00:00:00.000Z` : undefined,
          to: preset === DASHBOARD_PERIOD_PRESETS.CUSTOM ? `${to}T23:59:59.999Z` : undefined,
          sellerUserId: sellerUserId !== 'all' ? sellerUserId : undefined,
        })
    );
  }

  if (errorMessage) {
    return (
      <EmptyState
        title="Não foi possível carregar o dashboard"
        description={errorMessage}
        action={
          <Button type="button" onClick={() => router.refresh()}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  return (
    <div className={styles.dashboard}>
      <AdminPageHeader
        title={storeName}
        description="Visão operacional e desempenho comercial · dados reais da loja"
      />

      <AdminFilterBar
        onSubmit={applyFilters}
        actions={<Button type="submit">Aplicar</Button>}
      >
        <Select
          label="Período"
          value={preset}
          onValueChange={(value) => setPreset(value as DashboardPeriodPreset)}
        >
          {Object.values(DASHBOARD_PERIOD_PRESETS).map((value) => (
            <SelectItem key={value} value={value}>
              {DASHBOARD_PERIOD_PRESET_LABELS[value]}
            </SelectItem>
          ))}
        </Select>

        {preset === DASHBOARD_PERIOD_PRESETS.CUSTOM ? (
          <>
            <Field
              label="De"
              type="date"
              name="from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <Field
              label="Até"
              type="date"
              name="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </>
        ) : null}

        {capabilities.canFilterSeller ? (
          <Select label="Vendedor" value={sellerUserId} onValueChange={setSellerUserId}>
            <SelectItem value="all">Toda a equipe</SelectItem>
            {sellers.map((seller) => (
              <SelectItem key={seller.userId} value={seller.userId}>
                {seller.name}
              </SelectItem>
            ))}
          </Select>
        ) : null}
      </AdminFilterBar>

      <AdminSection
        title="Operacional"
        description="Situação atual do estoque, anúncios, CRM e reservas. Contagens exatas por status."
      >
        <div className={styles.dashboard__statGrid}>
          <OperationalStat
            label="Disponíveis"
            value={operational.availableVehicles}
            href="/painel/estoque?status=available"
          />
          <OperationalStat
            label="Em preparação"
            value={operational.preparingVehicles}
            href="/painel/estoque?status=preparing"
          />
          <OperationalStat
            label="Reservados"
            value={operational.reservedVehicles}
            href="/painel/estoque?status=reserved"
          />
          <OperationalStat
            label="Estoque sem publicação"
            value={operational.stockWithoutListing}
            hint="Sem publicação no marketplace/vitrine"
            href="/painel/estoque?publicacao=none"
          />
          <OperationalStat
            label="Publicações com pendências"
            value={operational.listingsWithIssues}
            hint="Rascunho, pausado ou suspenso"
            href="/painel/estoque?publicacao=issues"
          />
          <OperationalStat
            label="Aguardando atendimento"
            value={operational.customersAwaitingService}
            hint="Novos leads"
            href="/painel/oportunidades?stage=new_lead"
          />
          <OperationalStat
            label="Atividades vencidas"
            value={operational.overdueActivities}
            hint="Retornos com dueAt passado"
            href="/painel/oportunidades"
          />
          <OperationalStat
            label="Reservas a vencer"
            value={operational.reservationsNearExpiry}
            hint="Próximas 48h"
            href="/painel/reservas?status=active"
          />
          <OperationalStat
            label="Muito tempo em estoque"
            value={operational.longStockVehicles}
            hint="Mais de 60 dias desde a entrada"
            href="/painel/estoque"
          />
          <OperationalStat
            label="Confirmação vencida"
            value={operational.availabilityOverdue}
            hint="Revisar disponibilidade do estoque"
            href="/painel/estoque/confirmacao"
          />
        </div>
      </AdminSection>

      <AdminSection
        title="Comercial"
        description={`Vendas por soldAt · leads por enteredAt · ${new Date(snapshot.period.from).toLocaleDateString('pt-BR')} – ${new Date(snapshot.period.to).toLocaleDateString('pt-BR')}`}
      >

        {!hasCommercialMovement ? (
          <p className={styles.dashboard__empty}>
            Sem movimento comercial neste período. Ajuste o filtro ou registre leads e vendas.
          </p>
        ) : null}

        <div className={styles.dashboard__kpiGrid}>
          <StatCard
            label="Vendas concluídas"
            value={formatNumber(commercial.salesCount)}
            hint="Eixo: data da venda (soldAt)"
          />
          <StatCard
            label="Volume negociado"
            value={formatCents(commercial.negotiatedVolumeCents)}
            hint="Não representa pagamento recebido"
          />
          <StatCard
            label="Ticket médio"
            value={formatCents(commercial.averageTicketCents)}
            hint="Volume ÷ vendas concluídas"
          />
        </div>

        <div className={styles.dashboard__statGrid}>
          <article className={styles.dashboard__stat}>
            <p className={styles.dashboard__statLabel}>Leads recebidos</p>
            <p className={styles.dashboard__statValue}>
              {formatNumber(commercial.leadsReceived)}
            </p>
            <p className={styles.dashboard__statHint}>Eixo: criação do lead (enteredAt)</p>
          </article>
          <article className={styles.dashboard__stat}>
            <p className={styles.dashboard__statLabel}>Negociações em andamento</p>
            <p className={styles.dashboard__statValue}>
              {formatNumber(commercial.negotiationsInProgress)}
            </p>
            <p className={styles.dashboard__statHint}>Snapshot atual · etapa negociando</p>
          </article>
          <article className={styles.dashboard__stat}>
            <p className={styles.dashboard__statLabel}>Taxa de conversão</p>
            <p className={styles.dashboard__statValue}>
              {formatPercent(commercial.conversion.rate)}
            </p>
            <p className={styles.dashboard__statHint}>
              {formatNumber(commercial.conversion.numerator)} ganhos (closedAt) ÷{' '}
              {formatNumber(commercial.conversion.denominator)} leads (enteredAt)
            </p>
          </article>
          <article className={styles.dashboard__stat}>
            <p className={styles.dashboard__statLabel}>Tempo médio em estoque</p>
            <p className={styles.dashboard__statValue}>
              {formatDays(commercial.averageDaysInStock)}
            </p>
            <p className={styles.dashboard__statHint}>
              soldAt − entrada no estoque (vendas do período)
            </p>
          </article>
          {capabilities.canViewGrossResult ? (
            <article className={styles.dashboard__stat}>
              <p className={styles.dashboard__statLabel}>Resultado bruto estimado</p>
              <p className={styles.dashboard__statValue}>
                {formatCents(commercial.estimatedGrossResultCents)}
              </p>
              <p className={styles.dashboard__statHint}>
                Não é lucro líquido
                {commercial.incompleteGrossResultCount > 0
                  ? ` · ${commercial.incompleteGrossResultCount} venda(s) sem base confiável`
                  : ''}
              </p>
            </article>
          ) : (
            <article className={styles.dashboard__stat}>
              <p className={styles.dashboard__statLabel}>Resultado bruto estimado</p>
              <p className={styles.dashboard__statValue}>—</p>
              <p className={styles.dashboard__statHint}>Sem permissão para custos</p>
            </article>
          )}
        </div>

        {capabilities.canViewGrossResult && commercial.incompleteGrossResultCount > 0 ? (
          <p className={styles.dashboard__alert} role="status">
            Há vendas concluídas com custos incompletos ou consignados. Elas não entram na soma do
            resultado bruto para evitar margem enganosa.
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className={styles.dashboard__panel}>
            <h3 className={styles.dashboard__panelTitle}>Origem dos leads</h3>
            <MetricBarList
              ariaLabel="Origem dos leads no período"
              emptyLabel="Nenhum lead no período."
              items={commercial.leadOrigins
                .filter((item) => item.count > 0)
                .map((item) => ({
                  id: item.origin,
                  label:
                    OPPORTUNITY_ORIGIN_LABELS[item.origin as OpportunityOrigin] ?? item.origin,
                  value: item.count,
                }))}
            />
          </div>

          <div className={styles.dashboard__panel}>
            <h3 className={styles.dashboard__panelTitle}>Vendas por vendedor</h3>
            <MetricBarList
              ariaLabel="Vendas por vendedor no período"
              emptyLabel="Nenhuma venda concluída no período."
              items={commercial.salesBySeller.map((item) => ({
                id: item.sellerUserId,
                label: item.sellerName,
                value: item.volumeCents,
                displayValue: `${formatNumber(item.salesCount)} · ${formatCents(item.volumeCents)}`,
              }))}
            />
          </div>
        </div>

        <div className={styles.dashboard__panel}>
          <h3 className={styles.dashboard__panelTitle}>Vendas por dia (soldAt)</h3>
          {commercial.salesSeries.length === 0 ? (
            <p className={styles.dashboard__empty}>Sem vendas no período.</p>
          ) : (
            <div
              className={styles.dashboard__series}
              role="img"
              aria-label="Gráfico de vendas diárias no período"
            >
              {commercial.salesSeries.map((point) => {
                const height = Math.max(4, Math.round((point.salesCount / maxSeries) * 120));

                return (
                  <div key={point.day} className={styles.dashboard__seriesCol}>
                    <div
                      className={styles.dashboard__seriesBar}
                      style={{ height }}
                      title={`${formatDayLabel(point.day)}: ${point.salesCount} venda(s), ${formatCents(point.volumeCents)}`}
                    />
                    <span className={styles.dashboard__seriesLabel}>
                      {formatDayLabel(point.day)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AdminSection>

      <section className={styles.dashboard__defs}>
        <details>
          <summary>Definições dos indicadores</summary>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {Object.values(snapshot.definitions).map((def) => (
              <li key={def.id}>
                <strong>{def.label}</strong> ({def.dateAxis}): {def.description}
              </li>
            ))}
          </ul>
        </details>
      </section>
    </div>
  );
}
