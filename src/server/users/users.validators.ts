import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  phone: z.string().optional().nullable(),
  image: z.string().url().optional().nullable(),
  status: z.enum(['active', 'invited', 'disabled']).default('active'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
