import { z } from 'zod';

import { SALE_MODALITIES } from '@app-types/sale';
import { SALE_STATUS } from '@app-types/status';

const modalitySchema = z.enum([
  SALE_MODALITIES.CASH,
  SALE_MODALITIES.FINANCED,
  SALE_MODALITIES.TRADE_IN,
  SALE_MODALITIES.MIXED,
  SALE_MODALITIES.OTHER,
]);

export const createSaleSchema = z
  .object({
    storeId: z.string().min(1),
    vehicleId: z.string().min(1),
    customerId: z.string().min(1),
    sellerUserId: z.string().min(1).optional(),
    opportunityId: z.string().min(1).optional(),
    negotiatedPriceCents: z
      .number()
      .int()
      .positive('Informe o valor negociado')
      .max(1_000_000_000_00),
    modality: modalitySchema,
    hasTradeIn: z.boolean().optional().default(false),
    tradeInDescription: z.string().trim().max(2000).optional(),
    notes: z.string().trim().max(4000).optional(),
    soldAt: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.hasTradeIn && !data.tradeInDescription?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Descreva o veículo recebido na troca',
        path: ['tradeInDescription'],
      });
    }
  });

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export const cancelSaleSchema = z.object({
  storeId: z.string().min(1),
  saleId: z.string().min(1),
  reason: z.string().trim().min(5, 'Informe a justificativa').max(2000),
});

export type CancelSaleInput = z.infer<typeof cancelSaleSchema>;

export const searchSalesSchema = z.object({
  storeId: z.string().min(1),
  status: z.enum([SALE_STATUS.COMPLETED, SALE_STATUS.CANCELLED]).optional(),
  sellerUserId: z.string().min(1).optional(),
  vehicleId: z.string().min(1).optional(),
  q: z.string().trim().max(120).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type SearchSalesInput = z.infer<typeof searchSalesSchema>;
