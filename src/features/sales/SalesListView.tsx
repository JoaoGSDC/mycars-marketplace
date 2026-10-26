'use client';

import { Pencil } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import type { CrmAssigneeOption } from '@app-types/crm-dto';
import type { SaleListItemDto } from '@app-types/sale';
import { SALE_STATUS, SALE_STATUS_LABELS, type SaleStatus } from '@app-types/status';
import {
  AdminDataTable,
  AdminFilterBar,
  AdminPageHeader,
  AdminSection,
  AdminStatChips,
  adminTableStyles,
} from '@components/dashboard';
import { Badge, Button, EmptyState, Field, Pagination, Select, SelectItem } from '@components/ui';

import { formatCents, formatDateTime } from './sales.format';
import styles from './sales.module.css';

export type SalesListViewProps = {
  items: SaleListItemDto[];
  total: number;
  page: number;
  totalPages: number;
  statusCounts: Record<string, number>;
  completedVolumeCents: number;
  sellers: CrmAssigneeOption[];
  canWrite: boolean;
  filters: {
    status?: string;
    sellerUserId?: string;
    q?: string;
    from?: string;
    to?: string;
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

export function SalesListView({
  items,
  total,
  page,
  totalPages,
  statusCounts,
  completedVolumeCents,
  sellers,
  canWrite,
  filters,
}: SalesListViewProps) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q ?? '');
  const [sellerUserId, setSellerUserId] = useState(filters.sellerUserId ?? 'all');
  const [from, setFrom] = useState(filters.from?.slice(0, 10) ?? '');
  const [to, setTo] = useState(filters.to?.slice(0, 10) ?? '');

  const statusFilters: Array<SaleStatus | 'all'> = [
    'all',
    SALE_STATUS.COMPLETED,
    SALE_STATUS.CANCELLED,
  ];

  function applyFilters(extra: Record<string, string | undefined> = {}) {
    router.push(
      '/painel/vendas' +
        buildQuery({
          q: q || undefined,
          status: filters.status,
          sellerUserId: sellerUserId !== 'all' ? sellerUserId : undefined,
          from: from ? `${from}T00:00:00.000Z` : undefined,
          to: to ? `${to}T23:59:59.999Z` : undefined,
          page: '1',
          ...extra,
        })
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    applyFilters();
  }

  const chips = statusFilters.map((key) => {
    const count =
      key === 'all'
        ? Object.values(statusCounts).reduce((sum, value) => sum + value, 0)
        : (statusCounts[key] ?? 0);
    const active = (filters.status ?? 'all') === key;

    return {
      id: key,
      label: key === 'all' ? 'Todas' : SALE_STATUS_LABELS[key],
      count,
      active,
      onClick: () => applyFilters({ status: key === 'all' ? undefined : key, page: '1' }),
    };
  });

  return (
    <div className={styles.sales}>
      <AdminPageHeader
        title="Vendas"
        description={`Registro comercial · ${total} venda${total === 1 ? '' : 's'}`}
        primaryAction={
          canWrite ? (
            <Button asChild>
              <Link href="/painel/vendas/nova">Registrar venda</Link>
            </Button>
          ) : undefined
        }
      />

      <div className={styles.sales__kpi}>
        <AdminSection title="Concluídas" titleAs="h2">
          <p className={styles.sales__kpiValue}>
            {statusCounts[SALE_STATUS.COMPLETED] ?? 0}
          </p>
        </AdminSection>
        <AdminSection title="Volume negociado (concluídas)" titleAs="h2">
          <p className={styles.sales__kpiValue}>{formatCents(completedVolumeCents)}</p>
          <p className={styles.sales__hint}>Não representa pagamento recebido</p>
        </AdminSection>
        <AdminSection title="Canceladas / estornadas" titleAs="h2">
          <p className={styles.sales__kpiValue}>
            {statusCounts[SALE_STATUS.CANCELLED] ?? 0}
          </p>
        </AdminSection>
      </div>

      <AdminStatChips items={chips} aria-label="Filtrar por situação" />

      <AdminFilterBar
        onSubmit={onSubmit}
        actions={<Button type="submit">Filtrar</Button>}
      >
        <Field
          label="Pesquisar"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cliente, telefone ou veículo"
        />
        <Select label="Vendedor" value={sellerUserId} onValueChange={setSellerUserId}>
          <SelectItem value="all">Todos</SelectItem>
          {sellers.map((seller) => (
            <SelectItem key={seller.userId} value={seller.userId}>
              {seller.name}
            </SelectItem>
          ))}
        </Select>
        <Field
          label="De"
          name="from"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Field
          label="Até"
          name="to"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </AdminFilterBar>

      <AdminDataTable
        head={
          <tr>
            <th>Veículo</th>
            <th>Cliente</th>
            <th>Valor</th>
            <th>Vendedor</th>
            <th>Data</th>
            <th>Situação</th>
            {canWrite ? <th className="w-[1%] whitespace-nowrap">Ações</th> : null}
          </tr>
        }
        empty={
          <EmptyState
            title="Nenhuma venda"
            description="Registre a conclusão comercial pelo estoque ou pela oportunidade."
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
                '/painel/vendas' +
                buildQuery({
                  q: filters.q,
                  status: filters.status,
                  sellerUserId: filters.sellerUserId,
                  from: filters.from,
                  to: filters.to,
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
                  <Link className={adminTableStyles.rowLink} href={`/painel/vendas/${item.id}`}>
                    {item.vehicleLabel}
                  </Link>
                </td>
                <td>
                  <div>{item.customerName}</div>
                  <div className={adminTableStyles.rowMeta}>{item.customerPhone}</div>
                </td>
                <td className="tabular-nums">{formatCents(item.negotiatedPriceCents)}</td>
                <td>
                  <span className={adminTableStyles.meta}>{item.sellerName}</span>
                </td>
                <td>
                  <span className={adminTableStyles.meta}>{formatDateTime(item.soldAt)}</span>
                </td>
                <td>
                  <Badge variant="soft">
                    {SALE_STATUS_LABELS[item.status as SaleStatus] ?? item.status}
                  </Badge>
                </td>
                {canWrite ? (
                  <td>
                    <div className={adminTableStyles.rowActions}>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/painel/vendas/${item.id}`}>
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
    </div>
  );
}
