/** Papéis e permissões do ambiente administrativo da plataforma (não confundir com loja). */

export const PLATFORM_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];

export const PLATFORM_PERMISSIONS = {
  STORES_READ: 'platform:stores:read',
  STORES_REVIEW: 'platform:stores:review',
  STORES_SUSPEND: 'platform:stores:suspend',
  LISTINGS_MODERATE: 'platform:listings:moderate',
  REPORTS_MANAGE: 'platform:reports:manage',
  PLANS_MANAGE: 'platform:plans:manage',
  SUBSCRIPTIONS_MANAGE: 'platform:subscriptions:manage',
  METRICS_READ: 'platform:metrics:read',
  AUDIT_READ: 'platform:audit:read',
  USERS_MANAGE: 'platform:users:manage',
} as const;

export type PlatformPermission =
  (typeof PLATFORM_PERMISSIONS)[keyof typeof PLATFORM_PERMISSIONS];

const ALL_PLATFORM_PERMISSIONS = Object.values(PLATFORM_PERMISSIONS);

/** Admin da plataforma recebe o conjunto completo por padrão. */
export const PLATFORM_ROLE_PERMISSIONS: Record<PlatformRole, readonly PlatformPermission[]> = {
  [PLATFORM_ROLES.USER]: [],
  [PLATFORM_ROLES.ADMIN]: ALL_PLATFORM_PERMISSIONS,
};

export function platformRoleGrantsPermission(
  role: string,
  required: PlatformPermission
): boolean {
  const list = PLATFORM_ROLE_PERMISSIONS[role as PlatformRole] ?? [];

  return list.includes(required);
}

export const LISTING_REPORT_STATUS = {
  OPEN: 'open',
  REVIEWING: 'reviewing',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
} as const;

export type ListingReportStatus =
  (typeof LISTING_REPORT_STATUS)[keyof typeof LISTING_REPORT_STATUS];

export const LISTING_REPORT_STATUS_LABELS: Record<ListingReportStatus, string> = {
  open: 'Aberta',
  reviewing: 'Em análise',
  resolved: 'Resolvida',
  dismissed: 'Descartada',
};
