import { redirect } from 'next/navigation';

import { OpportunitiesBoardView } from '@features/crm';
import type { OpportunityOrigin } from '@app-types/crm';
import type { StoreRole } from '@app-types/membership';
import { membershipGrantsPermission, PERMISSIONS } from '@app-types/permissions';
import type { OpportunityStatus } from '@app-types/status';
import { requireStoreAccess } from '@server/auth/access';
import {
  listKanbanBoard,
  listPendingFollowUps,
  listStoreAssignees,
  searchOpportunities,
} from '@server/crm/opportunities.service';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function OportunidadesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const access = await requireStoreAccess({ permission: PERMISSIONS.OPPORTUNITIES_READ });

  if (!access.ok) {
    redirect('/painel');
  }

  const params = await searchParams;
  const page = Number(first(params.page) ?? '1') || 1;
  const view = first(params.view) === 'kanban' ? 'kanban' : 'list';
  const stage = first(params.stage) as OpportunityStatus | undefined;
  const origin = first(params.origin) as OpportunityOrigin | undefined;
  const assigneeUserId = first(params.assigneeUserId);

  const [listResult, kanbanResult, assigneesResult, followUpsResult] = await Promise.all([
    searchOpportunities(
      {
        storeId: access.data.storeId,
        stage,
        origin,
        assigneeUserId,
        q: first(params.q),
        page,
        pageSize: 20,
      },
      access.data.userId
    ),
    listKanbanBoard(
      access.data.storeId,
      access.data.userId,
      { origin, assigneeUserId }
    ),
    listStoreAssignees(access.data.storeId, access.data.userId),
    listPendingFollowUps(access.data.storeId, access.data.userId),
  ]);

  if (!listResult.ok || !kanbanResult.ok || !assigneesResult.ok) {
    redirect('/painel');
  }

  const canWrite = membershipGrantsPermission(
    access.data.membership.role as StoreRole,
    access.data.membership.permissionsJson,
    PERMISSIONS.OPPORTUNITIES_WRITE
  );

  return (
    <OpportunitiesBoardView
      items={listResult.data.items}
      kanbanColumns={kanbanResult.data.columns}
      funnel={listResult.data.funnel}
      assignees={assigneesResult.data}
      total={listResult.data.total}
      page={listResult.data.page}
      totalPages={listResult.data.totalPages}
      canWrite={canWrite}
      overdueCount={followUpsResult.ok ? followUpsResult.data.overdue.length : 0}
      filters={{
        stage,
        origin,
        assigneeUserId,
        q: first(params.q),
        view,
      }}
    />
  );
}
