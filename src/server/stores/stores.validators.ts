import { z } from 'zod';

import { STORE_STATUS } from '@app-types/status';

const storeStatusValues = Object.values(STORE_STATUS) as [string, ...string[]];

export const createStoreSchema = z.object({
  legalName: z.string().min(2),
  tradeName: z.string().min(2),
  publicName: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug inválido'),
  subdomain: z
    .string()
    .min(2)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional()
    .nullable(),
  document: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  city: z.string().min(2),
  state: z.string().length(2),
  neighborhood: z.string().optional().nullable(),
  status: z.enum(storeStatusValues).default(STORE_STATUS.PENDING),
  verified: z.boolean().default(false),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
