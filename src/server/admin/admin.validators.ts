import { z } from 'zod';

import { LISTING_REPORT_STATUS, PLATFORM_ROLES } from '@app-types/platform';
import { LISTING_STATUS, STORE_STATUS } from '@app-types/status';
import { SUBSCRIPTION_STATUS } from '@app-types/subscription';

export const adminStoreSearchSchema = z.object({
  status: z
    .enum([
      STORE_STATUS.PENDING,
      STORE_STATUS.ACTIVE,
      STORE_STATUS.REJECTED,
      STORE_STATUS.SUSPENDED,
      STORE_STATUS.CLOSED,
    ])
    .optional(),
  q: z.string().trim().max(120).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type AdminStoreSearchInput = z.infer<typeof adminStoreSearchSchema>;

export const suspendStoreSchema = z.object({
  storeId: z.string().min(1),
  reason: z.string().trim().min(5).max(2000),
});

export type SuspendStoreInput = z.infer<typeof suspendStoreSchema>;

export const reactivateStoreSchema = z.object({
  storeId: z.string().min(1),
  reason: z.string().trim().min(5).max(2000),
});

export type ReactivateStoreInput = z.infer<typeof reactivateStoreSchema>;

export const adminListingSearchSchema = z.object({
  status: z
    .enum([
      LISTING_STATUS.DRAFT,
      LISTING_STATUS.PUBLISHED,
      LISTING_STATUS.PAUSED,
      LISTING_STATUS.SUSPENDED,
      LISTING_STATUS.CLOSED,
    ])
    .optional(),
  storeId: z.string().min(1).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type AdminListingSearchInput = z.infer<typeof adminListingSearchSchema>;

export const moderateListingSchema = z.object({
  listingId: z.string().min(1),
  toStatus: z.enum([LISTING_STATUS.SUSPENDED, LISTING_STATUS.PAUSED, LISTING_STATUS.PUBLISHED]),
  reason: z.string().trim().min(5).max(2000),
});

export type ModerateListingInput = z.infer<typeof moderateListingSchema>;

export const createListingReportSchema = z.object({
  listingId: z.string().min(1),
  reason: z.string().trim().min(5).max(2000),
  reporterEmail: z.string().email().optional(),
});

export type CreateListingReportInput = z.infer<typeof createListingReportSchema>;

export const resolveListingReportSchema = z.object({
  reportId: z.string().min(1),
  status: z.enum([
    LISTING_REPORT_STATUS.REVIEWING,
    LISTING_REPORT_STATUS.RESOLVED,
    LISTING_REPORT_STATUS.DISMISSED,
  ]),
  resolutionNotes: z.string().trim().min(3).max(2000),
  suspendListing: z.boolean().optional().default(false),
});

export type ResolveListingReportInput = z.infer<typeof resolveListingReportSchema>;

export const upsertPlanSchema = z.object({
  id: z.string().min(1).optional(),
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_-]+$/, 'Código deve ser snake-case'),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  maxPublishedListings: z.number().int().min(0).max(10_000),
  maxVehicles: z.number().int().min(0).max(50_000),
  maxMembers: z.number().int().min(1).max(500),
  gracePeriodDays: z.number().int().min(0).max(90),
  priceCentsMonthly: z.number().int().min(0).max(10_000_000_00),
  isActive: z.boolean().default(true),
});

export type UpsertPlanInput = z.infer<typeof upsertPlanSchema>;

export const assignSubscriptionSchema = z.object({
  storeId: z.string().min(1),
  planId: z.string().min(1),
  status: z.enum([
    SUBSCRIPTION_STATUS.TRIAL,
    SUBSCRIPTION_STATUS.ACTIVE,
    SUBSCRIPTION_STATUS.PAST_DUE,
    SUBSCRIPTION_STATUS.CANCELED,
  ]),
  startsAt: z.string().min(1).optional(),
  endsAt: z.string().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type AssignSubscriptionInput = z.infer<typeof assignSubscriptionSchema>;

export const updateSubscriptionStatusSchema = z.object({
  subscriptionId: z.string().min(1),
  status: z.enum([
    SUBSCRIPTION_STATUS.TRIAL,
    SUBSCRIPTION_STATUS.ACTIVE,
    SUBSCRIPTION_STATUS.PAST_DUE,
    SUBSCRIPTION_STATUS.CANCELED,
  ]),
  notes: z.string().trim().max(2000).optional(),
  reason: z.string().trim().min(5).max(2000),
});

export type UpdateSubscriptionStatusInput = z.infer<typeof updateSubscriptionStatusSchema>;

export const platformMetricsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export type PlatformMetricsQueryInput = z.infer<typeof platformMetricsQuerySchema>;

export const auditSearchSchema = z.object({
  actionPrefix: z.string().trim().max(80).optional(),
  storeId: z.string().min(1).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(30),
});

export type AuditSearchInput = z.infer<typeof auditSearchSchema>;

export const setPlatformRoleSchema = z.object({
  userId: z.string().min(1),
  platformRole: z.enum([PLATFORM_ROLES.USER, PLATFORM_ROLES.ADMIN]),
  reason: z.string().trim().min(5).max(2000),
});

export type SetPlatformRoleInput = z.infer<typeof setPlatformRoleSchema>;
