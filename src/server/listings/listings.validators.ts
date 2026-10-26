import { z } from 'zod';

import { LISTING_STATUS } from '@app-types/status';

const listingStatusValues = Object.values(LISTING_STATUS) as [string, ...string[]];

export const createListingSchema = z.object({
  storeId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  title: z.string().min(3).optional(),
  description: z.string().default(''),
  priceCents: z.number().int().min(0),
  previousPriceCents: z.number().int().min(0).optional().nullable(),
  status: z.enum(listingStatusValues).default(LISTING_STATUS.DRAFT),
  featured: z.boolean().default(false),
  mediaIds: z.array(z.string().uuid()).max(20).default([]),
  features: z.array(z.string().trim().min(1).max(80)).max(40).optional().default([]),
  publishedAt: z.string().optional().nullable(),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;

export const updateListingSchema = z.object({
  storeId: z.string().uuid(),
  listingId: z.string().uuid(),
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  priceCents: z.number().int().min(0).optional(),
  previousPriceCents: z.number().int().min(0).optional().nullable(),
  featured: z.boolean().optional(),
  mediaIds: z.array(z.string().uuid()).max(20).optional(),
  features: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
});

export type UpdateListingInput = z.infer<typeof updateListingSchema>;

export const transitionListingSchema = z.object({
  storeId: z.string().uuid(),
  listingId: z.string().uuid(),
  toStatus: z.enum([
    LISTING_STATUS.PUBLISHED,
    LISTING_STATUS.PAUSED,
    LISTING_STATUS.CLOSED,
    LISTING_STATUS.SUSPENDED,
  ]),
});

export type TransitionListingInput = z.infer<typeof transitionListingSchema>;
