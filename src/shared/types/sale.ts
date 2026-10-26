import type { SaleStatus } from './status';

export const SALE_MODALITIES = {
  CASH: 'cash',
  FINANCED: 'financed',
  TRADE_IN: 'trade_in',
  MIXED: 'mixed',
  OTHER: 'other',
} as const;

export type SaleModality = (typeof SALE_MODALITIES)[keyof typeof SALE_MODALITIES];

export const SALE_MODALITY_LABELS: Record<SaleModality, string> = {
  cash: 'À vista',
  financed: 'Financiado',
  trade_in: 'Com troca',
  mixed: 'Misto',
  other: 'Outro',
};

export const SALE_EVENT_TYPES = {
  CREATED: 'created',
  CANCELLED: 'cancelled',
  NOTE: 'note',
} as const;

export type SaleEventType = (typeof SALE_EVENT_TYPES)[keyof typeof SALE_EVENT_TYPES];

export const SALE_EVENT_TYPE_LABELS: Record<SaleEventType, string> = {
  created: 'Registrada',
  cancelled: 'Cancelada / estornada',
  note: 'Observação',
};

export type SaleListItemDto = {
  id: string;
  storeId: string;
  vehicleId: string;
  customerId: string;
  sellerUserId: string;
  opportunityId: string | null;
  soldAt: string;
  listedPriceCents: number | null;
  negotiatedPriceCents: number;
  costsCents: number;
  /** 'true' | 'false' (sqlite text). */
  costsIncomplete: string | boolean;
  grossResultCents: number | null;
  modality: string;
  ownership: string;
  /** 'true' | 'false' (sqlite text). */
  hasTradeIn: string | boolean;
  tradeInDescription: string | null;
  notes: string | null;
  status: string;
  cancelReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerPhone: string;
  sellerName: string;
  vehicleLabel: string;
};

export type SaleEventDto = {
  id: string;
  type: string;
  body: string;
  actorUserId: string | null;
  actorName: string | null;
  createdAt: string;
  metadataJson: string | null;
};

export type SaleFiltersDto = {
  status?: SaleStatus | 'all';
  sellerUserId?: string;
  q?: string;
  from?: string;
  to?: string;
};
