import { redirect } from 'next/navigation';

import { IntegritySettingsView } from '@features/integrity';
import type { StoreRole } from '@app-types/membership';
import { membershipGrantsPermission, PERMISSIONS } from '@app-types/permissions';
import { requireStoreAccess } from '@server/auth/access';
import { getIntegrityPolicy } from '@server/integrity/availability.service';
import { listStorePrivacyRequests } from '@server/privacy/privacy.service';

export default async function ConfiguracoesPage() {
  const access = await requireStoreAccess({ permission: PERMISSIONS.STORE_WRITE });

  if (!access.ok) {
    redirect('/painel');
  }

  const role = access.data.membership.role as StoreRole;
  const canWrite = membershipGrantsPermission(
    role,
    access.data.membership.permissionsJson,
    PERMISSIONS.STORE_WRITE
  );

  const [policy, privacy] = await Promise.all([
    getIntegrityPolicy(access.data.storeId, access.data.userId),
    listStorePrivacyRequests(access.data.storeId, access.data.userId),
  ]);

  if (!policy.ok) {
    redirect('/painel');
  }

  return (
    <IntegritySettingsView
      storeId={access.data.storeId}
      policy={policy.data}
      privacyRequests={privacy.ok ? privacy.data : []}
      canWrite={canWrite}
    />
  );
}
