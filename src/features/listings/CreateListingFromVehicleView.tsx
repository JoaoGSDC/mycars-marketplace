'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { LISTING_STATUS } from '@app-types/status';
import { AdminFormActions, AdminFormActionsSpacer } from '@components/dashboard';
import { Button, Field, useToast } from '@components/ui';
import type { VehicleMediaRow, VehicleRow } from '@lib/db';
import { createListingAction } from '@server/listings/listing-actions';

import { centsToReaisInput, reaisInputToCents } from '../inventory/inventory.format';
import styles from './listings.module.css';

export type CreateListingFromVehicleViewProps = {
  storeId: string;
  vehicle: VehicleRow;
  media: VehicleMediaRow[];
  suggestedPriceCents?: number | null;
  /** Quando embutido na ficha do estoque, omite título de página e cancela com callback. */
  embedded?: boolean;
  onCancel?: () => void;
};

export function CreateListingFromVehicleView({
  storeId,
  vehicle,
  media,
  suggestedPriceCents,
  embedded = false,
  onCancel,
}: CreateListingFromVehicleViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(
    `${vehicle.make} ${vehicle.model} ${vehicle.version}`.trim()
  );
  const [description, setDescription] = useState(vehicle.notesCommercial ?? '');
  const [price, setPrice] = useState(
    centsToReaisInput(suggestedPriceCents ?? vehicle.askingPriceCents)
  );
  const [selected, setSelected] = useState<string[]>(media.map((item) => item.id));
  const [publishNow, setPublishNow] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const priceCents = reaisInputToCents(price);

    if (priceCents == null || priceCents <= 0) {
      setError('Informe o preço público');
      return;
    }

    if (selected.length === 0) {
      setError('Selecione ao menos uma fotografia');
      return;
    }

    setPending(true);
    const result = await createListingAction({
      storeId,
      vehicleId: vehicle.id,
      title,
      description,
      priceCents,
      mediaIds: selected,
      features: [],
      status: publishNow ? LISTING_STATUS.PUBLISHED : LISTING_STATUS.DRAFT,
      featured: false,
    });
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      toast({ title: 'Não foi possível criar', description: result.message, variant: 'error' });
      return;
    }

    toast({
      title: publishNow ? 'Publicação no ar' : 'Rascunho de publicação salvo',
      variant: 'success',
    });
    router.replace(`/painel/estoque/${vehicle.id}?aba=publicacao`);
    router.refresh();
  }

  function toggleMedia(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
      return;
    }

    router.push(`/painel/estoque/${vehicle.id}`);
  }

  const preview = media.find((item) => selected.includes(item.id)) ?? media[0] ?? null;

  return (
    <form className={embedded ? styles.listings__embedded : styles.listings} onSubmit={onSubmit}>
      {embedded ? null : (
        <div>
          <h2 className={styles.listings__title}>Publicar veículo</h2>
          <p className={styles.listings__subtitle}>
            Defina os dados públicos a partir de {vehicle.make} {vehicle.model} {vehicle.version}.
            O cadastro do estoque não é duplicado.
          </p>
        </div>
      )}

      {error ? <p className={styles.listings__alert}>{error}</p> : null}

      <div className={styles.listings__split}>
        <aside className={styles.listings__mediaPane}>
          <p className={styles.listings__mediaPaneTitle}>Fotografias públicas</p>
          <p className={styles.listings__mediaPaneHint}>
            Selecione as fotos que entram no marketplace e na vitrine.
          </p>
          <div className={styles.listings__mediaHero}>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.url || preview.cardUrl}
                alt={preview.alt ?? ''}
                className={styles.listings__mediaHeroImg}
              />
            ) : (
              <div className={styles.listings__mediaHeroEmpty}>
                Nenhuma foto no estoque.{' '}
                <Link
                  href={`/painel/estoque/${vehicle.id}?editar=1`}
                  className="text-accent-strong"
                >
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
            </p>
          ) : null}
        </aside>

        <div className={styles.listings__fields}>
          <div className={styles.listings__fieldsRow}>
            <Field
              label="Título comercial"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Field
              label="Preço público (R$)"
              name="price"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className={styles.listings__fieldGrow}>
            <label className={styles.listings__textareaLabel} htmlFor="create-listing-description">
              Descrição comercial
            </label>
            <textarea
              id="create-listing-description"
              rows={8}
              className={styles.listings__textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <label className={styles.listings__publishToggle}>
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.target.checked)}
            />
            <span>Publicar imediatamente no marketplace e na vitrine</span>
          </label>
        </div>
      </div>

      <AdminFormActions
        sticky
        className={
          embedded
            ? `${styles.listings__footer} ${styles.listings__footerSticky}`
            : styles.listings__footer
        }
      >
        <Button type="button" variant="outline" onClick={handleCancel}>
          Cancelar
        </Button>
        <AdminFormActionsSpacer />
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando…' : publishNow ? 'Publicar agora' : 'Salvar rascunho'}
        </Button>
      </AdminFormActions>
    </form>
  );
}
