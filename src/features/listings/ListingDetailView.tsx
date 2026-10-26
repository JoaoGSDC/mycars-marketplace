'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import {
  LISTING_STATUS,
  LISTING_STATUS_LABELS,
  VEHICLE_STATUS_LABELS,
  type ListingStatus,
  type VehicleStatus,
} from '@app-types/status';
import {
  AdminFormActions,
  AdminFormActionsSpacer,
  AdminPageHeader,
  ConfirmDialog,
} from '@components/dashboard';
import { StatusBadge } from '@components/marketplace';
import { Button, Field, useToast } from '@components/ui';
import type { AuditEventRow, ListingRow, VehicleMediaRow, VehicleRow } from '@lib/db';
import {
  transitionListingAction,
  updateListingAction,
} from '@server/listings/listing-actions';
import { formatCurrency } from '@utils/format';

import { centsToReaisInput, reaisInputToCents } from '../inventory/inventory.format';
import styles from './listings.module.css';

type DealerTransition =
  | typeof LISTING_STATUS.PUBLISHED
  | typeof LISTING_STATUS.PAUSED
  | typeof LISTING_STATUS.CLOSED;

const DEALER_ACTIONS: Record<string, Array<{ to: DealerTransition; label: string }>> = {
  [LISTING_STATUS.DRAFT]: [{ to: LISTING_STATUS.PUBLISHED, label: 'Publicar' }],
  [LISTING_STATUS.PUBLISHED]: [
    { to: LISTING_STATUS.PAUSED, label: 'Pausar' },
    { to: LISTING_STATUS.CLOSED, label: 'Encerrar' },
  ],
  [LISTING_STATUS.PAUSED]: [
    { to: LISTING_STATUS.PUBLISHED, label: 'Retomar' },
    { to: LISTING_STATUS.CLOSED, label: 'Encerrar' },
  ],
  [LISTING_STATUS.SUSPENDED]: [],
  [LISTING_STATUS.CLOSED]: [],
};

export type ListingDetailViewProps = {
  storeId: string;
  listing: ListingRow;
  vehicle: VehicleRow;
  media: VehicleMediaRow[];
  selectedMediaIds: string[];
  history: AuditEventRow[];
  canWrite: boolean;
  canPublish: boolean;
  /** Embutido na ficha do estoque — sem header de página próprio. */
  embedded?: boolean;
  /** Oculta o bloco de histórico (quando a ficha já tem aba Histórico). */
  hideHistory?: boolean;
};

export function ListingDetailView({
  storeId,
  listing,
  vehicle,
  media,
  selectedMediaIds,
  history,
  canWrite,
  canPublish,
  embedded = false,
  hideHistory = false,
}: ListingDetailViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description);
  const [price, setPrice] = useState(centsToReaisInput(listing.priceCents));
  const [selected, setSelected] = useState<string[]>(
    selectedMediaIds.length > 0 ? selectedMediaIds : media.map((item) => item.id)
  );

  const actions = DEALER_ACTIONS[listing.status] ?? [];
  const locked =
    listing.status === LISTING_STATUS.SUSPENDED || listing.status === LISTING_STATUS.CLOSED;
  const canEdit = canWrite && !locked;

  async function onSave(event: FormEvent) {
    event.preventDefault();

    if (!canEdit) {
      return;
    }

    const priceCents = reaisInputToCents(price);

    if (priceCents == null) {
      toast({ title: 'Preço inválido', variant: 'error' });
      return;
    }

    setPending(true);
    const result = await updateListingAction({
      storeId,
      listingId: listing.id,
      title,
      description,
      priceCents,
      mediaIds: selected,
    });
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Não foi possível salvar', description: result.message, variant: 'error' });
      return;
    }

    toast({ title: 'Anúncio atualizado', variant: 'success' });
    router.refresh();
  }

  async function onTransition(toStatus: DealerTransition) {
    if (toStatus === LISTING_STATUS.PUBLISHED && !canPublish) {
      toast({ title: 'Sem permissão para publicar', variant: 'error' });
      return;
    }

    setPending(true);
    const result = await transitionListingAction({
      storeId,
      listingId: listing.id,
      toStatus,
    });
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Transição bloqueada', description: result.message, variant: 'error' });
      return;
    }

    toast({
      title: 'Situação atualizada',
      description: LISTING_STATUS_LABELS[toStatus],
      variant: 'success',
    });
    router.refresh();
  }

  function toggleMedia(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  const preview =
    media.find((item) => selected.includes(item.id)) ?? media[0] ?? null;

  const mediaPane = (
    <aside className={styles.listings__mediaPane}>
      <p className={styles.listings__mediaPaneTitle}>Fotografias do anúncio</p>
      <p className={styles.listings__mediaPaneHint}>
        Selecione as fotos públicas. A ordem segue o estoque.
      </p>
      <div className={styles.listings__mediaHero}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.url || preview.cardUrl || undefined}
            alt={preview.alt ?? ''}
            className={styles.listings__mediaHeroImg}
          />
        ) : (
          <div className={styles.listings__mediaHeroEmpty}>
            Nenhuma foto no estoque.{' '}
            <Link href={`/painel/estoque/${vehicle.id}?editar=1`} className="text-accent-strong">
              Adicionar
            </Link>
          </div>
        )}
      </div>
      {media.length > 0 ? (
        <ul className={styles.listings__mediaGrid}>
          {media.map((item) => {
            const active = selected.includes(item.id);

            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`${styles.listings__mediaItem} ${active ? styles.listings__mediaItemSelected : ''}`}
                  disabled={!canEdit}
                  aria-pressed={active}
                  onClick={() => toggleMedia(item.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.cardUrl || item.url}
                    alt={item.alt ?? ''}
                    className={styles.listings__mediaThumb}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {media.length > 0 ? (
        <p className={styles.listings__meta}>
          {selected.length} de {media.length} selecionada{selected.length === 1 ? '' : 's'}
          {' · '}
          <Link href={`/painel/estoque/${vehicle.id}?editar=1`} className="text-accent-strong">
            Gerenciar no estoque
          </Link>
        </p>
      ) : null}
    </aside>
  );

  const fields = (
    <div className={styles.listings__fields}>
      <div className={styles.listings__fieldsRow}>
        <Field
          label="Título comercial"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!canEdit}
          required
        />
        <Field
          label="Preço público (R$)"
          name="price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={!canEdit}
          required
          hint={
            listing.previousPriceCents != null
              ? `Anterior: ${formatCurrency(listing.previousPriceCents / 100)}`
              : undefined
          }
        />
      </div>
      <div className={styles.listings__fieldGrow}>
        <label className={styles.listings__textareaLabel} htmlFor="listing-description">
          Descrição comercial
        </label>
        <textarea
          id="listing-description"
          rows={8}
          className={styles.listings__textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!canEdit}
        />
      </div>
    </div>
  );

  const footerActions =
    canWrite && (canEdit || actions.length > 0) ? (
      <AdminFormActions
        sticky
        className={
          embedded
            ? `${styles.listings__footer} ${styles.listings__footerSticky}`
            : styles.listings__footer
        }
      >
        {actions.map((action) => {
          if (action.to === LISTING_STATUS.PUBLISHED && !canPublish) {
            return null;
          }

          return (
            <ConfirmDialog
              key={action.to}
              title={`${action.label} anúncio?`}
              description="A mudança vale para marketplace e vitrine. Auditoria registra responsável e data."
              confirmLabel={action.label}
              action={() => onTransition(action.to)}
              trigger={
                <Button
                  type="button"
                  variant={action.to === LISTING_STATUS.CLOSED ? 'outline' : 'outline-accent'}
                  disabled={pending}
                >
                  {action.label}
                </Button>
              }
            />
          );
        })}
        <AdminFormActionsSpacer />
        {canEdit ? (
          <Button type="submit" disabled={pending} form="listing-editor-form">
            {pending ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        ) : null}
      </AdminFormActions>
    ) : null;

  return (
    <div className={embedded ? styles.listings__embedded : styles.listings}>
      {embedded ? (
        <div className={styles.listings__embeddedHead}>
          <StatusBadge kind="listing" status={listing.status as ListingStatus} />
          {listing.status === LISTING_STATUS.PUBLISHED ? (
            <Button asChild variant="outline-accent" size="sm">
              <Link href={`/veiculos/${listing.slug}`} target="_blank" rel="noopener noreferrer">
                Ver anúncio
              </Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <AdminPageHeader
          title={listing.title}
          description={
            <>
              Veículo:{' '}
              <Link href={`/painel/estoque/${vehicle.id}`} className="text-accent-strong">
                {vehicle.make} {vehicle.model} {vehicle.version}
              </Link>
              {' · '}
              {VEHICLE_STATUS_LABELS[vehicle.status as VehicleStatus] ?? vehicle.status}
            </>
          }
          secondaryActions={
            <>
              <StatusBadge kind="listing" status={listing.status as ListingStatus} />
              {listing.status === LISTING_STATUS.PUBLISHED ? (
                <Button asChild variant="outline-accent" size="sm">
                  <Link href={`/veiculos/${listing.slug}`} target="_blank" rel="noopener noreferrer">
                    Ver anúncio
                  </Link>
                </Button>
              ) : null}
            </>
          }
        />
      )}

      {listing.status === LISTING_STATUS.SUSPENDED ? (
        <p className={styles.listings__notice}>
          Suspenso administrativamente — o lojista não pode retomar sem autorização.
        </p>
      ) : null}

      <form id="listing-editor-form" className={styles.listings__split} onSubmit={onSave}>
        {mediaPane}
        {fields}
      </form>

      {footerActions}

      {hideHistory ? null : (
        <section className="flex flex-col gap-3">
          <h3 className={styles.listings__historyTitle}>Histórico</h3>
          {history.length === 0 ? (
            <p className={styles.listings__meta}>Sem eventos registrados.</p>
          ) : (
            <ul className={styles.listings__history}>
              {history.map((event) => (
                <li key={event.id} className={styles.listings__historyItem}>
                  <p className="font-medium">{event.action}</p>
                  <p className={styles.listings__meta}>
                    {new Date(event.createdAt).toLocaleString('pt-BR')}
                    {event.actorUserId ? ` · ${event.actorUserId.slice(0, 8)}…` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
