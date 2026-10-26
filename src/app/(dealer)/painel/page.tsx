import { redirect } from 'next/navigation';

import { DealerDashboardView } from '@features/dashboard';
import { DealerOverviewView } from '@features/dealer';
import { DASHBOARD_INDICATOR_DEFS, DASHBOARD_PERIOD_PRESETS, type DashboardPeriodPreset, type DashboardSnapshot } from '@app-types/dashboard';
import { PERMISSIONS } from '@app-types/permissions';
import { STORE_STATUS } from '@app-types/status';
import { requireStoreAccess } from '@server/auth/access';
import { listStoreAssignees } from '@server/crm/opportunities.service';
import { getDealerDashboard } from '@server/dashboard/dashboard.service';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function emptySnapshot(storeId: string): DashboardSnapshot {
  const now = new Date().toISOString();

  return {
    storeId,
    generatedAt: now,
    period: {
      preset: DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS,
      from: now,
      to: now,
    },
    sellerUserId: null,
    operational: {
      availableVehicles: 0,
      preparingVehicles: 0,
      reservedVehicles: 0,
      stockWithoutListing: 0,
      listingsWithIssues: 0,
      customersAwaitingService: 0,
      overdueActivities: 0,
      reservationsNearExpiry: 0,
      longStockVehicles: 0,
      availabilityOverdue: 0,
    },
    commercial: {
      salesCount: 0,
      negotiatedVolumeCents: 0,
      averageTicketCents: null,
      leadsReceived: 0,
      negotiationsInProgress: 0,
      conversion: { numerator: 0, denominator: 0, rate: null },
      leadOrigins: [],
      salesBySeller: [],
      averageDaysInStock: null,
      estimatedGrossResultCents: null,
      incompleteGrossResultCount: 0,
      salesSeries: [],
    },
    capabilities: { canFilterSeller: false, canViewGrossResult: false },
    definitions: DASHBOARD_INDICATOR_DEFS,
  };
}

export default async function DealerPanelPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const access = await requireStoreAccess({ permission: PERMISSIONS.STORE_READ });

  if (!access.ok) {
    redirect('/para-lojistas/cadastro');
  }

  const store = access.data.store;

  if (store.status !== STORE_STATUS.ACTIVE) {
    return <DealerOverviewView store={store} />;
  }

  const params = await searchParams;
  const preset = (first(params.preset) ??
    DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS) as DashboardPeriodPreset;

  const [dashboard, sellers] = await Promise.all([
    getDealerDashboard(
      {
        storeId: access.data.storeId,
        preset,
        from: first(params.from),
        to: first(params.to),
        sellerUserId: first(params.sellerUserId),
      },
      access.data.userId
    ),
    listStoreAssignees(access.data.storeId, access.data.userId),
  ]);

  if (!dashboard.ok) {
    return (
      <DealerDashboardView
        storeName={store.publicName}
        snapshot={emptySnapshot(access.data.storeId)}
        sellers={[]}
        errorMessage={dashboard.message}
      />
    );
  }

  return (
    <DealerDashboardView
      storeName={store.publicName}
      snapshot={dashboard.data}
      sellers={sellers.ok ? sellers.data : []}
    />
  );
}
