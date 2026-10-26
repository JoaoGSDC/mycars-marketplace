import { z } from 'zod';

import { STORE_ROLES } from '@app-types/membership';

const roleValues = Object.values(STORE_ROLES) as [string, ...string[]];

export const createInviteSchema = z.object({
  storeId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(roleValues),
  /** Dias até expirar (padrão 7). */
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().min(16),
});

export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
