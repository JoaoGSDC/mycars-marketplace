import { LISTING_REPORT_STATUS, PLATFORM_PERMISSIONS } from '@app-types/platform';
import { LISTING_STATUS } from '@app-types/status';
import { nowIso, type ListingRow } from '@lib/db';
import { assertPlatformPermission } from '@server/auth/platform-admin';
import { canAdminTransitionListing } from '@server/listings/listing-eligibility';
import * as auditRepo from '@server/repositories/audit-events.repository';
import * as listingsRepo from '@server/repositories/listings.repository';
import * as reportsRepo from '@server/repositories/listing-reports.repository';
import * as storesRepo from '@server/repositories/stores.repository';
import * as vehiclesRepo from '@server/repositories/vehicles.repository';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';

import {
  adminListingSearchSchema,
  createListingReportSchema,
  moderateListingSchema,
  resolveListingReportSchema,
  type AdminListingSearchInput,
  type CreateListingReportInput,
  type ModerateListingInput,
  type ResolveListingReportInput,
} from './admin.validators';

export async function searchListingsForAdmin(
  raw: AdminListingSearchInput,
  actorUserId: string
) {
  const access = await assertPlatformPermission(
    actorUserId,
    PLATFORM_PERMISSIONS.LISTINGS_MODERATE
  );

  if (!access.ok) {
    return access;
  }

  const parsed = adminListingSearchSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Filtros inválidos');
  }

  const result = await listingsRepo.searchAdminListings(parsed.data);

  return serviceSuccess({
    ...result,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
  });
}

export async function getListingAdminDetail(listingId: string, actorUserId: string) {
  const access = await assertPlatformPermission(
    actorUserId,
    PLATFORM_PERMISSIONS.LISTINGS_MODERATE
  );

  if (!access.ok) {
    return access;
  }

  const listing = await listingsRepo.findListingById(listingId);

  if (!listing) {
    return serviceError('NOT_FOUND', 'Anúncio não encontrado');
  }

  const [store, vehicle] = await Promise.all([
    storesRepo.findStoreById(listing.storeId),
    vehiclesRepo.findVehicleInStore(listing.storeId, listing.vehicleId),
  ]);

  if (!store || !vehicle) {
    return serviceError('NOT_FOUND', 'Dados do anunciante incompletos');
  }

  const audit = (await auditRepo.listAuditEventsByStore(listing.storeId, 80)).filter(
    (event) => event.entityType === 'listing' && event.entityId === listing.id
  );

  return serviceSuccess({ listing, store, vehicle, audit });
}

export async function moderateListingAdmin(
  raw: ModerateListingInput,
  actorUserId: string
): Promise<ServiceResult<ListingRow>> {
  const access = await assertPlatformPermission(
    actorUserId,
    PLATFORM_PERMISSIONS.LISTINGS_MODERATE
  );

  if (!access.ok) {
    return access;
  }

  const parsed = moderateListingSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const listing = await listingsRepo.findListingById(parsed.data.listingId);

  if (!listing) {
    return serviceError('NOT_FOUND', 'Anúncio não encontrado');
  }

  if (!canAdminTransitionListing(listing.status, parsed.data.toStatus)) {
    return serviceError(
      'CONFLICT',
      `Transição administrativa ${listing.status} → ${parsed.data.toStatus} não permitida`
    );
  }

  if (parsed.data.toStatus === LISTING_STATUS.PUBLISHED) {
    const { assertStoreCanPublishListing } = await import('@server/admin/plan-limits');
    const planOk = await assertStoreCanPublishListing(listing.storeId);

    if (!planOk.ok) {
      return planOk;
    }
  }

  const patch: Parameters<typeof listingsRepo.updateListingRow>[1] = {
    status: parsed.data.toStatus,
  };

  if (parsed.data.toStatus === LISTING_STATUS.PUBLISHED) {
    patch.publishedAt = listing.publishedAt ?? nowIso();
    patch.closedAt = null;
  }

  const updated = await listingsRepo.updateListingRow(listing.id, patch);

  await auditRepo.insertAuditEvent({
    storeId: listing.storeId,
    actorUserId,
    action: 'listing.admin_moderated',
    entityType: 'listing',
    entityId: listing.id,
    payloadJson: JSON.stringify({
      from: listing.status,
      to: updated.status,
      reason: parsed.data.reason,
    }),
  });

  return serviceSuccess(updated);
}

export async function createListingReportAdmin(
  raw: CreateListingReportInput,
  actorUserId: string
) {
  const access = await assertPlatformPermission(actorUserId, PLATFORM_PERMISSIONS.REPORTS_MANAGE);

  if (!access.ok) {
    return access;
  }

  const parsed = createListingReportSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const listing = await listingsRepo.findListingById(parsed.data.listingId);

  if (!listing) {
    return serviceError('NOT_FOUND', 'Anúncio não encontrado');
  }

  const report = await reportsRepo.insertListingReport({
    storeId: listing.storeId,
    listingId: listing.id,
    reporterUserId: actorUserId,
    reporterEmail: parsed.data.reporterEmail ?? null,
    reason: parsed.data.reason,
    status: LISTING_REPORT_STATUS.OPEN,
    resolutionNotes: null,
    resolvedByUserId: null,
    resolvedAt: null,
  });

  await auditRepo.insertAuditEvent({
    storeId: listing.storeId,
    actorUserId,
    action: 'listing_report.created',
    entityType: 'listing_report',
    entityId: report.id,
    payloadJson: JSON.stringify({ listingId: listing.id, reason: parsed.data.reason }),
  });

  return serviceSuccess(report);
}

export async function listListingReportsAdmin(
  raw: { status?: string; page?: number; pageSize?: number },
  actorUserId: string
) {
  const access = await assertPlatformPermission(actorUserId, PLATFORM_PERMISSIONS.REPORTS_MANAGE);

  if (!access.ok) {
    return access;
  }

  const page = raw.page ?? 1;
  const pageSize = raw.pageSize ?? 20;
  const result = await reportsRepo.searchListingReports({
    status: raw.status,
    page,
    pageSize,
  });

  return serviceSuccess({ ...result, page, pageSize });
}

export async function resolveListingReportAdmin(
  raw: ResolveListingReportInput,
  actorUserId: string
) {
  const access = await assertPlatformPermission(actorUserId, PLATFORM_PERMISSIONS.REPORTS_MANAGE);

  if (!access.ok) {
    return access;
  }

  const parsed = resolveListingReportSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const report = await reportsRepo.findListingReportById(parsed.data.reportId);

  if (!report) {
    return serviceError('NOT_FOUND', 'Denúncia não encontrada');
  }

  const updated = await reportsRepo.updateListingReport(report.id, {
    status: parsed.data.status,
    resolutionNotes: parsed.data.resolutionNotes,
    resolvedByUserId: actorUserId,
    resolvedAt: nowIso(),
  });

  if (parsed.data.suspendListing) {
    await moderateListingAdmin(
      {
        listingId: report.listingId,
        toStatus: LISTING_STATUS.SUSPENDED,
        reason: parsed.data.resolutionNotes,
      },
      actorUserId
    );
  }

  await auditRepo.insertAuditEvent({
    storeId: report.storeId,
    actorUserId,
    action: 'listing_report.resolved',
    entityType: 'listing_report',
    entityId: report.id,
    payloadJson: JSON.stringify({
      status: parsed.data.status,
      suspendListing: parsed.data.suspendListing,
    }),
  });

  return serviceSuccess(updated);
}
