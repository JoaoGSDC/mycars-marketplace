import { and, eq } from 'drizzle-orm';

import { RESERVATION_EVENT_TYPES } from '@app-types/reservation';
import { PERMISSIONS } from '@app-types/permissions';
import { RESERVATION_STATUS, VEHICLE_STATUS } from '@app-types/status';
import {
  getDb,
  nowIso,
  vehicles,
  type ReservationRow,
} from '@lib/db';
import { authorizeStoreAction } from '@server/auth/access';
import * as auditRepo from '@server/repositories/audit-events.repository';
import * as customersRepo from '@server/repositories/customers.repository';
import * as membershipsRepo from '@server/repositories/store-memberships.repository';
import * as opportunitiesRepo from '@server/repositories/opportunities.repository';
import * as reservationsRepo from '@server/repositories/reservations.repository';
import * as vehiclesRepo from '@server/repositories/vehicles.repository';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';
import { canTransitionVehicleStatus } from '@server/vehicles/vehicle-status';

import {
  cancelReservationSchema,
  createReservationSchema,
  extendReservationSchema,
  searchReservationsSchema,
  type CancelReservationInput,
  type CreateReservationInput,
  type ExtendReservationInput,
  type SearchReservationsInput,
} from './reservations.validators';

/**
 * Expira reservas vencidas de forma idempotente (serverless-friendly).
 * Libera o veículo se não houver outra reserva ativa.
 */
export async function expireDueReservations(options: {
  storeId?: string;
  vehicleId?: string;
  limit?: number;
  actorUserId?: string | null;
} = {}): Promise<{ expiredIds: string[] }> {
  const stamp = nowIso();
  const due = await reservationsRepo.listDueActiveReservations({
    nowIso: stamp,
    storeId: options.storeId,
    vehicleId: options.vehicleId,
    limit: options.limit ?? 100,
  });

  const expiredIds: string[] = [];

  for (const reservation of due) {
    try {
      await getDb().transaction(async (tx) => {
        const current = await reservationsRepo.findReservationById(reservation.id, tx);

        if (!current || current.status !== RESERVATION_STATUS.ACTIVE) {
          return;
        }

        if (current.expiresAt >= stamp) {
          return;
        }

        await reservationsRepo.updateReservation(
          current.id,
          { status: RESERVATION_STATUS.EXPIRED },
          tx
        );

        await reservationsRepo.insertReservationEvent(
          {
            storeId: current.storeId,
            reservationId: current.id,
            type: RESERVATION_EVENT_TYPES.EXPIRED,
            body: 'Reserva expirada automaticamente pelo prazo de validade',
            actorUserId: options.actorUserId ?? null,
            metadataJson: JSON.stringify({ expiresAt: current.expiresAt }),
          },
          tx
        );

        const stillActive = await reservationsRepo.findActiveReservationForVehicle(
          current.vehicleId,
          tx
        );

        if (!stillActive) {
          const vehicle = await tx
            .select()
            .from(vehicles)
            .where(eq(vehicles.id, current.vehicleId))
            .limit(1)
            .then((rows) => rows[0]);

          if (
            vehicle &&
            vehicle.status === VEHICLE_STATUS.RESERVED &&
            canTransitionVehicleStatus(
              vehicle.status,
              VEHICLE_STATUS.AVAILABLE,
              'reservation'
            )
          ) {
            await tx
              .update(vehicles)
              .set({ status: VEHICLE_STATUS.AVAILABLE, updatedAt: nowIso() })
              .where(eq(vehicles.id, vehicle.id));
          }
        }
      });

      expiredIds.push(reservation.id);

      await auditRepo.insertAuditEvent({
        storeId: reservation.storeId,
        actorUserId: options.actorUserId ?? null,
        action: 'reservation.expired',
        entityType: 'reservation',
        entityId: reservation.id,
        payloadJson: JSON.stringify({
          vehicleId: reservation.vehicleId,
          expiresAt: reservation.expiresAt,
        }),
      });
    } catch {
      // idempotente: outra instância pode ter processado o mesmo id
    }
  }

  return { expiredIds };
}

async function assertAssigneeInStore(
  storeId: string,
  assigneeUserId: string
): Promise<ServiceResult<true>> {
  const membership = await membershipsRepo.findMembership(storeId, assigneeUserId);

  if (!membership || membership.status !== 'active') {
    return serviceError('VALIDATION', 'Responsável precisa ser membro ativo da loja');
  }

  return serviceSuccess(true);
}

function resolveExpiresAt(data: CreateReservationInput): string {
  if (data.expiresAt) {
    return new Date(data.expiresAt).toISOString();
  }

  const hours = data.durationHours;
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export async function createReservation(
  raw: CreateReservationInput,
  actorUserId: string
): Promise<ServiceResult<ReservationRow>> {
  const parsed = createReservationSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;
  const access = await authorizeStoreAction(
    actorUserId,
    data.storeId,
    PERMISSIONS.RESERVATIONS_WRITE
  );

  if (!access.ok) {
    return access;
  }

  await expireDueReservations({
    storeId: data.storeId,
    vehicleId: data.vehicleId,
    actorUserId,
  });

  const customer = await customersRepo.findCustomerInStore(data.storeId, data.customerId);

  if (!customer) {
    return serviceError('NOT_FOUND', 'Cliente não encontrado nesta loja');
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
        'O veículo da reserva deve coincidir com o da oportunidade'
      );
    }
  }

  if (data.assigneeUserId) {
    const ok = await assertAssigneeInStore(data.storeId, data.assigneeUserId);

    if (!ok.ok) {
      return ok;
    }
  }

  const startsAt = nowIso();
  const expiresAt = resolveExpiresAt(data);

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const created = await getDb().transaction(async (tx) => {
        const vehicleRows = await tx
          .select()
          .from(vehicles)
          .where(and(eq(vehicles.storeId, data.storeId), eq(vehicles.id, data.vehicleId)))
          .limit(1);
        const vehicle = vehicleRows[0];

        if (!vehicle) {
          throw Object.assign(new Error('Veículo não encontrado nesta loja'), {
            code: 'NOT_FOUND',
          });
        }

        if (vehicle.status !== VEHICLE_STATUS.AVAILABLE) {
          throw Object.assign(
            new Error('Somente veículos disponíveis podem receber nova reserva'),
            { code: 'CONFLICT' }
          );
        }

        const existingActive = await reservationsRepo.findActiveReservationForVehicle(
          data.vehicleId,
          tx
        );

        if (existingActive) {
          throw Object.assign(new Error('Este veículo já possui uma reserva ativa'), {
            code: 'CONFLICT',
          });
        }

        if (
          !canTransitionVehicleStatus(
            vehicle.status,
            VEHICLE_STATUS.RESERVED,
            'reservation'
          )
        ) {
          throw Object.assign(new Error('Transição de status não permitida'), {
            code: 'CONFLICT',
          });
        }

        const reservation = await reservationsRepo.insertReservation(
          {
            storeId: data.storeId,
            vehicleId: data.vehicleId,
            customerId: data.customerId,
            opportunityId: data.opportunityId ?? null,
            assigneeUserId: data.assigneeUserId ?? actorUserId,
            startsAt,
            expiresAt,
            status: RESERVATION_STATUS.ACTIVE,
            notes: data.notes ?? null,
            createdByUserId: actorUserId,
          },
          tx
        );

        await tx
          .update(vehicles)
          .set({ status: VEHICLE_STATUS.RESERVED, isDraft: 'false', updatedAt: nowIso() })
          .where(eq(vehicles.id, vehicle.id));

        await reservationsRepo.insertReservationEvent(
          {
            storeId: data.storeId,
            reservationId: reservation.id,
            type: RESERVATION_EVENT_TYPES.CREATED,
            body: `Reserva criada até ${expiresAt}`,
            actorUserId,
            metadataJson: JSON.stringify({
              vehicleId: data.vehicleId,
              customerId: data.customerId,
              expiresAt,
            }),
          },
          tx
        );

        return reservation;
      });

      await auditRepo.insertAuditEvent({
        storeId: data.storeId,
        actorUserId,
        action: 'reservation.created',
        entityType: 'reservation',
        entityId: created.id,
        payloadJson: JSON.stringify({
          vehicleId: data.vehicleId,
          customerId: data.customerId,
          expiresAt,
          opportunityId: data.opportunityId ?? null,
        }),
      });

      return serviceSuccess(created);
    } catch (error) {
      const code = (error as { code?: string }).code;
      const message = error instanceof Error ? error.message : 'Falha ao criar reserva';

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
        rawMessage.includes('reservations_vehicle_active_uidx')
      ) {
        return serviceError('CONFLICT', 'Este veículo já possui uma reserva ativa');
      }

      const isBusy =
        rawMessage.includes('busy') ||
        rawMessage.includes('locked') ||
        rawMessage.includes('database is locked');

      if (isBusy && attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 25 * attempt));
        continue;
      }

      const existingActive = await reservationsRepo.findActiveReservationForVehicle(
        data.vehicleId
      );

      if (existingActive) {
        return serviceError('CONFLICT', 'Este veículo já possui uma reserva ativa');
      }

      const vehicleNow = await vehiclesRepo.findVehicleInStore(data.storeId, data.vehicleId);

      if (vehicleNow && vehicleNow.status !== VEHICLE_STATUS.AVAILABLE) {
        return serviceError(
          'CONFLICT',
          'Somente veículos disponíveis podem receber nova reserva'
        );
      }

      return serviceError('INTERNAL', 'Não foi possível criar a reserva');
    }
  }

  return serviceError('INTERNAL', 'Não foi possível criar a reserva');
}

export async function extendReservation(
  raw: ExtendReservationInput,
  actorUserId: string
): Promise<ServiceResult<ReservationRow>> {
  const parsed = extendReservationSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;
  const access = await authorizeStoreAction(
    actorUserId,
    data.storeId,
    PERMISSIONS.RESERVATIONS_WRITE
  );

  if (!access.ok) {
    return access;
  }

  await expireDueReservations({
    storeId: data.storeId,
    actorUserId,
  });

  const current = await reservationsRepo.findReservationInStore(
    data.storeId,
    data.reservationId
  );

  if (!current) {
    return serviceError('NOT_FOUND', 'Reserva não encontrada');
  }

  if (current.status !== RESERVATION_STATUS.ACTIVE) {
    return serviceError('CONFLICT', 'Somente reservas ativas podem ser prorrogadas');
  }

  const expiresAt = new Date(data.expiresAt).toISOString();

  if (Number.isNaN(new Date(expiresAt).getTime()) || new Date(expiresAt) <= new Date()) {
    return serviceError('VALIDATION', 'A nova validade deve ser futura');
  }

  if (expiresAt <= current.expiresAt) {
    return serviceError('VALIDATION', 'A prorrogação deve estender o prazo atual');
  }

  const previousExpiresAt = current.expiresAt;
  const updated = await reservationsRepo.updateReservation(current.id, {
    expiresAt,
    notes: data.notes ?? current.notes,
  });

  await reservationsRepo.insertReservationEvent({
    storeId: data.storeId,
    reservationId: current.id,
    type: RESERVATION_EVENT_TYPES.EXTENDED,
    body: `Prazo prorrogado de ${previousExpiresAt} para ${expiresAt}`,
    actorUserId,
    metadataJson: JSON.stringify({ from: previousExpiresAt, to: expiresAt }),
  });

  await auditRepo.insertAuditEvent({
    storeId: data.storeId,
    actorUserId,
    action: 'reservation.extended',
    entityType: 'reservation',
    entityId: current.id,
    payloadJson: JSON.stringify({ from: previousExpiresAt, to: expiresAt }),
  });

  return serviceSuccess(updated);
}

export async function cancelReservation(
  raw: CancelReservationInput,
  actorUserId: string
): Promise<ServiceResult<ReservationRow>> {
  const parsed = cancelReservationSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;
  const access = await authorizeStoreAction(
    actorUserId,
    data.storeId,
    PERMISSIONS.RESERVATIONS_WRITE
  );

  if (!access.ok) {
    return access;
  }

  try {
    const updated = await getDb().transaction(async (tx) => {
      const current = await reservationsRepo.findReservationInStore(
        data.storeId,
        data.reservationId,
        tx
      );

      if (!current) {
        throw Object.assign(new Error('Reserva não encontrada'), { code: 'NOT_FOUND' });
      }

      if (current.status !== RESERVATION_STATUS.ACTIVE) {
        throw Object.assign(new Error('Somente reservas ativas podem ser canceladas'), {
          code: 'CONFLICT',
        });
      }

      const cancelled = await reservationsRepo.updateReservation(
        current.id,
        { status: RESERVATION_STATUS.CANCELLED },
        tx
      );

      await reservationsRepo.insertReservationEvent(
        {
          storeId: data.storeId,
          reservationId: current.id,
          type: RESERVATION_EVENT_TYPES.CANCELLED,
          body: data.reason?.trim()
            ? `Reserva cancelada: ${data.reason.trim()}`
            : 'Reserva cancelada',
          actorUserId,
          metadataJson: JSON.stringify({ reason: data.reason ?? null }),
        },
        tx
      );

      const stillActive = await reservationsRepo.findActiveReservationForVehicle(
        current.vehicleId,
        tx
      );

      if (!stillActive) {
        const vehicle = await tx
          .select()
          .from(vehicles)
          .where(eq(vehicles.id, current.vehicleId))
          .limit(1)
          .then((rows) => rows[0]);

        if (
          vehicle &&
          vehicle.status === VEHICLE_STATUS.RESERVED &&
          canTransitionVehicleStatus(vehicle.status, VEHICLE_STATUS.AVAILABLE, 'reservation')
        ) {
          await tx
            .update(vehicles)
            .set({ status: VEHICLE_STATUS.AVAILABLE, updatedAt: nowIso() })
            .where(eq(vehicles.id, vehicle.id));
        }
      }

      return cancelled;
    });

    await auditRepo.insertAuditEvent({
      storeId: data.storeId,
      actorUserId,
      action: 'reservation.cancelled',
      entityType: 'reservation',
      entityId: updated.id,
      payloadJson: JSON.stringify({ reason: data.reason ?? null }),
    });

    return serviceSuccess(updated);
  } catch (error) {
    const code = (error as { code?: string }).code;
    const message = error instanceof Error ? error.message : 'Falha ao cancelar';

    if (code === 'NOT_FOUND' || code === 'CONFLICT') {
      return serviceError(code, message);
    }

    return serviceError('INTERNAL', 'Não foi possível cancelar a reserva');
  }
}

/**
 * Encerra reserva ativa ao concluir venda (chamado na transição sold).
 */
export async function completeActiveReservationOnSale(
  storeId: string,
  vehicleId: string,
  actorUserId: string
): Promise<void> {
  await expireDueReservations({ storeId, vehicleId, actorUserId });

  const active = await reservationsRepo.findActiveReservationForVehicle(vehicleId);

  if (!active || active.storeId !== storeId) {
    return;
  }

  await getDb().transaction(async (tx) => {
    const current = await reservationsRepo.findReservationById(active.id, tx);

    if (!current || current.status !== RESERVATION_STATUS.ACTIVE) {
      return;
    }

    await reservationsRepo.updateReservation(
      current.id,
      { status: RESERVATION_STATUS.COMPLETED },
      tx
    );

    await reservationsRepo.insertReservationEvent(
      {
        storeId,
        reservationId: current.id,
        type: RESERVATION_EVENT_TYPES.COMPLETED,
        body: 'Reserva concluída pela venda do veículo',
        actorUserId,
        metadataJson: JSON.stringify({ vehicleId }),
      },
      tx
    );
  });

  await auditRepo.insertAuditEvent({
    storeId,
    actorUserId,
    action: 'reservation.completed',
    entityType: 'reservation',
    entityId: active.id,
    payloadJson: JSON.stringify({ vehicleId, reason: 'sale' }),
  });
}

export async function searchReservations(
  raw: SearchReservationsInput,
  actorUserId: string
): Promise<
  ServiceResult<{
    items: Array<
      Awaited<ReturnType<typeof reservationsRepo.searchReservationsInStore>>['items'][number] & {
        isOverdue: boolean;
      }
    >;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    statusCounts: Record<string, number>;
  }>
> {
  const parsed = searchReservationsSchema.safeParse(raw);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const data = parsed.data;
  const access = await authorizeStoreAction(
    actorUserId,
    data.storeId,
    PERMISSIONS.RESERVATIONS_READ
  );

  if (!access.ok) {
    return access;
  }

  await expireDueReservations({ storeId: data.storeId, actorUserId });

  const [result, statusCounts] = await Promise.all([
    reservationsRepo.searchReservationsInStore(data),
    reservationsRepo.countReservationsByStatus(data.storeId),
  ]);

  const now = Date.now();
  const items = result.items.map((item) => ({
    ...item,
    isOverdue:
      item.status === RESERVATION_STATUS.ACTIVE &&
      new Date(item.expiresAt).getTime() < now,
  }));

  const totalPages = Math.max(1, Math.ceil(result.total / data.pageSize));

  return serviceSuccess({
    items,
    total: result.total,
    page: data.page,
    pageSize: data.pageSize,
    totalPages,
    statusCounts,
  });
}

export async function getReservationDetail(
  storeId: string,
  reservationId: string,
  actorUserId: string
): Promise<
  ServiceResult<{
    reservation: NonNullable<
      Awaited<ReturnType<typeof reservationsRepo.findReservationListItem>>
    > & { isOverdue: boolean };
    events: Awaited<ReturnType<typeof reservationsRepo.listEventsForReservation>>;
  }>
> {
  const access = await authorizeStoreAction(
    actorUserId,
    storeId,
    PERMISSIONS.RESERVATIONS_READ
  );

  if (!access.ok) {
    return access;
  }

  await expireDueReservations({ storeId, actorUserId });

  const reservation = await reservationsRepo.findReservationListItem(storeId, reservationId);

  if (!reservation) {
    return serviceError('NOT_FOUND', 'Reserva não encontrada');
  }

  const events = await reservationsRepo.listEventsForReservation(storeId, reservationId);

  return serviceSuccess({
    reservation: {
      ...reservation,
      isOverdue:
        reservation.status === RESERVATION_STATUS.ACTIVE &&
        new Date(reservation.expiresAt).getTime() < Date.now(),
    },
    events,
  });
}

export async function getActiveReservationForVehicle(
  storeId: string,
  vehicleId: string,
  actorUserId: string
): Promise<ServiceResult<ReservationRow | null>> {
  const access = await authorizeStoreAction(
    actorUserId,
    storeId,
    PERMISSIONS.RESERVATIONS_READ
  );

  if (!access.ok) {
    return access;
  }

  await expireDueReservations({ storeId, vehicleId, actorUserId });

  const vehicle = await vehiclesRepo.findVehicleInStore(storeId, vehicleId);

  if (!vehicle) {
    return serviceError('NOT_FOUND', 'Veículo não encontrado');
  }

  const active = await reservationsRepo.findActiveReservationForVehicle(vehicleId);

  return serviceSuccess(active && active.storeId === storeId ? active : null);
}
