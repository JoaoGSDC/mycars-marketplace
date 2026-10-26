import { redirect } from 'next/navigation';

import { CustomerFormView } from '@features/crm';
import { PERMISSIONS } from '@app-types/permissions';
import { requireStoreAccess } from '@server/auth/access';

export default async function NovoClientePage() {
  const access = await requireStoreAccess({ permission: PERMISSIONS.CUSTOMERS_WRITE });

  if (!access.ok) {
    redirect('/painel/clientes');
  }

  return <CustomerFormView storeId={access.data.storeId} />;
}
