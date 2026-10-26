import type { HTMLAttributes } from 'react';

import type {
  DomainStatus,
  DomainStatusKind,
  ListingStatus,
  OpportunityStatus,
  StoreStatus,
  VehicleStatus,
} from '@app-types/status';
import {
  LISTING_STATUS_LABELS,
  OPPORTUNITY_STATUS_LABELS,
  STORE_STATUS_LABELS,
  VEHICLE_STATUS_LABELS,
} from '@app-types/status';
import { cn } from '@utils/cn';

import styles from './styles.module.css';

type StatusTone = 'neutral' | 'success' | 'warning' | 'error' | 'info';

const toneClass: Record<StatusTone, string> = {
  neutral: styles['statusBadge--neutral'],
  success: styles['statusBadge--success'],
  warning: styles['statusBadge--warning'],
  error: styles['statusBadge--error'],
  info: styles['statusBadge--info'],
};

function vehicleTone(status: VehicleStatus): StatusTone {
  switch (status) {
    case 'available':
      return 'success';
    case 'reserved':
      return 'warning';
    case 'preparing':
      return 'info';
    case 'sold':
      return 'neutral';
    case 'withdrawn':
      return 'error';
    default:
      return 'neutral';
  }
}

function listingTone(status: ListingStatus): StatusTone {
  switch (status) {
    case 'published':
      return 'success';
    case 'draft':
      return 'neutral';
    case 'paused':
      return 'warning';
    case 'suspended':
      return 'error';
    case 'closed':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function opportunityTone(status: OpportunityStatus): StatusTone {
  switch (status) {
    case 'won':
      return 'success';
    case 'new_lead':
      return 'info';
    case 'in_service':
    case 'negotiating':
      return 'warning';
    case 'lost':
      return 'error';
    case 'dismissed':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function storeTone(status: StoreStatus): StatusTone {
  switch (status) {
    case 'active':
      return 'success';
    case 'pending':
      return 'info';
    case 'suspended':
      return 'warning';
    case 'closed':
      return 'error';
    default:
      return 'neutral';
  }
}

function resolveLabel(kind: DomainStatusKind, status: DomainStatus): string {
  switch (kind) {
    case 'vehicle':
      return VEHICLE_STATUS_LABELS[status as VehicleStatus];
    case 'listing':
      return LISTING_STATUS_LABELS[status as ListingStatus];
    case 'opportunity':
      return OPPORTUNITY_STATUS_LABELS[status as OpportunityStatus];
    case 'store':
      return STORE_STATUS_LABELS[status as StoreStatus];
    default:
      return status;
  }
}

function resolveTone(kind: DomainStatusKind, status: DomainStatus): StatusTone {
  switch (kind) {
    case 'vehicle':
      return vehicleTone(status as VehicleStatus);
    case 'listing':
      return listingTone(status as ListingStatus);
    case 'opportunity':
      return opportunityTone(status as OpportunityStatus);
    case 'store':
      return storeTone(status as StoreStatus);
    default:
      return 'neutral';
  }
}

export type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  kind: DomainStatusKind;
  status: DomainStatus;
};

export function StatusBadge({ kind, status, className, ...props }: StatusBadgeProps) {
  const tone = resolveTone(kind, status);
  const label = resolveLabel(kind, status);

  return (
    <span className={cn(styles.statusBadge, toneClass[tone], className)} {...props}>
      {label}
    </span>
  );
}
