import { z } from 'zod';

export const confirmAvailabilitySchema = z.object({
  storeId: z.string().min(1),
  vehicleId: z.string().min(1),
  notes: z.string().trim().max(1000).optional(),
});

export type ConfirmAvailabilityInput = z.infer<typeof confirmAvailabilitySchema>;

export const confirmAvailabilityBatchSchema = z.object({
  storeId: z.string().min(1),
  vehicleIds: z.array(z.string().min(1)).min(1).max(100),
  notes: z.string().trim().max(1000).optional(),
});

export type ConfirmAvailabilityBatchInput = z.infer<typeof confirmAvailabilityBatchSchema>;

export const updateIntegrityPolicySchema = z.object({
  storeId: z.string().min(1),
  confirmationIntervalDays: z.number().int().min(1).max(180),
  graceDays: z.number().int().min(0).max(30),
  autoPausePublished: z.boolean(),
  enabled: z.boolean(),
});

export type UpdateIntegrityPolicyInput = z.infer<typeof updateIntegrityPolicySchema>;

export const privacyRequestSchema = z.object({
  storeId: z.string().min(1),
  type: z.enum(['export', 'deletion']),
  reason: z.string().trim().min(5).max(2000).optional(),
});

export type PrivacyRequestInput = z.infer<typeof privacyRequestSchema>;
