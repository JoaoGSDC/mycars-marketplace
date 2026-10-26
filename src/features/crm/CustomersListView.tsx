'use client';

import { Pencil } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import type { CustomerRow } from '@lib/db';
import {
  AdminDataTable,
  AdminFilterBar,
  AdminPageHeader,
  adminTableStyles,
} from '@components/dashboard';
import { Button, EmptyState, Field, Pagination } from '@components/ui';

import { formatDate, formatPhoneDisplay } from './crm.format';
import styles from './crm.module.css';

export type CustomersListViewProps = {
  items: CustomerRow[];
  total: number;
  page: number;
  totalPages: number;
  canWrite: boolean;
  filters: { q?: string };
};

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const qs = search.toString();

  return qs ? `?${qs}` : '';
}

export function CustomersListView({
  items,
  total,
  page,
  totalPages,
  canWrite,
  filters,
}: CustomersListViewProps) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q ?? '');

  function applyFilters(extra: Record<string, string | undefined> = {}) {
    router.push(
      '/painel/clientes' +
        buildQuery({
          q: q || undefined,
          page: '1',
          ...extra,
        })
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    applyFilters();
  }

  return (
    <div className={styles.crm}>
      <AdminPageHeader
        title="Clientes"
        description={`Contatos da loja · ${total} cadastrado${total === 1 ? '' : 's'}`}
        primaryAction={
          canWrite ? (
            <Button asChild>
              <Link href="/painel/clientes/novo">Novo cliente</Link>
            </Button>
          ) : undefined
        }
      />

      <AdminFilterBar
        onSubmit={onSubmit}
        actions={<Button type="submit">Filtrar</Button>}
      >
        <Field
          label="Pesquisar"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nome ou telefone"
        />
      </AdminFilterBar>

      <AdminDataTable
        head={
          <tr>
            <th>Nome</th>
            <th>Telefone</th>
            <th>E-mail</th>
            <th>Origem</th>
            <th>Atualizado</th>
            {canWrite ? <th className="w-[1%] whitespace-nowrap">Ações</th> : null}
          </tr>
        }
        empty={
          <EmptyState
            title="Nenhum cliente encontrado"
            description="Cadastre um contato ou aguarde interesses pelo formulário público."
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
                '/painel/clientes' + buildQuery({ q: filters.q, page: String(p) })
              }
            />
          </>
        }
      >
        {items.length === 0
          ? null
          : items.map((customer) => (
              <tr key={customer.id}>
                <td>
                  <Link
                    className={adminTableStyles.rowLink}
                    href={`/painel/clientes/${customer.id}`}
                  >
                    {customer.name}
                  </Link>
                </td>
                <td>{formatPhoneDisplay(customer.phone)}</td>
                <td>
                  <span className={adminTableStyles.meta}>{customer.email ?? '—'}</span>
                </td>
                <td>
                  <span className={adminTableStyles.meta}>{customer.source}</span>
                </td>
                <td>
                  <span className={adminTableStyles.meta}>
                    {formatDate(customer.updatedAt)}
                  </span>
                </td>
                {canWrite ? (
                  <td>
                    <div className={adminTableStyles.rowActions}>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/painel/clientes/${customer.id}`}>
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
