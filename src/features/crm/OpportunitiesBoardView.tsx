'use client';

import { Pencil } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import {
  OPPORTUNITY_ORIGIN_LABELS,
  OPPORTUNITY_ORIGINS,
  type OpportunityOrigin,
} from '@app-types/crm';
import type {
  CrmAssigneeOption,
  OpportunityFunnelCounts,
  OpportunityListItemDto,
} from '@app-types/crm-dto';
import {
  OPPORTUNITY_PIPELINE_STAGES,
  OPPORTUNITY_STATUS,
  OPPORTUNITY_STATUS_LABELS,
  type OpportunityStatus,
} from '@app-types/status';
import {
  AdminDataTable,
  AdminFilterBar,
  AdminPageHeader,
  AdminStatChips,
  adminTableStyles,
} from '@components/dashboard';
import { StatusBadge } from '@components/marketplace';
import {
  Button,
  EmptyState,
  Field,
  Pagination,
  Select,
  SelectItem,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@components/ui';

import { formatDateTime, formatPhoneDisplay, isOverdue } from './crm.format';
import styles from './crm.module.css';

export type OpportunitiesBoardViewProps = {
  items: OpportunityListItemDto[];
  kanbanColumns: Record<string, OpportunityListItemDto[]>;
  funnel: OpportunityFunnelCounts;
  assignees: CrmAssigneeOption[];
  total: number;
  page: number;
  totalPages: number;
  canWrite: boolean;
  overdueCount: number;
  filters: {
    stage?: string;
    origin?: string;
    assigneeUserId?: string;
    q?: string;
    view?: string;
  };
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

function OpportunityCard({ item }: { item: OpportunityListItemDto }) {
  const overdue = isOverdue(item.nextActionAt);

  return (
    <Link href={`/painel/oportunidades/${item.id}`} className={styles.crm__kanbanCard}>
      <div className={styles.crm__kanbanCardTitle}>{item.customerName}</div>
      <div className={styles.crm__meta}>{formatPhoneDisplay(item.customerPhone)}</div>
      {item.vehicleLabel ? <div className={styles.crm__meta}>{item.vehicleLabel}</div> : null}
      <div className={styles.crm__meta}>
        {item.assigneeName ?? 'Sem responsável'}
        {item.nextActionAt
          ? ` · ${overdue ? 'Atrasado' : 'Próximo'}: ${formatDateTime(item.nextActionAt)}`
          : ''}
      </div>
      {overdue ? <span className={styles.crm__overdue}>Pendência atrasada</span> : null}
    </Link>
  );
}

export function OpportunitiesBoardView({
  items,
  kanbanColumns,
  funnel,
  assignees,
  total,
  page,
  totalPages,
  canWrite,
  overdueCount,
  filters,
}: OpportunitiesBoardViewProps) {
  const router = useRouter();
  const view = filters.view === 'kanban' ? 'kanban' : 'list';
  const [q, setQ] = useState(filters.q ?? '');
  const [stage, setStage] = useState(filters.stage ?? 'all');
  const [origin, setOrigin] = useState(filters.origin ?? 'all');
  const [assigneeUserId, setAssigneeUserId] = useState(filters.assigneeUserId ?? 'all');

  function applyFilters(extra: Record<string, string | undefined> = {}) {
    router.push(
      '/painel/oportunidades' +
        buildQuery({
          q: q || undefined,
          stage: stage !== 'all' ? stage : undefined,
          origin: origin !== 'all' ? origin : undefined,
          assigneeUserId: assigneeUserId !== 'all' ? assigneeUserId : undefined,
          view,
          page: '1',
          ...extra,
        })
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    applyFilters();
  }

  function setView(next: 'list' | 'kanban') {
    applyFilters({ view: next, page: '1' });
  }

  const stageFilters: Array<OpportunityStatus | 'all'> = [
    'all',
    ...OPPORTUNITY_PIPELINE_STAGES,
    OPPORTUNITY_STATUS.DISMISSED,
  ];

  const chips = stageFilters.map((key) => {
    const count =
      key === 'all'
        ? Object.values(funnel).reduce((sum, value) => sum + (value ?? 0), 0)
        : (funnel[key] ?? 0);
    const active = (filters.stage ?? 'all') === key;

    return {
      id: key,
      label: key === 'all' ? 'Todas' : OPPORTUNITY_STATUS_LABELS[key],
      count,
      active,
      onClick: () => {
        setStage(key);
        applyFilters({ stage: key === 'all' ? undefined : key, page: '1' });
      },
    };
  });

  return (
    <div className={styles.crm}>
      <AdminPageHeader
        title="Oportunidades"
        description={
          <>
            Funil comercial · {total} registro{total === 1 ? '' : 's'}
            {overdueCount > 0 ? ` · ${overdueCount} retorno(s) atrasado(s)` : ''}
          </>
        }
        primaryAction={
          canWrite ? (
            <Button asChild>
              <Link href="/painel/oportunidades/nova">Formulário rápido</Link>
            </Button>
          ) : undefined
        }
      />

      <AdminStatChips items={chips} aria-label="Filtrar por etapa" />

      <AdminFilterBar
        onSubmit={onSubmit}
        actions={<Button type="submit">Filtrar</Button>}
      >
        <Field
          label="Pesquisar"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cliente ou telefone"
        />
        <Select label="Origem" value={origin} onValueChange={setOrigin}>
          <SelectItem value="all">Todas</SelectItem>
          {Object.values(OPPORTUNITY_ORIGINS).map((value) => (
            <SelectItem key={value} value={value}>
              {OPPORTUNITY_ORIGIN_LABELS[value]}
            </SelectItem>
          ))}
        </Select>
        <Select label="Responsável" value={assigneeUserId} onValueChange={setAssigneeUserId}>
          <SelectItem value="all">Todos</SelectItem>
          {assignees.map((member) => (
            <SelectItem key={member.userId} value={member.userId}>
              {member.name}
            </SelectItem>
          ))}
        </Select>
      </AdminFilterBar>

      <Tabs value={view} onValueChange={(value) => setView(value as 'list' | 'kanban')}>
        <TabsList variant="underline">
          <TabsTrigger variant="underline" value="list">
            Lista
          </TabsTrigger>
          <TabsTrigger variant="underline" value="kanban">
            Kanban
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <AdminDataTable
            head={
              <tr>
                <th>Cliente</th>
                <th>Veículo</th>
                <th>Etapa</th>
                <th>Origem</th>
                <th>Responsável</th>
                <th>Próxima ação</th>
                {canWrite ? <th className="w-[1%] whitespace-nowrap">Ações</th> : null}
              </tr>
            }
            empty={
              <EmptyState
                title="Nenhuma oportunidade"
                description="Receba interesses pelo formulário público ou cadastre manualmente."
              />
            }
            footer={
              <>
                <span className={adminTableStyles.meta}>
                  Página {page} de {totalPages}
                </span>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  getHref={(p) =>
                    '/painel/oportunidades' +
                    buildQuery({
                      q: filters.q,
                      stage: filters.stage,
                      origin: filters.origin,
                      assigneeUserId: filters.assigneeUserId,
                      view: 'list',
                      page: String(p),
                    })
                  }
                />
              </>
            }
          >
            {items.length === 0
              ? null
              : items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link
                        className={adminTableStyles.rowLink}
                        href={`/painel/oportunidades/${item.id}`}
                      >
                        {item.customerName}
                      </Link>
                      <div className={adminTableStyles.rowMeta}>
                        {formatPhoneDisplay(item.customerPhone)}
                      </div>
                    </td>
                    <td>
                      <span className={adminTableStyles.meta}>
                        {item.vehicleLabel ?? '—'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge
                        kind="opportunity"
                        status={item.stage as OpportunityStatus}
                      />
                    </td>
                    <td>
                      <span className={adminTableStyles.meta}>
                        {OPPORTUNITY_ORIGIN_LABELS[item.origin as OpportunityOrigin] ??
                          item.origin}
                      </span>
                    </td>
                    <td>
                      <span className={adminTableStyles.meta}>
                        {item.assigneeName ?? '—'}
                      </span>
                    </td>
                    <td>
                      {item.nextActionAt ? (
                        <span
                          className={
                            isOverdue(item.nextActionAt)
                              ? styles.crm__overdue
                              : adminTableStyles.meta
                          }
                        >
                          {item.nextActionLabel ? `${item.nextActionLabel} · ` : ''}
                          {formatDateTime(item.nextActionAt)}
                        </span>
                      ) : (
                        <span className={adminTableStyles.meta}>—</span>
                      )}
                    </td>
                    {canWrite ? (
                      <td>
                        <div className={adminTableStyles.rowActions}>
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/painel/oportunidades/${item.id}`}>
                              <Pencil className="size-3.5" aria-hidden />
                              Editar
                            </Link>
                          </Button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
          </AdminDataTable>
        </TabsContent>

        <TabsContent value="kanban">
          <div className={styles.crm__kanban}>
            {OPPORTUNITY_PIPELINE_STAGES.map((columnStage) => {
              const columnItems = kanbanColumns[columnStage] ?? [];

              return (
                <section key={columnStage} className={styles.crm__kanbanColumn}>
                  <div className={styles.crm__kanbanTitle}>
                    <span>{OPPORTUNITY_STATUS_LABELS[columnStage]}</span>
                    <span className={styles.crm__kanbanCount}>{columnItems.length}</span>
                  </div>
                  {columnItems.length === 0 ? (
                    <p className={styles.crm__meta}>Vazio</p>
                  ) : (
                    columnItems.map((item) => <OpportunityCard key={item.id} item={item} />)
                  )}
                </section>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
