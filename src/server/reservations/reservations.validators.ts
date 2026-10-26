import { z } from 'zod';

import { DEFAULT_RESERVATION_HOURS } from '@app-types/reservation';
import { RESERVATION_STATUS } from '@app-types/status';

export const createReservationSchema = z
  .object({
    storeId: z.string().min(1),
    vehicleId: z.string().min(1),
    customerId: z.string().min(1),
    opportunityId: z.string().min(1).optional(),
    assigneeUserId: z.string().min(1).optional(),
    notes: z.string().trim().max(2000).optional(),
    /** ISO — se omitido, usa startsAt + durationHours. */
    expiresAt: z.string().min(1).optional(),
    durationHours: z
      .number()
      .int()
      .min(1)
      .max(24 * 30)
      .optional()
      .default(DEFAULT_RESERVATION_HOURS),
  })
  .superRefine((data, ctx) => {
    if (data.expiresAt) {
      const expires = new Date(data.expiresAt).getTime();

      if (Number.isNaN(expires) || expires <= Date.now()) {
        ctx.addIssue({
          code: 'custom',
          message: 'A validade deve ser uma data futura',
          path: ['expiresAt'],
        });
      }
    }
  });

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const extendReservationSchema = z.object({
  storeId: z.string().min(1),
  reservationId: z.string().min(1),
  expiresAt: z.string().min(1),
  notes: z.string().trim().max(2000).optional(),
});

export type ExtendReservationInput = z.infer<typeof extendReservationSchema>;

export const cancelReservationSchema = z.object({
  storeId: z.string().min(1),
  reservationId: z.string().min(1),
  reason: z.string().trim().max(2000).optional(),
});

export type CancelReservationInput = z.infer<typeof cancelReservationSchema>;

export const searchReservationsSchema = z.object({
  storeId: z.string().min(1),
  status: z
    .enum([
      RESERVATION_STATUS.ACTIVE,
      RESERVATION_STATUS.COMPLETED,
      RESERVATION_STATUS.CANCELLED,
      RESERVATION_STATUS.EXPIRED,
    ])
    .optional(),
  q: z.string().trim().max(120).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type SearchReservationsInput = z.infer<typeof searchReservationsSchema>;
