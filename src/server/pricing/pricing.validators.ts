import { z } from 'zod';

export const pricingVehicleIdSchema = z.object({
  storeId: z.string().uuid(),
  vehicleId: z.string().uuid(),
});

export const pricingMatchSchema = pricingVehicleIdSchema.extend({
  /** Força nova busca mesmo se já matched. */
  force: z.boolean().optional().default(false),
});

export const pricingSelectCandidateSchema = pricingVehicleIdSchema.extend({
  brandCode: z.string().min(1),
  modelCode: z.string().min(1),
  yearId: z.string().min(1),
  fipeCode: z.string().optional().default(''),
});

export const pricingManualCodeSchema = pricingVehicleIdSchema.extend({
  fipeCode: z.string().min(3).max(20),
  yearId: z.string().min(1).max(20),
});

export const pricingManualYearsSchema = z.object({
  storeId: z.string().uuid(),
  fipeCode: z.string().min(3).max(20),
});

export const pricingMarginSchema = pricingVehicleIdSchema.extend({
  desiredMarginBps: z.number().int().min(0).max(9999),
});

export const pricingPreviewSchema = z.object({
  storeId: z.string().uuid(),
  vehicleId: z.string().uuid().optional(),
  ownership: z.enum(['own', 'consigned']).optional(),
  askingPriceCents: z.number().int().min(0).nullable().optional(),
  desiredMarginBps: z.number().int().min(0).max(9999).nullable().optional(),
  /** Custos em memória (wizard de criação ainda sem vehicleId persistido). */
  draftCosts: z
    .array(
      z.object({
        type: z.string().min(1),
        amountCents: z.number().int().min(0),
      })
    )
    .optional(),
  makeSlug: z.string().optional(),
  make: z.string().optional(),
  modelSlug: z.string().optional(),
  model: z.string().optional(),
  version: z.string().optional(),
  yearModel: z.number().int().optional(),
  fuel: z.string().optional(),
});

export type PricingMatchInput = z.infer<typeof pricingMatchSchema>;
export type PricingSelectCandidateInput = z.infer<typeof pricingSelectCandidateSchema>;
export type PricingManualCodeInput = z.infer<typeof pricingManualCodeSchema>;
export type PricingManualYearsInput = z.infer<typeof pricingManualYearsSchema>;
export type PricingMarginInput = z.infer<typeof pricingMarginSchema>;
export type PricingPreviewInput = z.infer<typeof pricingPreviewSchema>;
export type PricingVehicleIdInput = z.infer<typeof pricingVehicleIdSchema>;
