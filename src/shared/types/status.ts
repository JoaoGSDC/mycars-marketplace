/** Estados de domínio — constantes tipadas, sem lógica de negócio. */

export const VEHICLE_STATUS = {
  PREPARING: 'preparing',
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  SOLD: 'sold',
  WITHDRAWN: 'withdrawn',
} as const;

export type VehicleStatus = (typeof VEHICLE_STATUS)[keyof typeof VEHICLE_STATUS];

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  preparing: 'Em preparação',
  available: 'Disponível',
  reserved: 'Reservado',
  sold: 'Vendido',
  withdrawn: 'Retirado',
};

export const LISTING_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  PAUSED: 'paused',
  SUSPENDED: 'suspended',
  CLOSED: 'closed',
} as const;

export type ListingStatus = (typeof LISTING_STATUS)[keyof typeof LISTING_STATUS];

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  paused: 'Pausado',
  suspended: 'Suspenso',
  closed: 'Encerrado',
};

export const OPPORTUNITY_STATUS = {
  NEW_LEAD: 'new_lead',
  IN_SERVICE: 'in_service',
  NEGOTIATING: 'negotiating',
  WON: 'won',
  LOST: 'lost',
  /** Encerramento administrativo (inválido/duplicado) — não conta como perda. */
  DISMISSED: 'dismissed',
} as const;

export type OpportunityStatus = (typeof OPPORTUNITY_STATUS)[keyof typeof OPPORTUNITY_STATUS];

export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  new_lead: 'Novo',
  in_service: 'Em atendimento',
  negotiating: 'Em negociação',
  won: 'Ganho',
  lost: 'Perdido',
  dismissed: 'Encerrado',
};

/** Etapas do funil comercial (exibe no Kanban; exclui encerramento admin). */
export const OPPORTUNITY_PIPELINE_STAGES: readonly OpportunityStatus[] = [
  OPPORTUNITY_STATUS.NEW_LEAD,
  OPPORTUNITY_STATUS.IN_SERVICE,
  OPPORTUNITY_STATUS.NEGOTIATING,
  OPPORTUNITY_STATUS.WON,
  OPPORTUNITY_STATUS.LOST,
] as const;

export const OPPORTUNITY_OPEN_STAGES: readonly OpportunityStatus[] = [
  OPPORTUNITY_STATUS.NEW_LEAD,
  OPPORTUNITY_STATUS.IN_SERVICE,
  OPPORTUNITY_STATUS.NEGOTIATING,
] as const;

export const RESERVATION_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const;

export type ReservationStatus = (typeof RESERVATION_STATUS)[keyof typeof RESERVATION_STATUS];

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  active: 'Ativa',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  expired: 'Expirada',
};

export const SALE_STATUS = {
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type SaleStatus = (typeof SALE_STATUS)[keyof typeof SALE_STATUS];

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

export const STORE_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
  CLOSED: 'closed',
} as const;

export type StoreStatus = (typeof STORE_STATUS)[keyof typeof STORE_STATUS];

export const STORE_STATUS_LABELS: Record<StoreStatus, string> = {
  pending: 'Pendente de análise',
  active: 'Ativa',
  rejected: 'Rejeitada',
  suspended: 'Suspensa',
  closed: 'Encerrada',
};

/** Loja pode publicar anúncios apenas com cadastro ativo (assinatura é independente). */
export function canStorePublishListings(status: string): boolean {
  return status === STORE_STATUS.ACTIVE;
}

export type DomainStatusKind = 'vehicle' | 'listing' | 'opportunity' | 'store';

export type DomainStatus = VehicleStatus | ListingStatus | OpportunityStatus | StoreStatus;
