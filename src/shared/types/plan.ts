import { SUBSCRIPTION_STATUS, type SubscriptionStatus } from './subscription';

export const PLAN_CODES = {
  PILOTO: 'piloto',
  STARTER: 'starter',
  PRO: 'pro',
} as const;

export type PlanCode = (typeof PLAN_CODES)[keyof typeof PLAN_CODES];

/** Status de assinatura com acesso comercial (publicação) permitido. */
export const SUBSCRIPTION_ACCESS_STATUSES: readonly SubscriptionStatus[] = [
  SUBSCRIPTION_STATUS.TRIAL,
  SUBSCRIPTION_STATUS.ACTIVE,
  SUBSCRIPTION_STATUS.PAST_DUE,
] as const;

export type PlanDto = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  maxPublishedListings: number;
  maxVehicles: number;
  maxMembers: number;
  gracePeriodDays: number;
  /** Informativo — sem cobrança automática nesta fase. */
  priceCentsMonthly: number;
  isActive: boolean;
};

export type StoreSubscriptionDto = {
  id: string;
  storeId: string;
  planId: string;
  planCode: string;
  planName: string;
  status: SubscriptionStatus;
  startsAt: string;
  endsAt: string | null;
  graceEndsAt: string | null;
  notes: string | null;
  activatedByUserId: string | null;
  createdAt: string;
};
