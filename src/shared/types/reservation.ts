import type { ReservationStatus } from './status';

export const RESERVATION_EVENT_TYPES = {
  CREATED: 'created',
  EXTENDED: 'extended',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  COMPLETED: 'completed',
  NOTE: 'note',
} as const;

export type ReservationEventType =
  (typeof RESERVATION_EVENT_TYPES)[keyof typeof RESERVATION_EVENT_TYPES];

export const RESERVATION_EVENT_TYPE_LABELS: Record<ReservationEventType, string> = {
  created: 'Criada',
  extended: 'Prorrogada',
  cancelled: 'Cancelada',
  expired: 'Expirada',
  completed: 'Concluída',
  note: 'Observação',
};

/** Prazo padrão (horas) quando o lojista não informa validade. */
export const DEFAULT_RESERVATION_HOURS = 48;

export type ReservationListItemDto = {
  id: string;
  storeId: string;
  vehicleId: string;
  customerId: string;
  opportunityId: string | null;
  assigneeUserId: string | null;
  startsAt: string;
  expiresAt: string;
  status: string;
  notes: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerPhone: string;
  assigneeName: string | null;
  vehicleLabel: string;
  isOverdue: boolean;
};

export type ReservationEventDto = {
  id: string;
  type: string;
  body: string;
  actorUserId: string | null;
  actorName: string | null;
  createdAt: string;
  metadataJson: string | null;
};

export type ReservationFiltersDto = {
  status?: ReservationStatus | 'all';
  q?: string;
};
