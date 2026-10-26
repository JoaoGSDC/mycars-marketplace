import { and, eq } from 'drizzle-orm';

import { ACTIVITY_TYPES } from '@app-types/crm';
import { VEHICLE_OWNERSHIP } from '@app-types/membership';
import { membershipGrantsPermission, PERMISSIONS } from '@app-types/permissions';
import { SALE_EVENT_TYPES } from '@app-types/sale';
import {
  LISTING_STATUS,
  OPPORTUNITY_STATUS,
  RESERVATION_STATUS,
  SALE_STATUS,
  VEHICLE_STATUS,
} from '@app-types/status';
import {
  createId,
  getDb,
  listings,
  nowIso,
  opportunities,
  reservationEvents,
  vehicles,
  type SaleRow,
} from '@lib/db';
import { authorizeStoreAction } from '@server/auth/access';
import * as auditRepo from '@server/repositories/audit-events.repository';
import * as costsRepo from '@server/repositories/vehicle-costs.repository';
import * as customersRepo from '@server/repositories/customers.repository';
import * as listingsRepo from '@server/repositories/listings.repository';
import * as membershipsRepo from '@server/repositories/store-memberships.repository';
import * as opportunitiesRepo from '@server/repositories/opportunities.repository';
import * as activitiesRepo from '@server/repositories/opportunity-activities.repository';
import * as reservationsRepo from '@server/repositories/reservations.repository';
import * as salesRepo from '@server/repositories/sales.repository';
import * as vehiclesRepo from '@server/repositories/vehicles.repository';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';
import { canTransitionVehicleStatus } from '@server/vehicles/vehicle-status';

import {
  cancelSaleSchema,
  createSaleSchema,
  searchSalesSchema,
  type CancelSaleInput,
  type CreateSaleInput,
  type SearchSalesInput,
} from './sales.validators';

function boolText(value: boolean): string {
  return value ? 'true' : 'false';
}

async function assertSellerInStore(
  storeId: string,
  sellerUserId: string
): Promise<ServiceResult<true>> {
  const membership = await membershipsRepo.findMembership(storeId, sellerUserId);

  if (!membership || membership.status !== 'active') {
    return serviceError('VALIDATION', 'Vendedor precisa ser membro ativo da loja');
  }

  return serviceSuccess(true);
}

function computeGrossResult(params: {
  ownership: string;
  negotiatedPriceCents: number;
  costsCents: number;
  costsIncomplete: boolean;
}): number | null {
  if (params.ownership === VEHICLE_OWNERSHIP.CONSIGNED) {
    /** Consignado: sem base de aquisição da loja — não exibir como lucro. */
    return null;
  }

  if (params.costsIncomplete) {
    return null;
  }

  return params.negotiatedPriceCents - params.costsCents;
}

export async function createSale(
  raw: CreateSaleInput,
  actorUserId: string
): Promise<ServiceResult<SaleRow>> {
  const parsed = createSaleSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;
  const access = await authorizeStoreAction(actorUserId, data.storeId, PERMISSIONS.SALES_WRITE);

  if (!access.ok) {
    return access;
  }

  const sellerUserId = data.sellerUserId ?? actorUserId;
  const sellerOk = await assertSellerInStore(data.storeId, sellerUserId);

  if (!sellerOk.ok) {
    return sellerOk;
  }

  const customer = await customersRepo.findCustomerInStore(data.storeId, data.customerId);

  if (!customer) {
    return serviceError('NOT_FOUND', 'Cliente não encontrado nesta loja');
  }

  const vehicle = await vehiclesRepo.findVehicleInStore(data.storeId, data.vehicleId);

  if (!vehicle) {
    return serviceError('NOT_FOUND', 'Veículo não encontrado nesta loja');
  }

  if (
    vehicle.status !== VEHICLE_STATUS.AVAILABLE &&
    vehicle.status !== VEHICLE_STATUS.RESERVED
  ) {
    return serviceError(
      'CONFLICT',
      'Somente veículos disponíveis ou reservados podem ser vendidos'
    );
  }

  if (!canTransitionVehicleStatus(vehicle.status, VEHICLE_STATUS.SOLD, 'sale')) {
    return serviceError('CONFLICT', 'Transição para vendido não permitida');
  }

  const existingSale = await salesRepo.findCompletedSaleForVehicle(data.vehicleId);

  if (existingSale) {
    return serviceError('CONFLICT', 'Este veículo já possui uma venda concluída');
  }

  if (data.opportunityId) {
    const opportunity = await opportunitiesRepo.findOpportunityInStore(
      data.storeId,
      data.opportunityId
    );

    if (!opportunity) {
      return serviceError('NOT_FOUND', 'Oportunidade não encontrada nesta loja');
    }

    if (opportunity.vehicleId && opportunity.vehicleId !== data.vehicleId) {
      return serviceError(
        'VALIDATION',
        'O veículo da venda deve coincidir com o da oportunidade'
      );
    }
  }

  const listing = await listingsRepo.findListingByVehicleId(data.vehicleId);
  const listedPriceCents = listing?.priceCents ?? vehicle.askingPriceCents ?? null;

  const costRows = await costsRepo.listCostsByVehicle(data.storeId, data.vehicleId);
  const costsCents = await costsRepo.sumCostsByVehicle(data.storeId, data.vehicleId);
  const costsIncomplete =
    vehicle.ownership === VEHICLE_OWNERSHIP.OWN
      ? costRows.length === 0
      : false;

  const hasTradeIn = Boolean(data.hasTradeIn);
  const grossResultCents = computeGrossResult({
    ownership: vehicle.ownership,
    negotiatedPriceCents: data.negotiatedPriceCents,
    costsCents,
    costsIncomplete,
  });

  const soldAt = data.soldAt ? new Date(data.soldAt).toISOString() : nowIso();

  if (Number.isNaN(new Date(soldAt).getTime())) {
    return serviceError('VALIDATION', 'Data da venda inválida');
  }

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const created = await getDb().transaction(async (tx) => {
        const freshVehicle = await tx
          .select()
          .from(vehicles)
          .where(and(eq(vehicles.storeId, data.storeId), eq(vehicles.id, data.vehicleId)))
          .limit(1)
          .then((rows) => rows[0]);

        if (!freshVehicle) {
          throw Object.assign(new Error('Veículo não encontrado nesta loja'), { code: 'NOT_FOUND' });
        }

        if (
          freshVehicle.status !== VEHICLE_STATUS.AVAILABLE &&
          freshVehicle.status !== VEHICLE_STATUS.RESERVED
        ) {
          throw Object.assign(
            new Error('Somente veículos disponíveis ou reservados podem ser vendidos'),
            { code: 'CONFLICT' }
          );
        }

        const alreadySold = await salesRepo.findCompletedSaleForVehicle(data.vehicleId, tx);

        if (alreadySold) {
          throw Object.assign(new Error('Este veículo já possui uma venda concluída'), {
            code: 'CONFLICT',
          });
        }

        const sale = await salesRepo.insertSale(
          {
            storeId: data.storeId,
            vehicleId: data.vehicleId,
            customerId: data.customerId,
            sellerUserId,
            opportunityId: data.opportunityId ?? null,
            soldAt,
            listedPriceCents,
            negotiatedPriceCents: data.negotiatedPriceCents,
            costsCents,
            costsIncomplete: boolText(costsIncomplete),
            grossResultCents,
            modality: data.modality,
            ownership: freshVehicle.ownership,
            hasTradeIn: boolText(hasTradeIn),
            tradeInDescription: hasTradeIn ? (data.tradeInDescription?.trim() ?? null) : null,
            notes: data.notes ?? null,
            status: SALE_STATUS.COMPLETED,
            cancelReason: null,
            cancelledAt: null,
            cancelledByUserId: null,
            createdByUserId: actorUserId,
          },
          tx
        );

        await tx
          .update(vehicles)
          .set({ status: VEHICLE_STATUS.SOLD, isDraft: 'false', updatedAt: nowIso() })
          .where(eq(vehicles.id, freshVehicle.id));

        const activeReservation = await reservationsRepo.findActiveReservationForVehicle(
          data.vehicleId,
          tx
        );

        if (activeReservation && activeReservation.storeId === data.storeId) {
          await reservationsRepo.updateReservation(
            activeReservation.id,
            { status: RESERVATION_STATUS.COMPLETED },
            tx
          );
          await tx.insert(reservationEvents).values({
            id: createId(),
            storeId: data.storeId,
            reservationId: activeReservation.id,
            type: 'completed',
            body: 'Reserva concluída pela venda do veículo',
            actorUserId,
            metadataJson: JSON.stringify({ saleId: sale.id, vehicleId: data.vehicleId }),
            createdAt: nowIso(),
            updatedAt: nowIso(),
          });
        }

        const listingRow = await tx
          .select()
          .from(listings)
          .where(eq(listings.vehicleId, data.vehicleId))
          .limit(1)
          .then((rows) => rows[0]);

        if (
          listingRow &&
          (listingRow.status === LISTING_STATUS.PUBLISHED ||
            listingRow.status === LISTING_STATUS.PAUSED ||
            listingRow.status === LISTING_STATUS.DRAFT)
        ) {
          await tx
            .update(listings)
            .set({
              status: LISTING_STATUS.CLOSED,
              closedAt: nowIso(),
              updatedAt: nowIso(),
            })
            .where(eq(listings.id, listingRow.id));
        }

        if (data.opportunityId) {
          const opportunity = await tx
            .select()
            .from(opportunities)
            .where(
              and(
                eq(opportunities.storeId, data.storeId),
                eq(opportunities.id, data.opportunityId)
              )
            )
            .limit(1)
            .then((rows) => rows[0]);

          if (opportunity && opportunity.stage !== OPPORTUNITY_STATUS.WON) {
            await tx
              .update(opportunities)
              .set({
                stage: OPPORTUNITY_STATUS.WON,
                closedAt: nowIso(),
                resultNotes: opportunity.resultNotes ?? 'Venda registrada',
                updatedAt: nowIso(),
              })
              .where(eq(opportunities.id, opportunity.id));
          }
        }

        await salesRepo.insertSaleEvent(
          {
            storeId: data.storeId,
            saleId: sale.id,
            type: SALE_EVENT_TYPES.CREATED,
            body: `Venda registrada · R$ ${(data.negotiatedPriceCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            actorUserId,
            metadataJson: JSON.stringify({
              vehicleId: data.vehicleId,
              customerId: data.customerId,
              modality: data.modality,
              hasTradeIn,
            }),
          },
          tx
        );

        return { sale, listingId: listingRow?.id ?? null, reservationId: activeReservation?.id ?? null };
      });

      if (data.opportunityId) {
        await activitiesRepo.insertActivity({
          storeId: data.storeId,
          opportunityId: data.opportunityId,
          type: ACTIVITY_TYPES.STAGE_CHANGE,
          body: 'Oportunidade ganha · venda registrada',
          actorUserId,
          metadataJson: JSON.stringify({
            saleId: created.sale.id,
            to: OPPORTUNITY_STATUS.WON,
          }),
        });
      }

      await auditRepo.insertAuditEvent({
        storeId: data.storeId,
        actorUserId,
        action: 'sale.created',
        entityType: 'sale',
        entityId: created.sale.id,
        payloadJson: JSON.stringify({
          vehicleId: data.vehicleId,
          customerId: data.customerId,
          negotiatedPriceCents: data.negotiatedPriceCents,
          opportunityId: data.opportunityId ?? null,
          listingId: created.listingId,
          reservationId: created.reservationId,
        }),
      });

      if (created.listingId) {
        await auditRepo.insertAuditEvent({
          storeId: data.storeId,
          actorUserId,
          action: 'listing.status_changed',
          entityType: 'listing',
          entityId: created.listingId,
          payloadJson: JSON.stringify({
            to: LISTING_STATUS.CLOSED,
            source: 'sale',
            saleId: created.sale.id,
          }),
        });
      }

      return serviceSuccess(created.sale);
    } catch (error) {
      const code = (error as { code?: string }).code;
      const message = error instanceof Error ? error.message : 'Falha ao registrar venda';

      if (code === 'NOT_FOUND' || code === 'CONFLICT' || code === 'VALIDATION') {
        return serviceError(code, message);
      }

      const rawMessage = String(
        (error as { message?: string }).message ??
          (error as { cause?: { message?: string } }).cause?.message ??
          message
      ).toLowerCase();

      if (
        rawMessage.includes('unique') ||
        rawMessage.includes('constraint') ||
        rawMessage.includes('sales_vehicle_completed_uidx')
      ) {
        return serviceError('CONFLICT', 'Este veículo já possui uma venda concluída');
      }

      const isBusy =
        rawMessage.includes('busy') ||
        rawMessage.includes('locked') ||
        rawMessage.includes('database is locked');

      if (isBusy && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 25 * attempt));
        continue;
      }

      const existing = await salesRepo.findCompletedSaleForVehicle(data.vehicleId);

      if (existing) {
        return serviceError('CONFLICT', 'Este veículo já possui uma venda concluída');
      }

      const vehicleNow = await vehiclesRepo.findVehicleInStore(data.storeId, data.vehicleId);

      if (
        vehicleNow &&
        vehicleNow.status !== VEHICLE_STATUS.AVAILABLE &&
        vehicleNow.status !== VEHICLE_STATUS.RESERVED
      ) {
        return serviceError(
          'CONFLICT',
          'Somente veículos disponíveis ou reservados podem ser vendidos'
        );
      }

      return serviceError('INTERNAL', 'Não foi possível registrar a venda');
    }
  }

  return serviceError('INTERNAL', 'Não foi possível registrar a venda');
}

export async function cancelSale(
  raw: CancelSaleInput,
  actorUserId: string
): Promise<ServiceResult<SaleRow>> {
  const parsed = cancelSaleSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;
  const access = await authorizeStoreAction(actorUserId, data.storeId, PERMISSIONS.SALES_WRITE);

  if (!access.ok) {
    return access;
  }

  try {
    const updated = await getDb().transaction(async (tx) => {
      const current = await salesRepo.findSaleInStore(data.storeId, data.saleId, tx);

      if (!current) {
        throw Object.assign(new Error('Venda não encontrada'), { code: 'NOT_FOUND' });
      }

      if (current.status !== SALE_STATUS.COMPLETED) {
        throw Object.assign(new Error('Somente vendas concluídas podem ser canceladas'), {
          code: 'CONFLICT',
        });
      }

      const cancelled = await salesRepo.updateSale(
        current.id,
        {
          status: SALE_STATUS.CANCELLED,
          cancelReason: data.reason.trim(),
          cancelledAt: nowIso(),
          cancelledByUserId: actorUserId,
        },
        tx
      );

      await salesRepo.insertSaleEvent(
        {
          storeId: data.storeId,
          saleId: current.id,
          type: SALE_EVENT_TYPES.CANCELLED,
          body: `Estorno: ${data.reason.trim()}`,
          actorUserId,
          metadataJson: JSON.stringify({ reason: data.reason.trim() }),
        },
        tx
      );

      const stillCompleted = await salesRepo.findCompletedSaleForVehicle(current.vehicleId, tx);

      if (!stillCompleted) {
        const vehicle = await tx
          .select()
          .from(vehicles)
          .where(eq(vehicles.id, current.vehicleId))
          .limit(1)
          .then((rows) => rows[0]);

        if (vehicle && vehicle.status === VEHICLE_STATUS.SOLD) {
          await tx
            .update(vehicles)
            .set({ status: VEHICLE_STATUS.AVAILABLE, updatedAt: nowIso() })
            .where(eq(vehicles.id, vehicle.id));
        }
      }

      return cancelled;
    });

    if (updated.opportunityId) {
      await activitiesRepo.insertActivity({
        storeId: data.storeId,
        opportunityId: updated.opportunityId,
        type: ACTIVITY_TYPES.NOTE,
        body: `Venda estornada: ${data.reason.trim()}`,
        actorUserId,
        metadataJson: JSON.stringify({ saleId: updated.id }),
      });
    }

    await auditRepo.insertAuditEvent({
      storeId: data.storeId,
      actorUserId,
      action: 'sale.cancelled',
      entityType: 'sale',
      entityId: updated.id,
      payloadJson: JSON.stringify({
        reason: data.reason.trim(),
        vehicleId: updated.vehicleId,
      }),
    });

    return serviceSuccess(updated);
  } catch (error) {
    const code = (error as { code?: string }).code;
    const message = error instanceof Error ? error.message : 'Falha ao cancelar venda';

    if (code === 'NOT_FOUND' || code === 'CONFLICT') {
      return serviceError(code, message);
    }

    return serviceError('INTERNAL', 'Não foi possível cancelar a venda');
  }
}

export async function searchSales(
  raw: SearchSalesInput,
  actorUserId: string
): Promise<
  ServiceResult<{
    items: Awaited<ReturnType<typeof salesRepo.searchSalesInStore>>['items'];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    statusCounts: Record<string, number>;
    completedVolumeCents: number;
  }>
> {
  const parsed = searchSalesSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;
  const access = await authorizeStoreAction(actorUserId, data.storeId, PERMISSIONS.SALES_READ);

  if (!access.ok) {
    return access;
  }

  const [result, statusCounts, completedVolumeCents] = await Promise.all([
    salesRepo.searchSalesInStore(data),
    salesRepo.countSalesByStatus(data.storeId),
    salesRepo.sumCompletedNegotiatedCents(data.storeId, data.from, data.to),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / data.pageSize));

  return serviceSuccess({
    items: result.items,
    total: result.total,
    page: data.page,
    pageSize: data.pageSize,
    totalPages,
    statusCounts,
    completedVolumeCents,
  });
}

export async function getSaleDetail(
  storeId: string,
  saleId: string,
  actorUserId: string
): Promise<
  ServiceResult<{
    sale: NonNullable<Awaited<ReturnType<typeof salesRepo.findSaleListItem>>>;
    events: Awaited<ReturnType<typeof salesRepo.listEventsForSale>>;
    canViewCosts: boolean;
  }>
> {
  const access = await authorizeStoreAction(actorUserId, storeId, PERMISSIONS.SALES_READ);

  if (!access.ok) {
    return access;
  }

  const sale = await salesRepo.findSaleListItem(storeId, saleId);

  if (!sale) {
    return serviceError('NOT_FOUND', 'Venda não encontrada');
  }

  const events = await salesRepo.listEventsForSale(storeId, saleId);
  const canViewCosts = membershipGrantsPermission(
    access.data.role,
    access.data.membership.permissionsJson,
    PERMISSIONS.COSTS_READ
  );

  const safeSale = canViewCosts
    ? sale
    : {
        ...sale,
        costsCents: 0,
        costsIncomplete: 'true',
        grossResultCents: null,
      };

  return serviceSuccess({ sale: safeSale, events, canViewCosts });
}

export async function getCompletedSaleForVehicle(
  storeId: string,
  vehicleId: string,
  actorUserId: string
): Promise<ServiceResult<SaleRow | null>> {
  const access = await authorizeStoreAction(actorUserId, storeId, PERMISSIONS.SALES_READ);

  if (!access.ok) {
    return access;
  }

  const sale = await salesRepo.findCompletedSaleForVehicle(vehicleId);

  return serviceSuccess(sale && sale.storeId === storeId ? sale : null);
}
