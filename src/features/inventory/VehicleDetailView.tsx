'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ChevronRight, MoreHorizontal } from 'lucide-react';

import {
  VEHICLE_CONDITION_LABELS,
  VEHICLE_COST_TYPE_LABELS,
  VEHICLE_OWNERSHIP_LABELS,
} from '@app-types/inventory';
import type { MediaItem } from '@app-types/media';
import { VEHICLE_COST_TYPES, type VehicleCostType } from '@app-types/membership';
import {
  LISTING_STATUS,
  LISTING_STATUS_LABELS,
  VEHICLE_STATUS,
  type ListingStatus,
  type VehicleStatus,
} from '@app-types/status';
import {
  BODY_TYPE_LABELS,
  DRIVETRAIN_LABELS,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
  type BodyType,
  type DrivetrainType,
  type FuelType,
  type TransmissionType,
} from '@app-types/vehicle';
import { AdminPageHeader, ConfirmDialog } from '@components/dashboard';
import { StatusBadge } from '@components/marketplace';
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  Breadcrumb,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  EmptyState,
  Field,
  ImagePlaceholder,
  Select,
  SelectItem,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from '@components/ui';
import { useMediaQuery } from '@hooks/use-media-query';
import type { AuditEventRow, ListingRow, VehicleCostRow, VehicleMediaRow, VehicleRow } from '@lib/db';
import { confirmAvailabilityAction } from '@server/integrity/integrity-actions';
import {
  addVehicleCostAction,
  removeVehicleCostAction,
} from '@server/vehicles/inventory-actions';
import { cn } from '@utils/cn';

import {
  CreateListingFromVehicleView,
  ListingDetailView,
} from '@features/listings';

import { formatCents, formatDaysInStock, reaisInputToCents } from './inventory.format';
import styles from './inventory.module.css';
import { InventoryStatusCell } from './InventoryStatusCell';
import { PricingAssistant } from './PricingAssistant';
import { VehicleFormWizard } from './VehicleFormWizard';

export type VehicleListingSummary = {
  id: string;
  status: string;
  priceCents: number;
  publishedAt: string | null;
  slug: string;
  availabilityHold: string;
  title: string;
};

export type VehicleListingEditorPayload = {
  listing: ListingRow;
  mediaIds: string[];
  history: AuditEventRow[];
};

export type VehicleDetailViewProps = {
  storeId: string;
  vehicle: VehicleRow;
  costs: VehicleCostRow[];
  costTotalCents: number | null;
  media: VehicleMediaRow[];
  history: AuditEventRow[];
  listing: VehicleListingSummary | null;
  /** Dados completos para editar/publicar na aba Publicação. */
  listingEditor?: VehicleListingEditorPayload | null;
  canWrite: boolean;
  canReadCosts: boolean;
  canWriteCosts: boolean;
  initialEditing?: boolean;
  initialTab?: string;
  /** Abre o formulário de criação de publicação (`?publicar=1`). */
  initialPublish?: boolean;
  canCreateListing?: boolean;
  canPublishListing?: boolean;
  canReserve?: boolean;
  activeReservationId?: string | null;
  canSell?: boolean;
  completedSaleId?: string | null;
};

type DetailTab = 'visao' | 'custos' | 'historico' | 'publicacao';

function mediaRowsToItems(rows: VehicleMediaRow[]): MediaItem[] {
  return rows.map((row, index) => ({
    id: row.mediaAssetId ?? row.id,
    url: row.detailUrl || row.url,
    cardUrl: row.cardUrl,
    detailUrl: row.detailUrl || row.url,
    storageKey: row.storageKey,
    sortOrder: row.sortOrder ?? index,
    isPrimary: row.isPrimary === 'true',
    alt: row.alt,
    width: row.width,
    height: row.height,
    mimeType: row.mimeType,
    status: 'ready' as const,
  }));
}

function displayText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : '—';
}

function displayNumber(value: number | null | undefined, emptyLabel = '—'): string {
  if (value == null) {
    return emptyLabel;
  }

  return value.toLocaleString('pt-BR');
}

function labelOrRaw<T extends string>(
  map: Record<T, string>,
  value: string | null | undefined
): string {
  if (!value) {
    return '—';
  }

  return map[value as T] ?? value;
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  'vehicle.created': 'Entrada no estoque',
  'vehicle.draft_created': 'Rascunho criado',
  'vehicle.updated': 'Cadastro atualizado',
  'vehicle.status_changed': 'Situação alterada',
  'vehicle.availability_confirmed': 'Disponibilidade confirmada',
  'vehicle.media_replaced': 'Fotografias atualizadas',
  'vehicle_cost.created': 'Custo registrado',
  'vehicle_cost.deleted': 'Custo removido',
  'listing.created': 'Anúncio criado',
  'listing.updated': 'Anúncio atualizado',
  'listing.status_changed': 'Situação do anúncio alterada',
  'listing.published': 'Anúncio publicado',
  'sale.created': 'Venda registrada',
  'reservation.created': 'Reserva criada',
  'reservation.cancelled': 'Reserva cancelada',
  'reservation.expired': 'Reserva expirada',
};

function auditLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

function sortedMedia(media: VehicleMediaRow[]): VehicleMediaRow[] {
  return [...media].sort((a, b) => {
    if (a.isPrimary === 'true' && b.isPrimary !== 'true') {
      return -1;
    }

    if (b.isPrimary === 'true' && a.isPrimary !== 'true') {
      return 1;
    }

    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
}

function DetailCard({
  title,
  description,
  children,
  className,
  contentClassName,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn(styles.detail__card, className)}>
      <CardHeader className={styles.detail__cardHeader}>
        <div className={styles.detail__cardHeading}>
          <CardTitle className={styles.detail__cardTitle}>{title}</CardTitle>
          {description ? (
            typeof description === 'string' ? (
              <CardDescription>{description}</CardDescription>
            ) : (
              <div className={styles.detail__cardDescription}>{description}</div>
            )
          ) : null}
        </div>
      </CardHeader>
      <CardContent className={cn(styles.detail__cardContent, contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function VehicleDetailView({
  storeId,
  vehicle,
  costs,
  costTotalCents,
  media,
  history,
  listing,
  listingEditor = null,
  canWrite,
  canReadCosts,
  canWriteCosts,
  initialEditing = false,
  initialTab,
  initialPublish = false,
  canCreateListing = false,
  canPublishListing = false,
  canReserve = false,
  activeReservationId = null,
  canSell = false,
  completedSaleId = null,
}: VehicleDetailViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const sold = vehicle.status === VEHICLE_STATUS.SOLD;
  const [editing, setEditing] = useState(initialEditing && canWrite && !sold);
  const [pending, setPending] = useState(false);
  const [costDialogOpen, setCostDialogOpen] = useState(false);
  const [opsOpen, setOpsOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [activeThumb, setActiveThumb] = useState(0);
  const [creatingListing, setCreatingListing] = useState(initialPublish && !listing);
  const [costType, setCostType] = useState<string>(VEHICLE_COST_TYPES.REPAIR);
  const [costAmount, setCostAmount] = useState('');
  const [costDescription, setCostDescription] = useState('');

  const showPublicationTab = Boolean(listing) || canCreateListing;
  const tabFromQuery: DetailTab =
    initialTab === 'custos' ||
    initialTab === 'historico' ||
    initialTab === 'visao' ||
    initialTab === 'publicacao'
      ? initialTab
      : initialPublish
        ? 'publicacao'
        : 'visao';
  const [tab, setTab] = useState<DetailTab>(() => {
    if (tabFromQuery === 'custos' && !canReadCosts) {
      return 'visao';
    }

    if (tabFromQuery === 'publicacao' && !showPublicationTab) {
      return 'visao';
    }

    return tabFromQuery;
  });

  const gallery = useMemo(() => sortedMedia(media), [media]);
  const hero = gallery[activeThumb] ?? gallery[0] ?? null;

  const acquisition = costs.find((cost) => cost.type === VEHICLE_COST_TYPES.ACQUISITION);
  const extraCosts = costs.filter((cost) => cost.type !== VEHICLE_COST_TYPES.ACQUISITION);
  const listingStatus = listing?.status as ListingStatus | undefined;
  const listingAccessible =
    Boolean(listing) &&
    listingStatus !== LISTING_STATUS.CLOSED &&
    listingStatus !== LISTING_STATUS.SUSPENDED;
  const canPublish =
    canCreateListing &&
    !listing &&
    vehicle.status !== VEHICLE_STATUS.PREPARING &&
    vehicle.status !== VEHICLE_STATUS.SOLD &&
    vehicle.status !== VEHICLE_STATUS.WITHDRAWN;
  const canConfirm =
    canWrite &&
    (vehicle.status === VEHICLE_STATUS.AVAILABLE || vehicle.status === VEHICLE_STATUS.PREPARING);
  const canStartSale =
    canSell &&
    !completedSaleId &&
    (vehicle.status === VEHICLE_STATUS.AVAILABLE || vehicle.status === VEHICLE_STATUS.RESERVED);
  const canStartReserve =
    canReserve && !activeReservationId && vehicle.status === VEHICLE_STATUS.AVAILABLE;

  const pendencies = useMemo(() => {
    const items: string[] = [];

    if (gallery.length === 0) {
      items.push('Sem fotografias');
    }

    if (canReadCosts && !acquisition) {
      items.push('Custo de aquisição não informado');
    }

    if (vehicle.status === VEHICLE_STATUS.PREPARING) {
      items.push('Ainda em preparação');
    }

    if (listing?.availabilityHold === 'true') {
      items.push('Anúncio em hold por disponibilidade');
    }

    if (!listing && canPublish) {
      items.push('Sem publicação no marketplace/vitrine');
    }

    if (vehicle.availabilityDueAt) {
      const due = new Date(vehicle.availabilityDueAt).getTime();

      if (!Number.isNaN(due) && due < Date.now()) {
        items.push('Confirmação de estoque vencida');
      }
    }

    return items;
  }, [acquisition, canPublish, canReadCosts, gallery.length, listing, vehicle.availabilityDueAt, vehicle.status]);

  function setTabAndUrl(next: DetailTab) {
    setTab(next);
    const url = new URL(window.location.href);

    if (next === 'visao') {
      url.searchParams.delete('aba');
    } else {
      url.searchParams.set('aba', next);
    }

    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }

  async function onConfirmAvailability() {
    setPending(true);
    const result = await confirmAvailabilityAction({
      storeId,
      vehicleId: vehicle.id,
    });
    setPending(false);

    if (!result.ok) {
      toast({
        title: 'Confirmação bloqueada',
        description: result.message,
        variant: 'error',
      });
      return;
    }

    toast({
      title: 'Disponibilidade confirmada',
      description: result.data.resumedListing ? 'Anúncio retomado após hold' : undefined,
      variant: 'success',
    });
    setOpsOpen(false);
    router.refresh();
  }

  async function onAddCost(event: FormEvent) {
    event.preventDefault();
    const amountCents = reaisInputToCents(costAmount);

    if (amountCents == null) {
      toast({ title: 'Valor inválido', variant: 'error' });
      return;
    }

    setPending(true);
    const result = await addVehicleCostAction({
      storeId,
      vehicleId: vehicle.id,
      type: costType as VehicleCostType,
      amountCents,
      incurredAt: new Date().toISOString(),
      description: costDescription || null,
    });
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Custo não registrado', description: result.message, variant: 'error' });
      return;
    }

    setCostAmount('');
    setCostDescription('');
    setCostDialogOpen(false);
    toast({ title: 'Custo registrado', variant: 'success' });
    router.refresh();
  }

  async function onRemoveCost(costId: string) {
    setPending(true);
    const result = await removeVehicleCostAction(storeId, costId, vehicle.id);
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Falha ao remover', description: result.message, variant: 'error' });
      return;
    }

    toast({ title: 'Custo removido', variant: 'success' });
    router.refresh();
  }

  if (editing && canWrite && !sold) {
    return (
      <div className={styles.inventory}>
        <Button type="button" variant="outline" onClick={() => setEditing(false)}>
          Voltar à ficha
        </Button>
        <VehicleFormWizard
          storeId={storeId}
          mode="edit"
          vehicle={vehicle}
          initialMedia={mediaRowsToItems(media)}
        />
      </div>
    );
  }

  const title = `${vehicle.make} ${vehicle.model}`;
  const versionLine = displayText(vehicle.version);

  const hasCommercialOps =
    Boolean(activeReservationId) ||
    canStartReserve ||
    Boolean(completedSaleId) ||
    canStartSale;
  const hasOpsActions = canConfirm || hasCommercialOps;

  const opsActions = (
    <div className={styles.detail__opsPanel}>
      <section className={styles.detail__opsSection}>
        <InventoryStatusCell
          storeId={storeId}
          vehicleId={vehicle.id}
          status={vehicle.status as VehicleStatus}
          canWrite={canWrite}
          appearance="field"
          label="Situação do estoque"
          onSuccess={() => setOpsOpen(false)}
        />
        <p className={styles.detail__opsHint}>
          Reserva e venda continuam pelos módulos comerciais — não use a situação para esses fluxos.
        </p>
      </section>

      {hasOpsActions ? (
        <section className={styles.detail__opsSection}>
          <p className={styles.detail__opsLabel}>Ações</p>
          <ul className={styles.detail__opsMenu}>
            {canConfirm ? (
              <li>
                <button
                  type="button"
                  className={styles.detail__opsMenuItem}
                  disabled={pending}
                  onClick={() => void onConfirmAvailability()}
                >
                  <span className={styles.detail__opsMenuCopy}>
                    <span className={styles.detail__opsMenuTitle}>Confirmar estoque</span>
                    <span className={styles.detail__opsMenuMeta}>
                      Atualiza o ciclo de disponibilidade
                    </span>
                  </span>
                  <ChevronRight className={styles.detail__opsMenuChevron} strokeWidth={1.5} aria-hidden />
                </button>
              </li>
            ) : null}
            {activeReservationId ? (
              <li>
                <Link
                  href={`/painel/reservas/${activeReservationId}`}
                  className={styles.detail__opsMenuItem}
                  onClick={() => setOpsOpen(false)}
                >
                  <span className={styles.detail__opsMenuCopy}>
                    <span className={styles.detail__opsMenuTitle}>Ver reserva</span>
                    <span className={styles.detail__opsMenuMeta}>Abre a reserva ativa deste veículo</span>
                  </span>
                  <ChevronRight className={styles.detail__opsMenuChevron} strokeWidth={1.5} aria-hidden />
                </Link>
              </li>
            ) : canStartReserve ? (
              <li>
                <Link
                  href={`/painel/reservas/nova?vehicleId=${vehicle.id}`}
                  className={styles.detail__opsMenuItem}
                  onClick={() => setOpsOpen(false)}
                >
                  <span className={styles.detail__opsMenuCopy}>
                    <span className={styles.detail__opsMenuTitle}>Reservar</span>
                    <span className={styles.detail__opsMenuMeta}>Inicia uma reserva comercial</span>
                  </span>
                  <ChevronRight className={styles.detail__opsMenuChevron} strokeWidth={1.5} aria-hidden />
                </Link>
              </li>
            ) : null}
            {completedSaleId ? (
              <li>
                <Link
                  href={`/painel/vendas/${completedSaleId}`}
                  className={styles.detail__opsMenuItem}
                  onClick={() => setOpsOpen(false)}
                >
                  <span className={styles.detail__opsMenuCopy}>
                    <span className={styles.detail__opsMenuTitle}>Ver venda</span>
                    <span className={styles.detail__opsMenuMeta}>Consulta a venda concluída</span>
                  </span>
                  <ChevronRight className={styles.detail__opsMenuChevron} strokeWidth={1.5} aria-hidden />
                </Link>
              </li>
            ) : canStartSale ? (
              <li>
                <Link
                  href={`/painel/vendas/nova?vehicleId=${vehicle.id}`}
                  className={styles.detail__opsMenuItem}
                  onClick={() => setOpsOpen(false)}
                >
                  <span className={styles.detail__opsMenuCopy}>
                    <span className={styles.detail__opsMenuTitle}>Registrar venda</span>
                    <span className={styles.detail__opsMenuMeta}>Marca o veículo como vendido</span>
                  </span>
                  <ChevronRight className={styles.detail__opsMenuChevron} strokeWidth={1.5} aria-hidden />
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </div>
  );

  return (
    <div className={styles.inventory}>
      <Breadcrumb
        items={[
          { label: 'Estoque', href: '/painel/estoque' },
          { label: `${vehicle.make} ${vehicle.model}` },
        ]}
      />

      <AdminPageHeader
        title={title}
        description={
          <span className={styles.detail__headerMeta}>
            <span>{versionLine !== '—' ? versionLine : 'Sem versão'}</span>
            <span>
              {vehicle.yearManufacture}/{vehicle.yearModel}
            </span>
            <span>{displayNumber(vehicle.mileageKm)} km</span>
            <span>
              {VEHICLE_OWNERSHIP_LABELS[
                vehicle.ownership as keyof typeof VEHICLE_OWNERSHIP_LABELS
              ] ?? vehicle.ownership}
            </span>
            {vehicle.plate ? <span>{vehicle.plate}</span> : null}
            <span>{formatDaysInStock(vehicle.enteredAt)} em estoque</span>
          </span>
        }
        secondaryActions={
          <>
            <StatusBadge kind="vehicle" status={vehicle.status as VehicleStatus} />
            {listing ? (
              <StatusBadge kind="listing" status={listingStatus as ListingStatus} />
            ) : (
              <span className={styles.detail__chipMuted}>Sem publicação</span>
            )}
            {listingAccessible && listing?.status === LISTING_STATUS.PUBLISHED ? (
              <Button asChild variant="outline-accent" size="sm">
                <Link href={`/veiculos/${listing.slug}`} target="_blank" rel="noopener noreferrer">
                  Ver anúncio
                </Link>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={styles.detail__moreBtn}
              aria-label="Mais operações"
              onClick={() => setOpsOpen(true)}
            >
              <MoreHorizontal className="size-4" strokeWidth={1.5} aria-hidden />
              <span className="hidden sm:inline">Operações</span>
            </Button>
          </>
        }
        primaryAction={
          canWrite && !sold ? (
            <Button type="button" size="sm" onClick={() => setEditing(true)}>
              Editar veículo
            </Button>
          ) : undefined
        }
      />

      {sold ? (
        <p className={styles.inventory__notice}>
          Veículo vendido — alterações de estoque bloqueadas. Consulte a venda pelo módulo comercial.
        </p>
      ) : null}

      {vehicle.status === VEHICLE_STATUS.RESERVED ? (
        <p className={styles.inventory__notice}>
          Situação reservada — liberação ou conclusão ocorrem pelos módulos de reserva e venda.
        </p>
      ) : null}

      <Tabs
        value={tab}
        onValueChange={(value) => setTabAndUrl(value as DetailTab)}
        className={styles.detail__tabs}
      >
        <TabsList variant="underline">
          <TabsTrigger variant="underline" value="visao">
            Visão geral
          </TabsTrigger>
          {showPublicationTab ? (
            <TabsTrigger variant="underline" value="publicacao">
              Anúncio
            </TabsTrigger>
          ) : null}
          {canReadCosts ? (
            <TabsTrigger variant="underline" value="custos">
              Custos
            </TabsTrigger>
          ) : null}
          <TabsTrigger variant="underline" value="historico">
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao" className={styles.detail__tabBody}>
          <div className={styles.detail__grid}>
            <div className={styles.detail__main}>
              <DetailCard
                title="Fotografias"
                description={
                  canWrite && !sold ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
                      Gerenciar imagens
                    </Button>
                  ) : null
                }
              >
                {hero ? (
                  <div className={styles.detail__gallery}>
                    <button
                      type="button"
                      className={styles.detail__hero}
                      onClick={() => setLightboxUrl(hero.detailUrl || hero.url)}
                      aria-label="Ampliar fotografia principal"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={hero.detailUrl || hero.cardUrl || hero.url}
                        alt={hero.alt ?? `${title} — foto principal`}
                        className={styles.detail__heroImg}
                      />
                    </button>
                    {gallery.length > 1 ? (
                      <ul className={styles.detail__thumbs}>
                        {gallery.map((item, index) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              className={cn(
                                styles.detail__thumb,
                                index === activeThumb && styles.detail__thumbActive
                              )}
                              onClick={() => setActiveThumb(index)}
                              aria-label={`Fotografia ${index + 1}`}
                              aria-pressed={index === activeThumb}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.cardUrl || item.url}
                                alt=""
                                className={styles.detail__thumbImg}
                              />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : (
                  <div className={styles.detail__emptyGallery}>
                    <ImagePlaceholder aspectRatio="16/9" className="w-full" />
                    <p className={styles.inventory__sectionText}>Nenhuma fotografia cadastrada.</p>
                  </div>
                )}
              </DetailCard>

              <DetailCard title="Identificação">
                <dl className={styles.detail__facts}>
                  <div>
                    <dt>Marca</dt>
                    <dd>{vehicle.make}</dd>
                  </div>
                  <div>
                    <dt>Modelo</dt>
                    <dd>{vehicle.model}</dd>
                  </div>
                  <div>
                    <dt>Versão</dt>
                    <dd>{versionLine}</dd>
                  </div>
                  <div>
                    <dt>Placa</dt>
                    <dd>{displayText(vehicle.plate)}</dd>
                  </div>
                  <div>
                    <dt>Código interno</dt>
                    <dd>{displayText(vehicle.internalCode)}</dd>
                  </div>
                  <div>
                    <dt>VIN</dt>
                    <dd>{displayText(vehicle.vin)}</dd>
                  </div>
                </dl>
              </DetailCard>

              <DetailCard title="Características técnicas">
                <dl className={styles.detail__facts}>
                  <div>
                    <dt>Ano fab./modelo</dt>
                    <dd>
                      {vehicle.yearManufacture}/{vehicle.yearModel}
                    </dd>
                  </div>
                  <div>
                    <dt>Quilometragem</dt>
                    <dd>{displayNumber(vehicle.mileageKm)} km</dd>
                  </div>
                  <div>
                    <dt>Combustível</dt>
                    <dd>{labelOrRaw(FUEL_LABELS, vehicle.fuel as FuelType)}</dd>
                  </div>
                  <div>
                    <dt>Câmbio</dt>
                    <dd>{labelOrRaw(TRANSMISSION_LABELS, vehicle.transmission as TransmissionType)}</dd>
                  </div>
                  <div>
                    <dt>Carroceria</dt>
                    <dd>{labelOrRaw(BODY_TYPE_LABELS, vehicle.bodyType as BodyType)}</dd>
                  </div>
                  <div>
                    <dt>Tração</dt>
                    <dd>{labelOrRaw(DRIVETRAIN_LABELS, vehicle.drivetrain as DrivetrainType)}</dd>
                  </div>
                  <div>
                    <dt>Cor</dt>
                    <dd>{displayText(vehicle.color)}</dd>
                  </div>
                  <div>
                    <dt>Potência</dt>
                    <dd>
                      {vehicle.powerKw != null ? `${displayNumber(vehicle.powerKw)} kW` : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Condição</dt>
                    <dd>
                      {labelOrRaw(
                        VEHICLE_CONDITION_LABELS as Record<string, string>,
                        vehicle.condition
                      )}
                    </dd>
                  </div>
                </dl>
              </DetailCard>

              <DetailCard title="Entrada no estoque">
                <dl className={styles.detail__facts}>
                  <div>
                    <dt>Propriedade</dt>
                    <dd>
                      {VEHICLE_OWNERSHIP_LABELS[
                        vehicle.ownership as keyof typeof VEHICLE_OWNERSHIP_LABELS
                      ] ?? vehicle.ownership}
                    </dd>
                  </div>
                  <div>
                    <dt>Entrada</dt>
                    <dd>{new Date(vehicle.enteredAt).toLocaleDateString('pt-BR')}</dd>
                  </div>
                  <div>
                    <dt>Tempo em estoque</dt>
                    <dd>{formatDaysInStock(vehicle.enteredAt)}</dd>
                  </div>
                  {vehicle.ownership === 'consigned' ? (
                    <>
                      <div>
                        <dt>Consignante</dt>
                        <dd>{displayText(vehicle.consignorName)}</dd>
                      </div>
                      <div>
                        <dt>Contato consignante</dt>
                        <dd>{displayText(vehicle.consignorPhone)}</dd>
                      </div>
                    </>
                  ) : null}
                </dl>
              </DetailCard>

              {(vehicle.notesCommercial || vehicle.notesInternal) && (
                <DetailCard title="Notas">
                  <dl className={styles.detail__facts}>
                    {vehicle.notesCommercial ? (
                      <div className={styles.detail__factWide}>
                        <dt>Comerciais</dt>
                        <dd>{vehicle.notesCommercial}</dd>
                      </div>
                    ) : null}
                    {vehicle.notesInternal ? (
                      <div className={styles.detail__factWide}>
                        <dt>Internas</dt>
                        <dd>{vehicle.notesInternal}</dd>
                      </div>
                    ) : null}
                  </dl>
                </DetailCard>
              )}
            </div>

            <aside className={styles.detail__side}>
              <DetailCard title="Situação comercial">
                <dl className={styles.detail__sideFacts}>
                  <div>
                    <dt>Estoque</dt>
                    <dd>
                      <StatusBadge kind="vehicle" status={vehicle.status as VehicleStatus} />
                    </dd>
                  </div>
                  <div>
                    <dt>Preço pretendido</dt>
                    <dd className="tabular-nums font-semibold">
                      {formatCents(vehicle.askingPriceCents)}
                    </dd>
                  </div>
                  <div>
                    <dt>Última confirmação</dt>
                    <dd>
                      {vehicle.availabilityConfirmedAt
                        ? new Date(vehicle.availabilityConfirmedAt).toLocaleString('pt-BR')
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Próxima confirmação</dt>
                    <dd>
                      {vehicle.availabilityDueAt
                        ? new Date(vehicle.availabilityDueAt).toLocaleString('pt-BR')
                        : '—'}
                    </dd>
                  </div>
                </dl>
              </DetailCard>

              <PricingAssistant
                storeId={storeId}
                vehicleId={vehicle.id}
                ownership={vehicle.ownership}
                askingPriceCents={vehicle.askingPriceCents}
                variant="compact"
                canReadCosts={canReadCosts}
              />

              <DetailCard title="Anúncio">
                {listing ? (
                  <dl className={styles.detail__sideFacts}>
                    <div>
                      <dt>Situação</dt>
                      <dd>
                        {LISTING_STATUS_LABELS[listingStatus as ListingStatus] ?? listing.status}
                        {listing.availabilityHold === 'true' ? ' · hold' : ''}
                      </dd>
                    </div>
                    <div>
                      <dt>Preço público</dt>
                      <dd className="tabular-nums">{formatCents(listing.priceCents)}</dd>
                    </div>
                    <div>
                      <dt>Publicado em</dt>
                      <dd>
                        {listing.publishedAt
                          ? new Date(listing.publishedAt).toLocaleDateString('pt-BR')
                          : '—'}
                      </dd>
                    </div>
                    <div className={styles.detail__sideActions}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCreatingListing(false);
                          setTabAndUrl('publicacao');
                        }}
                      >
                        Gerenciar publicação
                      </Button>
                    </div>
                  </dl>
                ) : (
                  <div className={styles.detail__sideEmpty}>
                    <p className={styles.inventory__sectionText}>
                      Ainda não há publicação no marketplace/vitrine. Os dados do estoque são
                      reutilizados — sem segundo cadastro.
                    </p>
                    {canPublish ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setCreatingListing(true);
                          setTabAndUrl('publicacao');
                        }}
                      >
                        Publicar veículo
                      </Button>
                    ) : null}
                  </div>
                )}
              </DetailCard>

              {pendencies.length > 0 ? (
                <DetailCard title="Pendências">
                  <ul className={styles.detail__pendencies}>
                    {pendencies.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </DetailCard>
              ) : (
                <DetailCard title="Pendências">
                  <p className={styles.inventory__sectionText}>Nenhuma pendência operacional.</p>
                </DetailCard>
              )}

              <DetailCard title="Ações rápidas">
                <div className={styles.detail__sideActions}>
                  {canWrite && !sold ? (
                    <Button type="button" size="sm" onClick={() => setEditing(true)}>
                      Editar veículo
                    </Button>
                  ) : null}
                  {canStartSale ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/painel/vendas/nova?vehicleId=${vehicle.id}`}>Registrar venda</Link>
                    </Button>
                  ) : null}
                  {canStartReserve ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/painel/reservas/nova?vehicleId=${vehicle.id}`}>Reservar</Link>
                    </Button>
                  ) : null}
                  {canConfirm ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => void onConfirmAvailability()}
                    >
                      Confirmar estoque
                    </Button>
                  ) : null}
                  {canWrite || hasOpsActions ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setOpsOpen(true)}>
                      Mais operações
                    </Button>
                  ) : null}
                </div>
              </DetailCard>
            </aside>
          </div>
        </TabsContent>

        {showPublicationTab ? (
          <TabsContent value="publicacao" className={styles.detail__tabBodyAnuncio}>
            <DetailCard
              className={styles.detail__cardAnuncio}
              contentClassName={styles.detail__cardAnuncioContent}
              title="Anúncio"
              description="Marketplace e vitrine usam estes dados públicos. O estoque continua sendo a fonte operacional."
            >
              {listingEditor ? (
                <ListingDetailView
                  storeId={storeId}
                  listing={listingEditor.listing}
                  vehicle={vehicle}
                  media={media}
                  selectedMediaIds={listingEditor.mediaIds}
                  history={listingEditor.history}
                  canWrite={canCreateListing}
                  canPublish={canPublishListing}
                  embedded
                  hideHistory
                />
              ) : creatingListing && canCreateListing ? (
                <CreateListingFromVehicleView
                  storeId={storeId}
                  vehicle={vehicle}
                  media={media}
                  suggestedPriceCents={vehicle.askingPriceCents}
                  embedded
                  onCancel={() => {
                    setCreatingListing(false);
                    setTabAndUrl('visao');
                  }}
                />
              ) : (
                <div className={styles.detail__sideEmpty}>
                  <p className={styles.inventory__sectionText}>
                    {canPublish
                      ? 'Complete título, preço e fotos públicas para divulgar este veículo.'
                      : 'Este veículo não está elegível para publicação no momento (preparação, vendido ou retirado).'}
                  </p>
                  {canPublish ? (
                    <Button type="button" size="sm" onClick={() => setCreatingListing(true)}>
                      Iniciar publicação
                    </Button>
                  ) : null}
                </div>
              )}
            </DetailCard>
          </TabsContent>
        ) : null}

        {canReadCosts ? (
          <TabsContent value="custos" className={styles.detail__tabBody}>
            <DetailCard
              title="Custos privados"
              description="Visíveis apenas para papéis autorizados da loja."
            >
              {costs.length === 0 ? (
                <EmptyState
                  title="Nenhum custo registrado"
                  description="Registre aquisição e despesas adicionais deste veículo. Os valores são privados da loja."
                  action={
                    canWriteCosts && !sold ? (
                      <Button type="button" onClick={() => setCostDialogOpen(true)}>
                        Adicionar despesa
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className={styles.detail__costBody}>
                  <div className={styles.detail__costSummary}>
                    <div>
                      <p className={styles.detail__costLabel}>Aquisição</p>
                      <p className="tabular-nums font-semibold">
                        {acquisition ? formatCents(acquisition.amountCents) : 'Não informado'}
                      </p>
                    </div>
                    <div>
                      <p className={styles.detail__costLabel}>Despesas adicionais</p>
                      <p className="tabular-nums font-semibold">
                        {formatCents(extraCosts.reduce((sum, cost) => sum + cost.amountCents, 0))}
                      </p>
                    </div>
                    <div>
                      <p className={styles.detail__costLabel}>Total conhecido</p>
                      <p className="tabular-nums font-semibold">
                        {costTotalCents != null ? formatCents(costTotalCents) : '—'}
                      </p>
                    </div>
                  </div>

                  {!acquisition ? (
                    <p className={styles.inventory__reviewPending}>
                      Informações de aquisição incompletas — registre o custo de entrada quando
                      souber o valor.
                    </p>
                  ) : null}

                  <div className={styles.detail__costToolbar}>
                    {canWriteCosts && !sold ? (
                      <Button type="button" size="sm" onClick={() => setCostDialogOpen(true)}>
                        Adicionar despesa
                      </Button>
                    ) : null}
                  </div>

                  <ul className={styles.inventory__costList}>
                    {costs.map((cost) => (
                      <li key={cost.id} className={styles.inventory__costItem}>
                        <div>
                          <p className="font-medium">
                            {VEHICLE_COST_TYPE_LABELS[cost.type as VehicleCostType] ?? cost.type}
                          </p>
                          <p className={styles.inventory__meta}>
                            {cost.description ?? 'Sem descrição'} ·{' '}
                            {new Date(cost.incurredAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums font-medium">
                            {formatCents(cost.amountCents)}
                          </span>
                          {canWriteCosts && !sold ? (
                            <ConfirmDialog
                              tone="danger"
                              title="Remover este custo?"
                              description="A remoção é permanente e fica na auditoria."
                              confirmLabel="Remover"
                              action={() => onRemoveCost(cost.id)}
                              trigger={
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={pending}
                                >
                                  Remover
                                </Button>
                              }
                            />
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </DetailCard>
          </TabsContent>
        ) : null}

        <TabsContent value="historico" className={styles.detail__tabBody}>
          <DetailCard
            title="Histórico operacional"
            description="Eventos reais de auditoria desta unidade na loja."
          >
            {history.length === 0 ? (
              <p className={styles.inventory__sectionText}>Sem eventos registrados.</p>
            ) : (
              <ul className={styles.detail__history}>
                {history.map((event) => (
                  <li key={event.id} className={styles.detail__historyItem}>
                    <p className="font-medium">{auditLabel(event.action)}</p>
                    <p className={styles.inventory__meta}>
                      {new Date(event.createdAt).toLocaleString('pt-BR')}
                      {event.actorUserId ? ` · ${event.actorUserId.slice(0, 8)}…` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </DetailCard>
        </TabsContent>
      </Tabs>

      {isDesktop ? (
        <Drawer open={opsOpen} onOpenChange={setOpsOpen}>
          <DrawerContent side="right" className={styles.detail__opsDrawer}>
            <DrawerHeader>
              <DrawerTitle>Operações</DrawerTitle>
              <p className={styles.detail__opsDrawerDesc}>
                Situação do estoque e atalhos comerciais deste veículo.
              </p>
            </DrawerHeader>
            <DrawerBody>{opsActions}</DrawerBody>
          </DrawerContent>
        </Drawer>
      ) : (
        <BottomSheet open={opsOpen} onOpenChange={setOpsOpen}>
          <BottomSheetContent height="content">
            <BottomSheetHeader>
              <BottomSheetTitle>Operações</BottomSheetTitle>
            </BottomSheetHeader>
            <BottomSheetBody>{opsActions}</BottomSheetBody>
          </BottomSheetContent>
        </BottomSheet>
      )}

      <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar despesa</DialogTitle>
          </DialogHeader>
          <form className={styles.inventory__formGrid} onSubmit={onAddCost}>
            <Select label="Tipo" value={costType} onValueChange={setCostType}>
              {Object.values(VEHICLE_COST_TYPES).map((type) => (
                <SelectItem key={type} value={type}>
                  {VEHICLE_COST_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </Select>
            <Field
              label="Valor (R$)"
              name="costAmount"
              value={costAmount}
              onChange={(e) => setCostAmount(e.target.value)}
              required
            />
            <Field
              className={styles.inventory__formFull}
              label="Descrição"
              name="costDescription"
              value={costDescription}
              onChange={(e) => setCostDescription(e.target.value)}
            />
            <div className={cn(styles.inventory__formFull, styles.detail__dialogActions)}>
              <Button type="button" variant="ghost" onClick={() => setCostDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                Salvar despesa
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(lightboxUrl)} onOpenChange={(open) => !open && setLightboxUrl(null)}>
        <DialogContent className={styles.detail__lightbox}>
          <DialogHeader>
            <DialogTitle>Fotografia</DialogTitle>
          </DialogHeader>
          {lightboxUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lightboxUrl} alt="" className={styles.detail__lightboxImg} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
