import { MEMBERSHIP_STATUS, type StoreRole } from '@app-types/membership';
import { membershipGrantsPermission, type Permission } from '@app-types/permissions';
import type { StoreMembershipRow } from '@lib/db';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';

/** Helper puro para testes e services — sem dependência de sessão HTTP. */
export function assertMembershipPermission(
  membership: Pick<StoreMembershipRow, 'role' | 'permissionsJson' | 'status'>,
  permission: Permission
): ServiceResult<true> {
  if (membership.status !== MEMBERSHIP_STATUS.ACTIVE) {
    return serviceError('FORBIDDEN', 'Vínculo revogado ou inativo');
  }

  const role = membership.role as StoreRole;
  const allowed = membershipGrantsPermission(role, membership.permissionsJson, permission);

  if (!allowed) {
    return serviceError('FORBIDDEN', 'Permissão insuficiente para esta operação');
  }

  return serviceSuccess(true);
}
