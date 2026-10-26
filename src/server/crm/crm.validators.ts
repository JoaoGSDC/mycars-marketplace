import { z } from 'zod';

import {
  CUSTOMER_DATA_PURPOSES,
  OPPORTUNITY_ORIGINS,
  ACTIVITY_TYPES,
} from '@app-types/crm';
import { OPPORTUNITY_STATUS } from '@app-types/status';

const phoneSchema = z
  .string()
  .trim()
  .min(10, 'Informe um telefone válido')
  .max(20)
  .regex(/^[\d\s()+-]+$/, 'Telefone inválido');

const originSchema = z.enum([
  OPPORTUNITY_ORIGINS.MARKETPLACE,
  OPPORTUNITY_ORIGINS.STOREFRONT,
  OPPORTUNITY_ORIGINS.FORM,
  OPPORTUNITY_ORIGINS.WHATSAPP_MANUAL,
  OPPORTUNITY_ORIGINS.WALK_IN,
  OPPORTUNITY_ORIGINS.OTHER,
]);

const stageSchema = z.enum([
  OPPORTUNITY_STATUS.NEW_LEAD,
  OPPORTUNITY_STATUS.IN_SERVICE,
  OPPORTUNITY_STATUS.NEGOTIATING,
  OPPORTUNITY_STATUS.WON,
  OPPORTUNITY_STATUS.LOST,
  OPPORTUNITY_STATUS.DISMISSED,
]);

export const createCustomerSchema = z.object({
  storeId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  email: z
    .string()
    .trim()
    .max(120)
    .optional()
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'E-mail inválido')
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  notes: z.string().trim().max(2000).optional(),
  source: originSchema.default(OPPORTUNITY_ORIGINS.OTHER),
  dataPurpose: z
    .enum([
      CUSTOMER_DATA_PURPOSES.COMMERCIAL_CONTACT,
      CUSTOMER_DATA_PURPOSES.SERVICE,
      CUSTOMER_DATA_PURPOSES.OTHER,
    ])
    .default(CUSTOMER_DATA_PURPOSES.COMMERCIAL_CONTACT),
  /** Se true e houver telefone duplicado, cria mesmo assim. */
  allowDuplicate: z.boolean().optional().default(false),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = z.object({
  storeId: z.string().min(1),
  customerId: z.string().min(1),
  name: z.string().trim().min(2).max(120).optional(),
  phone: phoneSchema.optional(),
  email: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional()
    .refine(
      (value) => value === null || value === undefined || value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      'E-mail inválido'
    ),
  notes: z.string().trim().max(2000).nullable().optional(),
  dataPurpose: z
    .enum([
      CUSTOMER_DATA_PURPOSES.COMMERCIAL_CONTACT,
      CUSTOMER_DATA_PURPOSES.SERVICE,
      CUSTOMER_DATA_PURPOSES.OTHER,
    ])
    .optional(),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const searchCustomersSchema = z.object({
  storeId: z.string().min(1),
  q: z.string().trim().max(120).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type SearchCustomersInput = z.infer<typeof searchCustomersSchema>;

export const createOpportunitySchema = z.object({
  storeId: z.string().min(1),
  customerId: z.string().min(1).optional(),
  /** Cadastro rápido embutido (quando não há customerId). */
  customer: z
    .object({
      name: z.string().trim().min(2).max(120),
      phone: phoneSchema,
      email: z.string().trim().max(120).optional(),
      allowDuplicate: z.boolean().optional().default(false),
    })
    .optional(),
  vehicleId: z.string().min(1).optional(),
  listingId: z.string().min(1).optional(),
  origin: originSchema,
  notes: z.string().trim().max(2000).optional(),
  assigneeUserId: z.string().min(1).optional(),
  nextActionAt: z.string().min(1).optional(),
  nextActionLabel: z.string().trim().max(200).optional(),
});

export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;

export const searchOpportunitiesSchema = z.object({
  storeId: z.string().min(1),
  stage: stageSchema.optional(),
  origin: originSchema.optional(),
  assigneeUserId: z.string().min(1).optional(),
  customerId: z.string().min(1).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type SearchOpportunitiesInput = z.infer<typeof searchOpportunitiesSchema>;

export const changeOpportunityStageSchema = z.object({
  storeId: z.string().min(1),
  opportunityId: z.string().min(1),
  stage: stageSchema,
  resultNotes: z.string().trim().max(2000).optional(),
});

export type ChangeOpportunityStageInput = z.infer<typeof changeOpportunityStageSchema>;

export const assignOpportunitySchema = z.object({
  storeId: z.string().min(1),
  opportunityId: z.string().min(1),
  assigneeUserId: z.string().min(1),
});

export type AssignOpportunityInput = z.infer<typeof assignOpportunitySchema>;

export const addActivitySchema = z.object({
  storeId: z.string().min(1),
  opportunityId: z.string().min(1),
  type: z.enum([
    ACTIVITY_TYPES.CONTACT,
    ACTIVITY_TYPES.CONTACT_ATTEMPT,
    ACTIVITY_TYPES.NOTE,
  ]),
  body: z.string().trim().min(1).max(4000),
});

export type AddActivityInput = z.infer<typeof addActivitySchema>;

export const scheduleFollowUpSchema = z.object({
  storeId: z.string().min(1),
  opportunityId: z.string().min(1),
  title: z.string().trim().min(2).max(200),
  dueAt: z.string().min(1),
  assignedToUserId: z.string().min(1).optional(),
});

export type ScheduleFollowUpInput = z.infer<typeof scheduleFollowUpSchema>;

export const completeFollowUpSchema = z.object({
  storeId: z.string().min(1),
  taskId: z.string().min(1),
});

export type CompleteFollowUpInput = z.infer<typeof completeFollowUpSchema>;

export const updateOpportunityNotesSchema = z.object({
  storeId: z.string().min(1),
  opportunityId: z.string().min(1),
  notes: z.string().trim().max(2000).nullable(),
});

export type UpdateOpportunityNotesInput = z.infer<typeof updateOpportunityNotesSchema>;
