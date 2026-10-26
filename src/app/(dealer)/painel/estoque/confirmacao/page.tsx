import { redirect } from 'next/navigation';

import { AvailabilityReviewView } from '@features/integrity';
import type { StoreRole } from '@app-types/membership';
import { membershipGrantsPermission, PERMISSIONS } from '@app-types/permissions';
import { requireStoreAccess } from '@server/auth/access';
import {
  getAvailabilityReviewQueue,
  getIntegrityPolicy,
} from '@server/integrity/availability.service';

export default async function ConfirmacaoEstoquePage() {
  const access = await requireStoreAccess({ permission: PERMISSIONS.VEHICLES_READ });

  if (!access.ok) {
    redirect('/painel');
  }

  const role = access.data.membership.role as StoreRole;
  const canWrite = membershipGrantsPermission(
    role,
    access.data.membership.permissionsJson,
    PERMISSIONS.VEHICLES_WRITE
  );

  const [queue, policy] = await Promise.all([
    getAvailabilityReviewQueue(access.data.storeId, access.data.userId),
    getIntegrityPolicy(access.data.storeId, access.data.userId),
  ]);

  if (!queue.ok || !policy.ok) {
    redirect('/painel/estoque');
  }

  return (
    <AvailabilityReviewView
      storeId={access.data.storeId}
      items={queue.data.items}
      overdueCount={queue.data.overdueCount}
      policy={policy.data}
      canWrite={canWrite}
    />
  );
}
