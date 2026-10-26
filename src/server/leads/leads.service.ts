import { createHash } from 'node:crypto';

import { ENGAGEMENT_EVENT_TYPES } from '@app-types/crm';
import { OPPORTUNITY_STATUS } from '@app-types/status';
import { isPubliclyListable } from '@lib/catalog/is-publicly-listable';
import { mapListingBundleToVehicleListing } from '@server/listings/listing-mapper';
import { createOpportunityFromPublicLead } from '@server/crm/opportunities.service';
import * as auditRepo from '@server/repositories/audit-events.repository';
import * as engagementRepo from '@server/repositories/listing-engagement.repository';
import * as leadsRepo from '@server/repositories/listing-leads.repository';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';
import * as detailRepo from '@server/catalog/public-detail.repository';
import * as searchRepo from '@server/catalog/public-search.repository';

import {
  createListingLeadSchema,
  registerWhatsAppClickSchema,
  type CreateListingLeadInput,
  type RegisterWhatsAppClickInput,
} from './leads.validators';

const MIN_FORM_MS = 2_000;
const MAX_LEADS_PER_IP_HOUR = 8;
const MAX_LEADS_PER_LISTING_IP_HOUR = 3;
const MAX_WHATSAPP_CLICKS_PER_LISTING_IP_HOUR = 12;

function hashIp(ip: string | null | undefined): string | null {
  if (!ip) {
    return null;
  }

  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

export async function createListingLead(
  raw: CreateListingLeadInput,
  meta: { ip?: string | null; userAgent?: string | null }
): Promise<ServiceResult<{ id: string; opportunityId: string }>> {
  const parsed = createListingLeadSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;

  if (data.company) {
    return serviceSuccess({ id: 'ignored', opportunityId: 'ignored' });
  }

  const elapsed = Date.now() - data.formOpenedAt;

  if (elapsed < MIN_FORM_MS || elapsed > 1000 * 60 * 60 * 6) {
    return serviceError('VALIDATION', 'Não foi possível enviar. Tente novamente.');
  }

  const row = await detailRepo.findListingBundleBySlug(data.listingSlug);

  if (!row) {
    return serviceError('NOT_FOUND', 'Anúncio não encontrado');
  }

  const mediaMap = await searchRepo.selectPrimaryMediaForVehicles([row.vehicle.id]);
  const mapped = mapListingBundleToVehicleListing({
    listing: row.listing,
    vehicle: row.vehicle,
    store: row.store,
    media: mediaMap.get(row.vehicle.id) ?? [],
  });

  if (!isPubliclyListable(mapped)) {
    return serviceError('CONFLICT', 'Este anúncio não está disponível para contato');
  }

  if (mapped.status === 'sold') {
    return serviceError('CONFLICT', 'Este veículo já foi vendido');
  }

  const ipHash =
    hashIp(meta.ip) ??
    hashIp(`anon:${row.listing.id}:${(meta.userAgent ?? 'ua').slice(0, 120)}`);
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  if (!ipHash) {
    return serviceError('FORBIDDEN', 'Não foi possível validar a solicitação. Tente mais tarde.');
  }

  const [globalCount, listingCount] = await Promise.all([
    leadsRepo.countLeadsByIpSince(ipHash, since),
    leadsRepo.countLeadsByListingSince(row.listing.id, ipHash, since),
  ]);

  if (globalCount >= MAX_LEADS_PER_IP_HOUR || listingCount >= MAX_LEADS_PER_LISTING_IP_HOUR) {
    return serviceError('FORBIDDEN', 'Muitas mensagens em pouco tempo. Tente mais tarde.');
  }

  const lead = await leadsRepo.insertListingLead({
    storeId: row.store.id,
    listingId: row.listing.id,
    vehicleId: row.vehicle.id,
    name: data.name,
    email: data.email ?? null,
    phone: data.phone.replace(/\s+/g, ''),
    message: data.message,
    source: data.source,
    originPath: data.originPath,
    listingSlug: data.listingSlug,
    ipHash,
    userAgent: meta.userAgent?.slice(0, 300) ?? null,
    status: OPPORTUNITY_STATUS.NEW_LEAD,
  });

  const opportunity = await createOpportunityFromPublicLead({
    storeId: row.store.id,
    listingLeadId: lead.id,
    listingId: row.listing.id,
    vehicleId: row.vehicle.id,
    name: data.name,
    phone: data.phone,
    email: data.email,
    message: data.message,
    originPath: data.originPath,
  });

  await auditRepo.insertAuditEvent({
    storeId: row.store.id,
    actorUserId: null,
    action: 'listing.lead_created',
    entityType: 'listing_lead',
    entityId: lead.id,
    payloadJson: JSON.stringify({
      listingId: row.listing.id,
      source: data.source,
      originPath: data.originPath,
      opportunityId: opportunity.id,
    }),
  });

  return serviceSuccess({ id: lead.id, opportunityId: opportunity.id });
}

/**
 * Clique em WhatsApp ≠ lead confirmado.
 * Persiste apenas evento de engajamento (sem cliente/oportunidade).
 */
export async function registerWhatsAppClick(
  raw: RegisterWhatsAppClickInput,
  meta: { ip?: string | null; userAgent?: string | null }
): Promise<ServiceResult<{ id: string }>> {
  const parsed = registerWhatsAppClickSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;
  const row = await detailRepo.findListingBundleBySlug(data.listingSlug);

  if (!row) {
    return serviceError('NOT_FOUND', 'Anúncio não encontrado');
  }

  const mediaMap = await searchRepo.selectPrimaryMediaForVehicles([row.vehicle.id]);
  const mapped = mapListingBundleToVehicleListing({
    listing: row.listing,
    vehicle: row.vehicle,
    store: row.store,
    media: mediaMap.get(row.vehicle.id) ?? [],
  });

  if (!isPubliclyListable(mapped) || mapped.status === 'sold') {
    return serviceError('CONFLICT', 'Este anúncio não está disponível para contato');
  }

  const ipHash =
    hashIp(meta.ip) ??
    hashIp(`anon:${row.listing.id}:${(meta.userAgent ?? 'ua').slice(0, 120)}`);
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  if (ipHash) {
    const listingCount = await engagementRepo.countEngagementByListingSince(
      row.listing.id,
      ipHash,
      since
    );

    if (listingCount >= MAX_WHATSAPP_CLICKS_PER_LISTING_IP_HOUR) {
      return serviceSuccess({ id: 'rate-limited' });
    }
  }

  const event = await engagementRepo.insertEngagementEvent({
    storeId: row.store.id,
    listingId: row.listing.id,
    vehicleId: row.vehicle.id,
    listingSlug: data.listingSlug,
    eventType: ENGAGEMENT_EVENT_TYPES.WHATSAPP_CLICK,
    originPath: data.originPath,
    ipHash,
    userAgent: meta.userAgent?.slice(0, 300) ?? null,
  });

  await auditRepo.insertAuditEvent({
    storeId: row.store.id,
    actorUserId: null,
    action: 'listing.whatsapp_click',
    entityType: 'listing_engagement_event',
    entityId: event.id,
    payloadJson: JSON.stringify({
      listingId: row.listing.id,
      originPath: data.originPath,
    }),
  });

  return serviceSuccess({ id: event.id });
}
