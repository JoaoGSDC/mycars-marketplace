import { z } from 'zod';

export const LEAD_SOURCES = ['detail_form', 'whatsapp_click'] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const createListingLeadSchema = z.object({
  listingSlug: z.string().min(2).max(160),
  name: z.string().trim().min(2).max(80),
  email: z
    .string()
    .trim()
    .max(120)
    .optional()
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'E-mail inválido')
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  phone: z
    .string()
    .trim()
    .min(10, 'Informe um telefone válido')
    .max(20)
    .regex(/^[\d\s()+-]+$/, 'Telefone inválido'),
  message: z.string().trim().min(10).max(1000),
  source: z.literal('detail_form'),
  originPath: z.string().min(1).max(300),
  /** Honeypot — bots preenchem; humanos deixam vazio. */
  company: z.string().max(200).optional().default(''),
  /** Timestamp de abertura do formulário (ms). */
  formOpenedAt: z.number().int().positive(),
});

export type CreateListingLeadInput = z.infer<typeof createListingLeadSchema>;

export const registerWhatsAppClickSchema = z.object({
  listingSlug: z.string().min(2).max(160),
  originPath: z.string().min(1).max(300),
});

export type RegisterWhatsAppClickInput = z.infer<typeof registerWhatsAppClickSchema>;
