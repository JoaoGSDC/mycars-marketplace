'use client';

import { Pencil } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import {
  VEHICLE_OWNERSHIP_LABELS,
  type VehicleStatusCounts,
} from '@app-types/inventory';
import { VEHICLE_OWNERSHIP } from '@app-types/membership';
import {
  VEHICLE_STATUS,
  VEHICLE_STATUS_LABELS,
  type ListingStatus,
  type VehicleStatus,
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
  BottomSheet,
  BottomSheetBody,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
  Button,
  EmptyState,
  Field,
  Pagination,
  Select,
  SelectItem,
  Skeleton,
} from '@components/ui';
import { fixtureCatalog } from '@fixtures';
import type { VehicleRow } from '@lib/db';

import { formatCents, formatDaysInStock } from './inventory.format';
import styles from './inventory.module.css';
import { InventoryStatusCell } from './InventoryStatusCell';

export type InventoryListingSummary = {
  id: string;
  status: string;
  availabilityHold: string;
};

export type InventoryListViewProps = {
  storeId: string;
  items: VehicleRow[];
  /** Listing por vehicleId (1:1). */
  listingsByVehicleId?: Record<string, InventoryListingSummary>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statusCounts: VehicleStatusCounts;
  canWrite: boolean;
  filters: {
    q?: string;
    status?: string;
    makeSlug?: string;
    modelSlug?: string;
    yearFrom?: string;
    yearTo?: string;
    ownership?: string;
    sort?: string;
    sortDir?: string;
    /** none | issues | published */
    publicacao?: string;
  };
};

const STATUS_FILTERS: Array<VehicleStatus | 'all'> = [
  'all',
  VEHICLE_STATUS.PREPARING,
  VEHICLE_STATUS.AVAILABLE,
  VEHICLE_STATUS.RESERVED,
  VEHICLE_STATUS.SOLD,
  VEHICLE_STATUS.WITHDRAWN,
];

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

export function InventoryListView({
  storeId,
  items,
  listingsByVehicleId = {},
  total,
  page,
  totalPages,
  statusCounts,
  canWrite,
  filters,
}: InventoryListViewProps) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q ?? '');
  const [makeSlug, setMakeSlug] = useState(filters.makeSlug ?? '');
  const [modelSlug, setModelSlug] = useState(filters.modelSlug ?? '');
  const [yearFrom, setYearFrom] = useState(filters.yearFrom ?? '');
  const [yearTo, setYearTo] = useState(filters.yearTo ?? '');
  const [ownership, setOwnership] = useState(filters.ownership ?? '');
  const [publicacao, setPublicacao] = useState(filters.publicacao ?? '');
  const [sort, setSort] = useState(filters.sort ?? 'entered_at');
  const [sortDir, setSortDir] = useState(filters.sortDir ?? 'desc');

  const models = fixtureCatalog.find((m) => m.slug === makeSlug)?.models ?? [];

  function applyFilters(extra: Record<string, string | undefined> = {}) {
    const href =
      '/painel/estoque' +
      buildQuery({
        q: q || undefined,
        status: filters.status,
        makeSlug: makeSlug || undefined,
        modelSlug: modelSlug || undefined,
        yearFrom: yearFrom || undefined,
        yearTo: yearTo || undefined,
        ownership: ownership || undefined,
        publicacao: publicacao || undefined,
        sort,
        sortDir,
        page: '1',
        ...extra,
      });

    router.push(href);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    applyFilters();
  }

  return (
    <div className={styles.inventory}>
      <AdminPageHeader
        title="Estoque"
        description={
          <>
            Veículos da loja — próprios e consignados. Publique quando quiser, na ficha do estoque.
            {' · '}
            <Link href="/painel/estoque/confirmacao" className="text-accent-strong hover:underline">
              Confirmação de disponibilidade
            </Link>
          </>
        }
        primaryAction={
          canWrite ? (
            <Button asChild>
              <Link href="/painel/estoque/novo">Cadastrar veículo</Link>
            </Button>
          ) : undefined
        }
      />

      <AdminStatChips
        aria-label="Contagem por situação"
        items={STATUS_FILTERS.map((status) => {
          const count =
            status === 'all' ? statusCounts.total : statusCounts[status as VehicleStatus];
          const active = status === 'all' ? !filters.status : filters.status === status;

          return {
            id: status,
            label: status === 'all' ? 'Todos' : VEHICLE_STATUS_LABELS[status],
            count,
            active,
            onClick: () =>
              applyFilters({
                status: status === 'all' ? undefined : status,
                page: '1',
              }),
          };
        })}
      />

      <AdminFilterBar
        onSubmit={onSubmit}
        actions={
          <>
            <Button type="submit" variant="primary">
              Filtrar
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/painel/estoque">Limpar</Link>
            </Button>
            <div className="md:hidden">
              <BottomSheet>
                <BottomSheetTrigger asChild>
                  <Button type="button" variant="outline">
                    Mais filtros
                  </Button>
                </BottomSheetTrigger>
                <BottomSheetContent height="half" snapPoints={['half', 'full']}>
                  <BottomSheetHeader>
                    <BottomSheetTitle>Filtros do estoque</BottomSheetTitle>
                  </BottomSheetHeader>
                  <BottomSheetBody className="flex flex-col gap-4">
                    <Select
                      label="Propriedade"
                      value={ownership || undefined}
                      onValueChange={setOwnership}
                      placeholder="Todas"
                    >
                      <SelectItem value={VEHICLE_OWNERSHIP.OWN}>
                        {VEHICLE_OWNERSHIP_LABELS.own}
                      </SelectItem>
                      <SelectItem value={VEHICLE_OWNERSHIP.CONSIGNED}>
                        {VEHICLE_OWNERSHIP_LABELS.consigned}
                      </SelectItem>
                    </Select>
                    <Field
                      label="Ano de"
                      name="yearFromMobile"
                      inputMode="numeric"
                      value={yearFrom}
                      onChange={(e) => setYearFrom(e.target.value)}
                    />
                    <Field
                      label="Ano até"
                      name="yearToMobile"
                      inputMode="numeric"
                      value={yearTo}
                      onChange={(e) => setYearTo(e.target.value)}
                    />
                    <Select
                      label="Publicação"
                      value={publicacao || undefined}
                      onValueChange={setPublicacao}
                      placeholder="Todas"
                    >
                      <SelectItem value="none">Sem publicação ativa</SelectItem>
                      <SelectItem value="issues">Com pendências</SelectItem>
                      <SelectItem value="published">Publicados</SelectItem>
                    </Select>
                    <Select label="Ordenar por" value={sort} onValueChange={setSort}>
                      <SelectItem value="entered_at">Entrada</SelectItem>
                      <SelectItem value="asking_price">Preço pretendido</SelectItem>
                      <SelectItem value="days_in_stock">Tempo em estoque</SelectItem>
                    </Select>
                    <Select label="Direção" value={sortDir} onValueChange={setSortDir}>
                      <SelectItem value="desc">Decrescente</SelectItem>
                      <SelectItem value="asc">Crescente</SelectItem>
                    </Select>
                  </BottomSheetBody>
                  <BottomSheetFooter>
                    <BottomSheetClose asChild>
                      <Button type="button" variant="outline">
                        Fechar
                      </Button>
                    </BottomSheetClose>
                    <BottomSheetClose asChild>
                      <Button type="button" onClick={() => applyFilters()}>
                        Aplicar
                      </Button>
                    </BottomSheetClose>
                  </BottomSheetFooter>
                </BottomSheetContent>
              </BottomSheet>
            </div>
          </>
        }
      >
        <Field
          label="Buscar"
          name="q"
          placeholder="Marca, modelo, placa ou código"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select
          label="Marca"
          value={makeSlug || undefined}
          onValueChange={(value) => {
            setMakeSlug(value);
            setModelSlug('');
          }}
          placeholder="Todas"
        >
          {fixtureCatalog.map((make) => (
            <SelectItem key={make.slug} value={make.slug}>
              {make.name}
            </SelectItem>
          ))}
        </Select>
        <Select
          label="Modelo"
          value={modelSlug || undefined}
          onValueChange={setModelSlug}
          placeholder="Todos"
          disabled={!makeSlug}
        >
          {models.map((model) => (
            <SelectItem key={model.slug} value={model.slug}>
              {model.name}
            </SelectItem>
          ))}
        </Select>
        <div className="hidden md:contents">
          <Select
            label="Propriedade"
            value={ownership || undefined}
            onValueChange={setOwnership}
            placeholder="Todas"
          >
            <SelectItem value={VEHICLE_OWNERSHIP.OWN}>{VEHICLE_OWNERSHIP_LABELS.own}</SelectItem>
            <SelectItem value={VEHICLE_OWNERSHIP.CONSIGNED}>
              {VEHICLE_OWNERSHIP_LABELS.consigned}
            </SelectItem>
          </Select>
          <Field
            label="Ano de"
            name="yearFrom"
            inputMode="numeric"
            value={yearFrom}
            onChange={(e) => setYearFrom(e.target.value)}
          />
          <Field
            label="Ano até"
            name="yearTo"
            inputMode="numeric"
            value={yearTo}
            onChange={(e) => setYearTo(e.target.value)}
          />
          <Select
            label="Publicação"
            value={publicacao || undefined}
            onValueChange={setPublicacao}
            placeholder="Todas"
          >
            <SelectItem value="none">Sem publicação ativa</SelectItem>
            <SelectItem value="issues">Com pendências</SelectItem>
            <SelectItem value="published">Publicados</SelectItem>
          </Select>
          <Select label="Ordenar por" value={sort} onValueChange={setSort}>
            <SelectItem value="entered_at">Entrada</SelectItem>
            <SelectItem value="asking_price">Preço pretendido</SelectItem>
            <SelectItem value="days_in_stock">Tempo em estoque</SelectItem>
          </Select>
          <Select label="Direção" value={sortDir} onValueChange={setSortDir}>
            <SelectItem value="desc">Decrescente</SelectItem>
            <SelectItem value="asc">Crescente</SelectItem>
          </Select>
        </div>
      </AdminFilterBar>

      <AdminDataTable
        empty={
          <EmptyState
            title="Nenhum veículo encontrado"
            description="Ajuste os filtros ou cadastre o primeiro veículo do estoque."
            action={
              canWrite ? (
                <Button asChild>
                  <Link href="/painel/estoque/novo">Cadastrar veículo</Link>
                </Button>
              ) : undefined
            }
          />
        }
        head={
          <tr>
            <th>Veículo</th>
            <th>Situação</th>
            <th>Publicação</th>
            <th>Propriedade</th>
            <th data-align="right">Preço</th>
            <th>Estoque</th>
            {canWrite ? <th data-align="right">Ações</th> : null}
          </tr>
        }
        footer={
          items.length > 0 ? (
            <>
              <p className={adminTableStyles.meta}>
                {total} veículo{total === 1 ? '' : 's'}
              </p>
              <Pagination
                page={page}
                totalPages={totalPages}
                getHref={(target) =>
                  '/painel/estoque' +
                  buildQuery({
                    q: filters.q,
                    status: filters.status,
                    makeSlug: filters.makeSlug,
                    modelSlug: filters.modelSlug,
                    yearFrom: filters.yearFrom,
                    yearTo: filters.yearTo,
                    ownership: filters.ownership,
                    publicacao: filters.publicacao,
                    sort: filters.sort,
                    sortDir: filters.sortDir,
                    page: String(target),
                  })
                }
              />
            </>
          ) : null
        }
      >
        {items.length === 0
          ? null
          : items.map((vehicle) => {
              const sold = vehicle.status === VEHICLE_STATUS.SOLD;
              const canEdit = canWrite && !sold;
              const listing = listingsByVehicleId[vehicle.id];

              return (
                <tr key={vehicle.id}>
                  <td>
                    <Link
                      href={`/painel/estoque/${vehicle.id}`}
                      className={adminTableStyles.rowLink}
                    >
                      {vehicle.make} {vehicle.model} {vehicle.version}
                    </Link>
                    <p className={adminTableStyles.rowMeta}>
                      {vehicle.yearManufacture}/{vehicle.yearModel}
                      {vehicle.plate ? ` · ${vehicle.plate}` : ''}
                      {vehicle.internalCode ? ` · ${vehicle.internalCode}` : ''}
                      {vehicle.isDraft === 'true' ? ' · Rascunho' : ''}
                    </p>
                  </td>
                  <td>
                    <InventoryStatusCell
                      storeId={storeId}
                      vehicleId={vehicle.id}
                      status={vehicle.status as VehicleStatus}
                      canWrite={canWrite}
                    />
                  </td>
                  <td>
                    <Link
                      href={
                        listing
                          ? `/painel/estoque/${vehicle.id}?aba=publicacao`
                          : `/painel/estoque/${vehicle.id}?aba=publicacao&publicar=1`
                      }
                      className="inline-flex flex-col gap-0.5 hover:opacity-90"
                    >
                      {listing ? (
                        <>
                          <StatusBadge
                            kind="listing"
                            status={listing.status as ListingStatus}
                          />
                          {listing.availabilityHold === 'true' ? (
                            <span className={adminTableStyles.rowMeta}>Hold disponibilidade</span>
                          ) : null}
                        </>
                      ) : (
                        <span className={adminTableStyles.rowMeta}>Sem publicação</span>
                      )}
                    </Link>
                  </td>
                  <td>
                    {VEHICLE_OWNERSHIP_LABELS[
                      vehicle.ownership as keyof typeof VEHICLE_OWNERSHIP_LABELS
                    ] ?? vehicle.ownership}
                  </td>
                  <td data-align="right">{formatCents(vehicle.askingPriceCents)}</td>
                  <td>{formatDaysInStock(vehicle.enteredAt)}</td>
                  {canWrite ? (
                    <td data-align="right">
                      <div className={adminTableStyles.rowActions}>
                        {canEdit ? (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/painel/estoque/${vehicle.id}?editar=1`}>
                              <Pencil className="size-3.5" strokeWidth={1.5} aria-hidden />
                              Editar
                            </Link>
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/painel/estoque/${vehicle.id}`}>Ver</Link>
                          </Button>
                        )}
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
      </AdminDataTable>
    </div>
  );
}

export function InventoryListSkeleton() {
  return (
    <div className={styles.inventory}>
      <Skeleton className="h-8 w-48" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24" />
        ))}
      </div>
      <Skeleton className="h-40 w-full" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
