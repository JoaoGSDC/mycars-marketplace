import { PERMISSIONS } from '@app-types/permissions';
import { LISTING_STATUS } from '@app-types/status';
import type { VehicleListing } from '@app-types/vehicle';
import type { AuditEventRow, ListingRow } from '@lib/db';
import { nowIso } from '@lib/db';
import { authorizeStoreAction } from '@server/auth/access';
import * as auditRepo from '@server/repositories/audit-events.repository';
import * as listingsRepo from '@server/repositories/listings.repository';
import * as mediaRepo from '@server/repositories/vehicle-media.repository';
import * as storesRepo from '@server/repositories/stores.repository';
import * as vehiclesRepo from '@server/repositories/vehicles.repository';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';
import { slugify } from '@utils/slug';

import {
  assertCanPublishListing,
  canAdminTransitionListing,
  canDealerTransitionListing,
  isListingRowPubliclyVisible,
} from './listing-eligibility';
import { mapListingBundleToVehicleListing } from './listing-mapper';
import {
  createListingSchema,
  transitionListingSchema,
  updateListingSchema,
  type CreateListingInput,
  type TransitionListingInput,
  type UpdateListingInput,
} from './listings.validators';

function boolToText(value: boolean): string {
  return value ? 'true' : 'false';
}

function defaultTitle(make: string, model: string, version: string): string {
  return `${make} ${model} ${version}`.trim();
}

function defaultSlug(makeSlug: string, modelSlug: string, vehicleId: string): string {
  const base = slugify(`${makeSlug}-${modelSlug}`);
  const suffix = vehicleId.slice(0, 8);

  return `${base}-${suffix}`;
}

async function auditListing(
  storeId: string,
  actorUserId: string | null,
  action: string,
  listingId: string,
  payload: Record<string, unknown>
) {
  await auditRepo.insertAuditEvent({
    storeId,
    actorUserId,
    action,
    entityType: 'listing',
    entityId: listingId,
    payloadJson: JSON.stringify(payload),
  });
}

/** Compatível com seed/testes legados (sem ator). Preferir createListingForStore. */
export async function createListing(raw: CreateListingInput): Promise<ServiceResult<ListingRow>> {
  return createListingForStore(raw, null);
}

export async function createListingForStore(
  raw: CreateListingInput,
  actorUserId: string | null
): Promise<ServiceResult<ListingRow>> {
  const parsed = createListingSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;

  if (actorUserId) {
    const permission =
      data.status === LISTING_STATUS.PUBLISHED
        ? PERMISSIONS.LISTINGS_PUBLISH
        : PERMISSIONS.LISTINGS_WRITE;
    const access = await authorizeStoreAction(actorUserId, data.storeId, permission);

    if (!access.ok) {
      return access;
    }
  }

  const store = await storesRepo.findStoreById(data.storeId);

  if (!store) {
    return serviceError('NOT_FOUND', 'Loja não encontrada');
  }

  const vehicle = await vehiclesRepo.findVehicleInStore(data.storeId, data.vehicleId);

  if (!vehicle) {
    return serviceError('NOT_FOUND', 'Veículo não encontrado nesta loja');
  }

  const existingForVehicle = await listingsRepo.findListingByVehicleId(data.vehicleId);

  if (existingForVehicle) {
    return serviceError('CONFLICT', 'Veículo já possui anúncio');
  }

  const title = data.title?.trim() || defaultTitle(vehicle.make, vehicle.model, vehicle.version);
  let slug = data.slug?.trim() || defaultSlug(vehicle.makeSlug, vehicle.modelSlug, vehicle.id);

  const existingSlug = await listingsRepo.findListingBySlug(slug);

  if (existingSlug) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const mediaRows = await mediaRepo.listMediaByVehicle(data.storeId, data.vehicleId);
  const mediaIds =
    data.mediaIds.length > 0
      ? data.mediaIds.filter((id) => mediaRows.some((row) => row.id === id))
      : mediaRows.map((row) => row.id);

  if (data.status === LISTING_STATUS.PUBLISHED) {
    const eligibility = assertCanPublishListing({
      vehicleStatus: vehicle.status,
      storeStatus: store.status,
      listingStatus: LISTING_STATUS.DRAFT,
      hasPhotos: mediaIds.length > 0,
      priceCents: data.priceCents,
      title,
      description: data.description,
    });

    if (!eligibility.ok) {
      return serviceError('FORBIDDEN', eligibility.message);
    }
  }

  const publishedAt =
    data.status === LISTING_STATUS.PUBLISHED ? (data.publishedAt ?? nowIso()) : (data.publishedAt ?? null);

  const listing = await listingsRepo.insertListing({
    storeId: data.storeId,
    vehicleId: data.vehicleId,
    slug,
    title,
    description: data.description,
    priceCents: data.priceCents,
    previousPriceCents: data.previousPriceCents ?? null,
    status: data.status,
    featured: boolToText(data.featured),
    mediaIdsJson: JSON.stringify(mediaIds),
    featuresJson: JSON.stringify(data.features ?? []),
    publishedAt,
    closedAt: null,
  });

  await auditListing(listing.storeId, actorUserId, 'listing.created', listing.id, {
    slug: listing.slug,
    status: listing.status,
    priceCents: listing.priceCents,
  });

  if (listing.status === LISTING_STATUS.PUBLISHED) {
    const { ensureAvailabilityCycleOnPublish } = await import(
      '@server/integrity/availability.service'
    );
    await ensureAvailabilityCycleOnPublish(listing.storeId, listing.vehicleId, actorUserId);
  }

  return serviceSuccess(listing);
}

export async function updateListing(
  raw: UpdateListingInput,
  actorUserId: string
): Promise<ServiceResult<ListingRow>> {
  const parsed = updateListingSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const access = await authorizeStoreAction(
    actorUserId,
    parsed.data.storeId,
    PERMISSIONS.LISTINGS_WRITE
  );

  if (!access.ok) {
    return access;
  }

  const existing = await listingsRepo.findListingInStore(
    parsed.data.storeId,
    parsed.data.listingId
  );

  if (!existing) {
    return serviceError('NOT_FOUND', 'Anúncio não encontrado nesta loja');
  }

  if (existing.status === LISTING_STATUS.CLOSED) {
    return serviceError('CONFLICT', 'Anúncio encerrado não pode ser editado');
  }

  if (existing.status === LISTING_STATUS.SUSPENDED) {
    return serviceError('FORBIDDEN', 'Anúncio suspenso — edição bloqueada para o lojista');
  }

  const patch: Parameters<typeof listingsRepo.updateListingRow>[1] = {};
  const diff: Record<string, { from: unknown; to: unknown }> = {};

  if (parsed.data.title != null && parsed.data.title !== existing.title) {
    patch.title = parsed.data.title;
    diff.title = { from: existing.title, to: parsed.data.title };
  }

  if (parsed.data.description != null && parsed.data.description !== existing.description) {
    patch.description = parsed.data.description;
    diff.description = { from: existing.description, to: parsed.data.description };
  }

  if (parsed.data.priceCents != null && parsed.data.priceCents !== existing.priceCents) {
    patch.previousPriceCents = existing.priceCents;
    patch.priceCents = parsed.data.priceCents;
    diff.priceCents = { from: existing.priceCents, to: parsed.data.priceCents };
  }

  if (parsed.data.previousPriceCents !== undefined) {
    patch.previousPriceCents = parsed.data.previousPriceCents;
  }

  if (parsed.data.featured != null) {
    patch.featured = boolToText(parsed.data.featured);
  }

  if (parsed.data.mediaIds) {
    const mediaRows = await mediaRepo.listMediaByVehicle(existing.storeId, existing.vehicleId);
    const mediaIds = parsed.data.mediaIds.filter((id) => mediaRows.some((row) => row.id === id));
    patch.mediaIdsJson = JSON.stringify(mediaIds);
    diff.mediaIds = { from: existing.mediaIdsJson, to: mediaIds };
  }

  if (parsed.data.features) {
    patch.featuresJson = JSON.stringify(parsed.data.features);
    diff.features = { from: existing.featuresJson, to: parsed.data.features };
  }

  if (parsed.data.slug && parsed.data.slug !== existing.slug) {
    const clash = await listingsRepo.findListingBySlug(parsed.data.slug);

    if (clash && clash.id !== existing.id) {
      return serviceError('CONFLICT', 'Slug de anúncio já em uso');
    }

    patch.slug = parsed.data.slug;
    diff.slug = { from: existing.slug, to: parsed.data.slug };
  }

  if (Object.keys(patch).length === 0) {
    return serviceSuccess(existing);
  }

  if (existing.status === LISTING_STATUS.PUBLISHED) {
    const vehicle = await vehiclesRepo.findVehicleInStore(existing.storeId, existing.vehicleId);
    const store = await storesRepo.findStoreById(existing.storeId);
    const nextPrice = patch.priceCents ?? existing.priceCents;
    const nextTitle = patch.title ?? existing.title;
    let mediaCount = 0;

    try {
      mediaCount = (JSON.parse(patch.mediaIdsJson ?? existing.mediaIdsJson) as string[]).length;
    } catch {
      mediaCount = 0;
    }

    const eligibility = assertCanPublishListing({
      vehicleStatus: vehicle?.status ?? 'preparing',
      storeStatus: store?.status ?? 'pending',
      listingStatus: existing.status,
      hasPhotos: mediaCount > 0,
      priceCents: nextPrice,
      title: nextTitle,
    });

    if (!eligibility.ok) {
      return serviceError('FORBIDDEN', eligibility.message);
    }
  }

  const updated = await listingsRepo.updateListingRow(existing.id, patch);

  await auditListing(updated.storeId, actorUserId, 'listing.updated', updated.id, { diff });

  return serviceSuccess(updated);
}

export async function transitionListing(
  raw: TransitionListingInput,
  actorUserId: string,
  source: 'dealer' | 'admin' = 'dealer'
): Promise<ServiceResult<ListingRow>> {
  const parsed = transitionListingSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const permission =
    parsed.data.toStatus === LISTING_STATUS.PUBLISHED
      ? PERMISSIONS.LISTINGS_PUBLISH
      : PERMISSIONS.LISTINGS_WRITE;

  const access = await authorizeStoreAction(actorUserId, parsed.data.storeId, permission);

  if (!access.ok) {
    return access;
  }

  const existing = await listingsRepo.findListingInStore(
    parsed.data.storeId,
    parsed.data.listingId
  );

  if (!existing) {
    return serviceError('NOT_FOUND', 'Anúncio não encontrado nesta loja');
  }

  if (source === 'dealer') {
    if (parsed.data.toStatus === LISTING_STATUS.SUSPENDED) {
      return serviceError('FORBIDDEN', 'Suspensão administrativa não pode ser aplicada pelo lojista');
    }

    if (!canDealerTransitionListing(existing.status, parsed.data.toStatus)) {
      return serviceError(
        'CONFLICT',
        `Transição ${existing.status} → ${parsed.data.toStatus} não permitida`
      );
    }
  } else if (!canAdminTransitionListing(existing.status, parsed.data.toStatus)) {
    return serviceError(
      'CONFLICT',
      `Transição administrativa ${existing.status} → ${parsed.data.toStatus} não permitida`
    );
  }

  if (existing.status === parsed.data.toStatus) {
    return serviceSuccess(existing);
  }

  if (parsed.data.toStatus === LISTING_STATUS.PUBLISHED) {
    const vehicle = await vehiclesRepo.findVehicleInStore(existing.storeId, existing.vehicleId);
    const store = await storesRepo.findStoreById(existing.storeId);
    let mediaCount = 0;

    try {
      mediaCount = (JSON.parse(existing.mediaIdsJson) as string[]).length;
    } catch {
      mediaCount = 0;
    }

    if (mediaCount === 0) {
      const mediaRows = await mediaRepo.listMediaByVehicle(existing.storeId, existing.vehicleId);
      mediaCount = mediaRows.length;
    }

    const eligibility = assertCanPublishListing({
      vehicleStatus: vehicle?.status ?? 'preparing',
      storeStatus: store?.status ?? 'pending',
      listingStatus: existing.status,
      hasPhotos: mediaCount > 0,
      priceCents: existing.priceCents,
      title: existing.title,
      description: existing.description,
    });

    if (!eligibility.ok) {
      return serviceError('FORBIDDEN', eligibility.message);
    }

    const { assertStoreCanPublishListing } = await import('@server/admin/plan-limits');
    const planOk = await assertStoreCanPublishListing(existing.storeId);

    if (!planOk.ok) {
      return planOk;
    }
  }

  const patch: Parameters<typeof listingsRepo.updateListingRow>[1] = {
    status: parsed.data.toStatus,
  };

  if (parsed.data.toStatus === LISTING_STATUS.PUBLISHED) {
    patch.publishedAt = existing.publishedAt ?? nowIso();
    patch.closedAt = null;
    /** Publicação manual/admin limpa hold de confirmação (não altera reserved/sold). */
    patch.availabilityHold = 'false';
  }

  if (parsed.data.toStatus === LISTING_STATUS.CLOSED) {
    patch.closedAt = nowIso();
  }

  const updated = await listingsRepo.updateListingRow(existing.id, patch);

  await auditListing(updated.storeId, actorUserId, 'listing.status_changed', updated.id, {
    from: existing.status,
    to: updated.status,
    source,
  });

  if (updated.status === LISTING_STATUS.PUBLISHED) {
    const { ensureAvailabilityCycleOnPublish } = await import(
      '@server/integrity/availability.service'
    );
    await ensureAvailabilityCycleOnPublish(updated.storeId, updated.vehicleId, actorUserId);
  }

  return serviceSuccess(updated);
}

export async function listStoreListings(
  storeId: string,
  actorUserId: string
): Promise<ServiceResult<ListingRow[]>> {
  const access = await authorizeStoreAction(actorUserId, storeId, PERMISSIONS.LISTINGS_READ);

  if (!access.ok) {
    return access;
  }

  const list = await listingsRepo.listListingsByStore(storeId);

  return serviceSuccess(list);
}

export async function getStoreListingDetail(
  storeId: string,
  listingId: string,
  actorUserId: string
): Promise<
  ServiceResult<{
    listing: ListingRow;
    vehicle: NonNullable<Awaited<ReturnType<typeof vehiclesRepo.findVehicleInStore>>>;
    history: AuditEventRow[];
    mediaIds: string[];
  }>
> {
  const access = await authorizeStoreAction(actorUserId, storeId, PERMISSIONS.LISTINGS_READ);

  if (!access.ok) {
    return access;
  }

  const listing = await listingsRepo.findListingInStore(storeId, listingId);

  if (!listing) {
    return serviceError('NOT_FOUND', 'Anúncio não encontrado nesta loja');
  }

  const vehicle = await vehiclesRepo.findVehicleInStore(storeId, listing.vehicleId);

  if (!vehicle) {
    return serviceError('NOT_FOUND', 'Veículo do anúncio não encontrado');
  }

  const storeEvents = await auditRepo.listAuditEventsByStore(storeId, 100);
  const history = storeEvents.filter(
    (event) => event.entityType === 'listing' && event.entityId === listing.id
  );

  let mediaIds: string[] = [];

  try {
    mediaIds = JSON.parse(listing.mediaIdsJson || '[]') as string[];
  } catch {
    mediaIds = [];
  }

  return serviceSuccess({ listing, vehicle, history, mediaIds });
}

export async function getListingBySlug(slug: string): Promise<ServiceResult<ListingRow>> {
  const listing = await listingsRepo.findListingBySlug(slug);

  if (!listing) {
    return serviceError('NOT_FOUND', 'Anúncio não encontrado');
  }

  return serviceSuccess(listing);
}

/** Catálogo público — marketplace e vitrine (mesma regra). */
export async function listPublicVehicleListings(limit = 100): Promise<VehicleListing[]> {
  const bundles = await listingsRepo.listPublishedListingBundles(limit);

  return bundles
    .map(mapListingBundleToVehicleListing)
    .filter((item) =>
      isListingRowPubliclyVisible({
        listingStatus: item.listingStatus,
        vehicleStatus: item.status,
        storeStatus: item.store.storeStatus ?? 'active',
      })
    );
}

export async function getPublicVehicleListingBySlug(
  slug: string
): Promise<VehicleListing | undefined> {
  const bundle = await listingsRepo.findListingBundleBySlug(slug);

  if (!bundle) {
    return undefined;
  }

  const mapped = mapListingBundleToVehicleListing(bundle);

  if (
    !isListingRowPubliclyVisible({
      listingStatus: mapped.listingStatus,
      vehicleStatus: mapped.status,
      storeStatus: mapped.store.storeStatus ?? 'active',
    })
  ) {
    return undefined;
  }

  return mapped;
}

export async function listPublicVehicleListingsByStoreSlug(
  storeSlug: string
): Promise<VehicleListing[]> {
  const all = await listPublicVehicleListings(200);

  return all.filter((item) => item.store.slug === storeSlug);
}

/** Ao vender veículo — encerra anúncio ativo (não remove do estoque). */
export async function closeListingsForSoldVehicle(
  vehicleId: string,
  actorUserId: string | null
): Promise<void> {
  const closed = await listingsRepo.closePublishedListingsForVehicle(vehicleId);

  for (const listing of closed) {
    await auditListing(listing.storeId, actorUserId, 'listing.status_changed', listing.id, {
      from: 'active',
      to: LISTING_STATUS.CLOSED,
      source: 'sale',
      reason: 'vehicle_sold',
    });
  }
}

/** Loja suspensa — marca anúncios ativos como suspensos. */
export async function suspendListingsForStore(
  storeId: string,
  actorUserId: string | null
): Promise<number> {
  const count = await listingsRepo.suspendActiveListingsForStore(storeId);

  if (count > 0) {
    await auditRepo.insertAuditEvent({
      storeId,
      actorUserId,
      action: 'listing.store_suspended_cascade',
      entityType: 'store',
      entityId: storeId,
      payloadJson: JSON.stringify({ suspendedListings: count }),
    });
  }

  return count;
}
