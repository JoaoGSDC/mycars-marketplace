/** Política e estados de confirmação de disponibilidade do estoque. */

export const DEFAULT_CONFIRMATION_INTERVAL_DAYS = 14;
export const DEFAULT_CONFIRMATION_GRACE_DAYS = 3;

export const AVAILABILITY_CONFIRMATION_SOURCES = {
  MANUAL: 'manual',
  BATCH: 'batch',
  SYSTEM: 'system',
} as const;

export type AvailabilityConfirmationSource =
  (typeof AVAILABILITY_CONFIRMATION_SOURCES)[keyof typeof AVAILABILITY_CONFIRMATION_SOURCES];

export type StoreIntegrityPolicyDto = {
  storeId: string;
  confirmationIntervalDays: number;
  graceDays: number;
  autoPausePublished: boolean;
  enabled: boolean;
};

export type AvailabilityReviewItem = {
  vehicleId: string;
  label: string;
  status: string;
  availabilityConfirmedAt: string | null;
  availabilityDueAt: string | null;
  reviewState: 'ok' | 'due_soon' | 'overdue';
  listingId: string | null;
  listingStatus: string | null;
  availabilityHold: boolean;
};

export const JOB_KINDS = {
  AVAILABILITY_ENFORCEMENT: 'availability_enforcement',
  PRIVACY_RETENTION: 'privacy_retention',
} as const;

export type JobKind = (typeof JOB_KINDS)[keyof typeof JOB_KINDS];

export const JOB_RUN_STATUS = {
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type JobRunStatus = (typeof JOB_RUN_STATUS)[keyof typeof JOB_RUN_STATUS];
