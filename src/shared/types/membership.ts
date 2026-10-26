/** Papéis e status de vínculo usuário↔loja — espelham a coluna `store_memberships`. */

export const STORE_ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  SELLER: 'seller',
  OPERATOR: 'operator',
} as const;

export type StoreRole = (typeof STORE_ROLES)[keyof typeof STORE_ROLES];

export const STORE_ROLE_LABELS: Record<StoreRole, string> = {
  owner: 'Proprietário',
  manager: 'Gerente',
  seller: 'Vendedor',
  operator: 'Operador',
};

export const MEMBERSHIP_STATUS = {
  ACTIVE: 'active',
  INVITED: 'invited',
  REVOKED: 'revoked',
} as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUS)[keyof typeof MEMBERSHIP_STATUS];

export const INVITE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
} as const;

export type InviteStatus = (typeof INVITE_STATUS)[keyof typeof INVITE_STATUS];

export const VEHICLE_OWNERSHIP = {
  OWN: 'own',
  CONSIGNED: 'consigned',
} as const;

export type VehicleOwnership = (typeof VEHICLE_OWNERSHIP)[keyof typeof VEHICLE_OWNERSHIP];

export const VEHICLE_COST_TYPES = {
  ACQUISITION: 'acquisition',
  TRANSPORT: 'transport',
  REPAIR: 'repair',
  DETAILING: 'detailing',
  OTHER: 'other',
} as const;

export type VehicleCostType = (typeof VEHICLE_COST_TYPES)[keyof typeof VEHICLE_COST_TYPES];
