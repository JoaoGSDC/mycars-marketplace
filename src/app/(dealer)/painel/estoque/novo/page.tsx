import { redirect } from 'next/navigation';

import { VehicleFormWizard } from '@features/inventory';
import { PERMISSIONS } from '@app-types/permissions';
import { requireStoreAccess } from '@server/auth/access';

export default async function NovoVeiculoPage() {
  const access = await requireStoreAccess({ permission: PERMISSIONS.VEHICLES_WRITE });

  if (!access.ok) {
    redirect('/painel/estoque');
  }

  return <VehicleFormWizard storeId={access.data.storeId} mode="create" />;
}
