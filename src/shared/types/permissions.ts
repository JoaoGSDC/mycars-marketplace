import { STORE_ROLES, type StoreRole } from './membership';

/** Permissões granulares verificadas apenas no servidor. */
export const PERMISSIONS = {
  STORE_READ: 'store:read',
  STORE_WRITE: 'store:write',
  MEMBERS_MANAGE: 'members:manage',
  INVITES_MANAGE: 'invites:manage',
  VEHICLES_READ: 'vehicles:read',
  VEHICLES_WRITE: 'vehicles:write',
  COSTS_READ: 'costs:read',
  COSTS_WRITE: 'costs:write',
  LISTINGS_READ: 'listings:read',
  LISTINGS_WRITE: 'listings:write',
  LISTINGS_PUBLISH: 'listings:publish',
  MEDIA_WRITE: 'media:write',
  AUDIT_READ: 'audit:read',
  STOREFRONT_WRITE: 'storefront:write',
  CUSTOMERS_READ: 'customers:read',
  CUSTOMERS_WRITE: 'customers:write',
  OPPORTUNITIES_READ: 'opportunities:read',
  OPPORTUNITIES_WRITE: 'opportunities:write',
  RESERVATIONS_READ: 'reservations:read',
  RESERVATIONS_WRITE: 'reservations:write',
  SALES_READ: 'sales:read',
  SALES_WRITE: 'sales:write',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

/** Matriz papel → permissões padrão (overrides em membership.permissionsJson). */
export const ROLE_PERMISSIONS: Record<StoreRole, readonly Permission[]> = {
  [STORE_ROLES.OWNER]: ALL_PERMISSIONS,
  [STORE_ROLES.MANAGER]: [
    PERMISSIONS.STORE_READ,
    PERMISSIONS.STORE_WRITE,
    PERMISSIONS.MEMBERS_MANAGE,
    PERMISSIONS.INVITES_MANAGE,
    PERMISSIONS.VEHICLES_READ,
    PERMISSIONS.VEHICLES_WRITE,
    PERMISSIONS.COSTS_READ,
    PERMISSIONS.COSTS_WRITE,
    PERMISSIONS.LISTINGS_READ,
    PERMISSIONS.LISTINGS_WRITE,
    PERMISSIONS.LISTINGS_PUBLISH,
    PERMISSIONS.MEDIA_WRITE,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.STOREFRONT_WRITE,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_WRITE,
    PERMISSIONS.OPPORTUNITIES_READ,
    PERMISSIONS.OPPORTUNITIES_WRITE,
    PERMISSIONS.RESERVATIONS_READ,
    PERMISSIONS.RESERVATIONS_WRITE,
    PERMISSIONS.SALES_READ,
    PERMISSIONS.SALES_WRITE,
  ],
  [STORE_ROLES.SELLER]: [
    PERMISSIONS.STORE_READ,
    PERMISSIONS.VEHICLES_READ,
    PERMISSIONS.VEHICLES_WRITE,
    PERMISSIONS.LISTINGS_READ,
    PERMISSIONS.LISTINGS_WRITE,
    PERMISSIONS.LISTINGS_PUBLISH,
    PERMISSIONS.MEDIA_WRITE,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_WRITE,
    PERMISSIONS.OPPORTUNITIES_READ,
    PERMISSIONS.OPPORTUNITIES_WRITE,
    PERMISSIONS.RESERVATIONS_READ,
    PERMISSIONS.RESERVATIONS_WRITE,
    PERMISSIONS.SALES_READ,
    PERMISSIONS.SALES_WRITE,
  ],
  [STORE_ROLES.OPERATOR]: [
    PERMISSIONS.STORE_READ,
    PERMISSIONS.VEHICLES_READ,
    PERMISSIONS.LISTINGS_READ,
    PERMISSIONS.MEDIA_WRITE,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.OPPORTUNITIES_READ,
    PERMISSIONS.RESERVATIONS_READ,
    PERMISSIONS.SALES_READ,
  ],
};

export function resolveRolePermissions(role: StoreRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function membershipGrantsPermission(
  role: StoreRole,
  permissionsJson: string,
  required: Permission
): boolean {
  try {
    const custom = JSON.parse(permissionsJson) as unknown;

    if (Array.isArray(custom) && custom.includes('*')) {
      return true;
    }

    if (Array.isArray(custom) && custom.includes(required)) {
      return true;
    }
  } catch {
    // ignora JSON inválido — cai no papel padrão
  }

  return resolveRolePermissions(role).includes(required);
}
