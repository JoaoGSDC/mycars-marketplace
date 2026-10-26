import { redirect } from 'next/navigation';

import { QuickOpportunityFormView } from '@features/crm';
import { PERMISSIONS } from '@app-types/permissions';
import { requireStoreAccess } from '@server/auth/access';
import { getCustomerDetail } from '@server/crm/customers.service';
import { listStoreAssignees } from '@server/crm/opportunities.service';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function NovaOportunidadePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const access = await requireStoreAccess({ permission: PERMISSIONS.OPPORTUNITIES_WRITE });

  if (!access.ok) {
    redirect('/painel/oportunidades');
  }

  const params = await searchParams;
  const customerId = first(params.customerId);
  const assignees = await listStoreAssignees(access.data.storeId, access.data.userId);

  if (!assignees.ok) {
    redirect('/painel/oportunidades');
  }

  let initialCustomerName: string | undefined;

  if (customerId) {
    const customer = await getCustomerDetail(
      access.data.storeId,
      customerId,
      access.data.userId
    );

    if (customer.ok) {
      initialCustomerName = customer.data.customer.name;
    }
  }

  return (
    <QuickOpportunityFormView
      storeId={access.data.storeId}
      assignees={assignees.data}
      initialCustomerId={customerId}
      initialCustomerName={initialCustomerName}
    />
  );
}
