import { z } from 'zod';

import { isValidCnpj, stripCnpj } from '@utils/cnpj';

const slugSchema = z
  .string()
  .min(2)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use apenas minúsculas, números e hífens');

const subdomainSchema = z
  .string()
  .min(2)
  .max(32)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Subdomínio inválido');

export const storeApplicationSchema = z.object({
  legalName: z.string().min(3, 'Razão social obrigatória'),
  tradeName: z.string().min(2, 'Nome fantasia obrigatório'),
  publicName: z.string().min(2, 'Nome público obrigatório'),
  document: z
    .string()
    .min(14)
    .refine((v) => isValidCnpj(v), 'CNPJ inválido')
    .transform((v) => stripCnpj(v)),
  street: z.string().min(2, 'Endereço obrigatório'),
  addressNumber: z.string().min(1, 'Número obrigatório'),
  complement: z.string().optional().nullable(),
  neighborhood: z.string().min(2, 'Bairro obrigatório'),
  city: z.string().min(2, 'Cidade obrigatória'),
  state: z
    .string()
    .length(2, 'UF com 2 letras')
    .transform((v) => v.toUpperCase()),
  zipCode: z
    .string()
    .min(8)
    .transform((v) => v.replace(/\D/g, '')),
  phone: z.string().min(10, 'Telefone obrigatório'),
  whatsapp: z.string().min(10, 'WhatsApp obrigatório'),
  email: z.string().email('E-mail comercial inválido'),
  responsibleName: z.string().min(2, 'Nome do responsável obrigatório'),
  responsibleEmail: z.string().email('E-mail do responsável inválido'),
  responsiblePhone: z.string().min(10, 'Telefone do responsável obrigatório'),
  institutionalInfo: z.string().min(20, 'Conte um pouco sobre a loja (mín. 20 caracteres)'),
  slug: slugSchema,
  subdomain: subdomainSchema,
});

export type StoreApplicationInput = z.infer<typeof storeApplicationSchema>;

export const reviewApplicationSchema = z.object({
  storeId: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
  rejectionReason: z.string().min(5).max(500).optional(),
});

export type ReviewApplicationInput = z.infer<typeof reviewApplicationSchema>;

export const storefrontSetupFieldsSchema = z.object({
  publicName: z.string().min(2),
  slug: slugSchema,
  subdomain: subdomainSchema,
  logoUrl: z.string().url().optional().nullable().or(z.literal('')),
  coverImageUrl: z.string().url().optional().nullable().or(z.literal('')),
  about: z.string().max(2000).optional().nullable(),
  tagline: z.string().max(120).optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  heroVariant: z.enum(['integrated', 'split']).default('integrated'),
  coverFocus: z.enum(['center', 'top', 'bottom']).default('center'),
  businessHoursJson: z.string().default('[]'),
  socialInstagram: z.string().optional().nullable(),
  socialFacebook: z.string().optional().nullable(),
  whatsappNumber: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal('')),
  contactPhone: z.string().optional().nullable(),
});

export const storefrontSetupSchema = storefrontSetupFieldsSchema.extend({
  storeId: z.string().uuid(),
});

export type StorefrontSetupInput = z.infer<typeof storefrontSetupSchema>;

/** Payload persistido em `draft_json` (sem storeId). */
export const storefrontDraftSchema = storefrontSetupFieldsSchema;

export type StorefrontDraftPayload = z.infer<typeof storefrontDraftSchema>;

export const storefrontDraftSaveSchema = z.object({
  storeId: z.string().uuid(),
  draft: storefrontDraftSchema,
});

export type StorefrontDraftSaveInput = z.infer<typeof storefrontDraftSaveSchema>;

export const storefrontStoreIdSchema = z.object({
  storeId: z.string().uuid(),
});
