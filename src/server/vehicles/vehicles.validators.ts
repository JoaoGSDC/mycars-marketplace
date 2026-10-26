import { z } from 'zod';

import { VEHICLE_COST_TYPES, VEHICLE_OWNERSHIP } from '@app-types/membership';
import { VEHICLE_STATUS } from '@app-types/status';

const vehicleStatusValues = Object.values(VEHICLE_STATUS) as [string, ...string[]];
const ownershipValues = Object.values(VEHICLE_OWNERSHIP) as [string, ...string[]];
const costTypeValues = Object.values(VEHICLE_COST_TYPES) as [string, ...string[]];

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v.length === 0 ? null : v))
  .nullable()
  .optional();

const plateSchema = z
  .string()
  .trim()
  .transform((v) => (v.length === 0 ? null : v.toUpperCase().replace(/\s+/g, '')))
  .nullable()
  .optional();

const vinSchema = z
  .string()
  .trim()
  .transform((v) => (v.length === 0 ? null : v.toUpperCase().replace(/\s+/g, '')))
  .nullable()
  .optional();

const currentYear = new Date().getFullYear();

export const createVehicleSchema = z
  .object({
    storeId: z.string().uuid(),
    internalCode: optionalText,
    make: z.string().min(1, 'Informe a marca'),
    makeSlug: z.string().min(1, 'Informe a marca'),
    model: z.string().min(1, 'Informe o modelo'),
    modelSlug: z.string().min(1, 'Informe o modelo'),
    version: z.string().min(1, 'Informe a versão'),
    condition: z.enum(['new', 'seminew', 'used']).default('used'),
    status: z.enum(vehicleStatusValues).default(VEHICLE_STATUS.PREPARING),
    ownership: z.enum(ownershipValues).default(VEHICLE_OWNERSHIP.OWN),
    enteredAt: z.string().min(4).default(() => new Date().toISOString()),
    mileageKm: z.number().int().min(0).default(0),
    fuel: z.string().min(1).default('flex'),
    transmission: z.string().min(1).default('automatic'),
    yearManufacture: z.number().int().min(1950).max(2100).default(currentYear),
    yearModel: z.number().int().min(1950).max(2100).default(currentYear),
    bodyType: z.string().min(1).default('hatch'),
    color: optionalText,
    powerKw: z.number().optional().nullable(),
    drivetrain: optionalText,
    vin: vinSchema,
    plate: plateSchema,
    askingPriceCents: z.number().int().min(0).optional().nullable(),
    consignorName: optionalText,
    consignorPhone: optionalText,
    consignorDocument: optionalText,
    isDraft: z.boolean().default(false),
    notesInternal: optionalText,
    notesCommercial: optionalText,
  })
  .superRefine((data, ctx) => {
    if (data.vin && (data.vin.length < 11 || data.vin.length > 17)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Chassi/VIN deve ter entre 11 e 17 caracteres',
        path: ['vin'],
      });
    }

    if (data.isDraft) {
      return;
    }

    if (data.yearModel < data.yearManufacture) {
      ctx.addIssue({
        code: 'custom',
        message: 'Ano modelo não pode ser anterior ao ano de fabricação',
        path: ['yearModel'],
      });
    }

    if (
      data.status === VEHICLE_STATUS.RESERVED ||
      data.status === VEHICLE_STATUS.SOLD
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Reservado e vendido só via reserva/venda',
        path: ['status'],
      });
    }

    if (data.ownership === VEHICLE_OWNERSHIP.CONSIGNED && !data.consignorName) {
      ctx.addIssue({
        code: 'custom',
        message: 'Informe o consignante',
        path: ['consignorName'],
      });
    }
  });

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = z
  .object({
    storeId: z.string().uuid(),
    vehicleId: z.string().uuid(),
    internalCode: optionalText,
    make: z.string().min(1).optional(),
    makeSlug: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    modelSlug: z.string().min(1).optional(),
    version: z.string().min(1).optional(),
    condition: z.enum(['new', 'seminew', 'used']).optional(),
    ownership: z.enum(ownershipValues).optional(),
    enteredAt: z.string().min(4).optional(),
    mileageKm: z.number().int().min(0).optional(),
    fuel: z.string().min(1).optional(),
    transmission: z.string().min(1).optional(),
    yearManufacture: z.number().int().min(1950).max(2100).optional(),
    yearModel: z.number().int().min(1950).max(2100).optional(),
    bodyType: z.string().min(1).optional(),
    color: optionalText,
    powerKw: z.number().optional().nullable(),
    drivetrain: optionalText,
    vin: vinSchema,
    plate: plateSchema,
    askingPriceCents: z.number().int().min(0).optional().nullable(),
    consignorName: optionalText,
    consignorPhone: optionalText,
    consignorDocument: optionalText,
    isDraft: z.boolean().optional(),
    notesInternal: optionalText,
    notesCommercial: optionalText,
  })
  .superRefine((data, ctx) => {
    if (data.vin && (data.vin.length < 11 || data.vin.length > 17)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Chassi/VIN deve ter entre 11 e 17 caracteres',
        path: ['vin'],
      });
    }

    if (data.isDraft === true) {
      return;
    }

    if (
      data.yearManufacture != null &&
      data.yearModel != null &&
      data.yearModel < data.yearManufacture
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Ano modelo não pode ser anterior ao ano de fabricação',
        path: ['yearModel'],
      });
    }

    if (data.ownership === VEHICLE_OWNERSHIP.CONSIGNED && data.consignorName === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Informe o consignante',
        path: ['consignorName'],
      });
    }
  });

export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

export const transitionVehicleStatusSchema = z.object({
  storeId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  toStatus: z.enum(vehicleStatusValues),
  /** inventory | reservation | sale — default inventory */
  source: z.enum(['inventory', 'reservation', 'sale']).default('inventory'),
});

export type TransitionVehicleStatusInput = z.infer<typeof transitionVehicleStatusSchema>;

export const vehicleListQuerySchema = z.object({
  storeId: z.string().uuid(),
  q: z.string().trim().optional(),
  status: z.enum(vehicleStatusValues).optional(),
  makeSlug: z.string().optional(),
  modelSlug: z.string().optional(),
  yearFrom: z.number().int().optional(),
  yearTo: z.number().int().optional(),
  ownership: z.enum(ownershipValues).optional(),
  sort: z.enum(['entered_at', 'asking_price', 'days_in_stock']).default('entered_at'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type VehicleListQueryInput = z.infer<typeof vehicleListQuerySchema>;

export const createVehicleCostSchema = z
  .object({
    storeId: z.string().uuid(),
    vehicleId: z.string().uuid(),
    type: z.enum(costTypeValues),
    amountCents: z.number().int().min(0),
    incurredAt: z.string().min(4),
    description: optionalText,
  })
  .superRefine((data, ctx) => {
    if (data.type === VEHICLE_COST_TYPES.ACQUISITION && !data.description) {
      ctx.addIssue({
        code: 'custom',
        message: 'Descreva a aquisição (próprio ou consignação)',
        path: ['description'],
      });
    }
  });

export type CreateVehicleCostInput = z.infer<typeof createVehicleCostSchema>;

export const vehicleMediaItemSchema = z.object({
  url: z.string().url(),
  cardUrl: z.string().url().nullable().optional(),
  detailUrl: z.string().url().nullable().optional(),
  storageKey: z.string().min(1).nullable().optional(),
  mediaAssetId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false),
  alt: optionalText,
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  mimeType: z.string().nullable().optional(),
});

export const replaceVehicleMediaSchema = z.object({
  storeId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  items: z.array(vehicleMediaItemSchema).max(20),
});

export type ReplaceVehicleMediaInput = z.infer<typeof replaceVehicleMediaSchema>;
