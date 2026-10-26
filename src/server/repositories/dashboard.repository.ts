import { and, count, eq, gte, inArray, isNotNull, isNull, lte, ne, or, sql, type SQL } from 'drizzle-orm';

import {
  DASHBOARD_LONG_STOCK_DAYS,
  DASHBOARD_RESERVATION_EXPIRY_HOURS,
  type DashboardCommercialMetrics,
  type DashboardOperationalMetrics,
  type DashboardOriginBucket,
  type DashboardSalesSeriesPoint,
  type DashboardSellerBucket,
} from '@app-types/dashboard';
import { FOLLOW_UP_TASK_STATUS, OPPORTUNITY_ORIGINS } from '@app-types/crm';
import {
  LISTING_STATUS,
  OPPORTUNITY_STATUS,
  RESERVATION_STATUS,
  SALE_STATUS,
  VEHICLE_STATUS,
} from '@app-types/status';
import {
  followUpTasks,
  getDb,
  listings,
  opportunities,
  reservations,
  sales,
  users,
  vehicles,
} from '@lib/db';

export type DashboardQueryWindow = {
  storeId: string;
  from: string;
  to: string;
  /** Filtra vendas/oportunidades pelo vendedor/responsável. */
  sellerUserId?: string | null;
  nowIso?: string;
};

function nowOr(params: DashboardQueryWindow): string {
  return params.nowIso ?? new Date().toISOString();
}

function sellerSaleCondition(sellerUserId?: string | null): SQL | undefined {
  if (!sellerUserId) {
    return undefined;
  }

  return eq(sales.sellerUserId, sellerUserId);
}

function sellerOppCondition(sellerUserId?: string | null): SQL | undefined {
  if (!sellerUserId) {
    return undefined;
  }

  return eq(opportunities.assigneeUserId, sellerUserId);
}

export async function fetchOperationalMetrics(
  params: DashboardQueryWindow
): Promise<DashboardOperationalMetrics> {
  const db = getDb();
  const now = nowOr(params);
  const longStockCutoff = new Date(
    new Date(now).getTime() - DASHBOARD_LONG_STOCK_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const nearExpiryLimit = new Date(
    new Date(now).getTime() + DASHBOARD_RESERVATION_EXPIRY_HOURS * 60 * 60 * 1000
  ).toISOString();

  const vehicleStatusRows = await db
    .select({ status: vehicles.status, value: count() })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.storeId, params.storeId),
        eq(vehicles.isDraft, 'false'),
        inArray(vehicles.status, [
          VEHICLE_STATUS.AVAILABLE,
          VEHICLE_STATUS.PREPARING,
          VEHICLE_STATUS.RESERVED,
        ])
      )
    )
    .groupBy(vehicles.status);

  const byStatus: Record<string, number> = {};
  for (const row of vehicleStatusRows) {
    byStatus[row.status] = Number(row.value);
  }

  const [stockWithoutListingRow] = await db
    .select({ value: count() })
    .from(vehicles)
    .leftJoin(listings, eq(listings.vehicleId, vehicles.id))
    .where(
      and(
        eq(vehicles.storeId, params.storeId),
        eq(vehicles.isDraft, 'false'),
        inArray(vehicles.status, [VEHICLE_STATUS.AVAILABLE, VEHICLE_STATUS.PREPARING]),
        or(
          isNull(listings.id),
          ne(listings.status, LISTING_STATUS.PUBLISHED)
        )
      )
    );

  const [listingsIssuesRow] = await db
    .select({ value: count() })
    .from(listings)
    .where(
      and(
        eq(listings.storeId, params.storeId),
        inArray(listings.status, [
          LISTING_STATUS.DRAFT,
          LISTING_STATUS.PAUSED,
          LISTING_STATUS.SUSPENDED,
        ])
      )
    );

  const awaitingConditions: SQL[] = [
    eq(opportunities.storeId, params.storeId),
    eq(opportunities.stage, OPPORTUNITY_STATUS.NEW_LEAD),
  ];
  const awaitingSeller = sellerOppCondition(params.sellerUserId);
  if (awaitingSeller) {
    awaitingConditions.push(awaitingSeller);
  }

  const [awaitingRow] = await db
    .select({ value: count() })
    .from(opportunities)
    .where(and(...awaitingConditions));

  const overdueConditions: SQL[] = [
    eq(followUpTasks.storeId, params.storeId),
    eq(followUpTasks.status, FOLLOW_UP_TASK_STATUS.PENDING),
    lte(followUpTasks.dueAt, now),
  ];
  if (params.sellerUserId) {
    overdueConditions.push(eq(followUpTasks.assignedToUserId, params.sellerUserId));
  }

  const [overdueRow] = await db
    .select({ value: count() })
    .from(followUpTasks)
    .where(and(...overdueConditions));

  const nearExpiryConditions: SQL[] = [
    eq(reservations.storeId, params.storeId),
    eq(reservations.status, RESERVATION_STATUS.ACTIVE),
    gte(reservations.expiresAt, now),
    lte(reservations.expiresAt, nearExpiryLimit),
  ];
  if (params.sellerUserId) {
    nearExpiryConditions.push(eq(reservations.assigneeUserId, params.sellerUserId));
  }

  const [nearExpiryRow] = await db
    .select({ value: count() })
    .from(reservations)
    .where(and(...nearExpiryConditions));

  const [longStockRow] = await db
    .select({ value: count() })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.storeId, params.storeId),
        eq(vehicles.isDraft, 'false'),
        inArray(vehicles.status, [
          VEHICLE_STATUS.AVAILABLE,
          VEHICLE_STATUS.PREPARING,
          VEHICLE_STATUS.RESERVED,
        ]),
        lte(vehicles.enteredAt, longStockCutoff)
      )
    );

  const [availabilityOverdueRow] = await db
    .select({ value: count() })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.storeId, params.storeId),
        eq(vehicles.isDraft, 'false'),
        inArray(vehicles.status, [VEHICLE_STATUS.AVAILABLE, VEHICLE_STATUS.PREPARING]),
        isNotNull(vehicles.availabilityDueAt),
        lte(vehicles.availabilityDueAt, now)
      )
    );

  return {
    availableVehicles: byStatus[VEHICLE_STATUS.AVAILABLE] ?? 0,
    preparingVehicles: byStatus[VEHICLE_STATUS.PREPARING] ?? 0,
    reservedVehicles: byStatus[VEHICLE_STATUS.RESERVED] ?? 0,
    stockWithoutListing: Number(stockWithoutListingRow?.value ?? 0),
    listingsWithIssues: Number(listingsIssuesRow?.value ?? 0),
    customersAwaitingService: Number(awaitingRow?.value ?? 0),
    overdueActivities: Number(overdueRow?.value ?? 0),
    reservationsNearExpiry: Number(nearExpiryRow?.value ?? 0),
    longStockVehicles: Number(longStockRow?.value ?? 0),
    availabilityOverdue: Number(availabilityOverdueRow?.value ?? 0),
  };
}

export async function fetchCommercialMetrics(
  params: DashboardQueryWindow
): Promise<
  Omit<DashboardCommercialMetrics, 'averageTicketCents' | 'conversion'> & {
    wonClosedInPeriod: number;
  }
> {
  const db = getDb();
  const saleSeller = sellerSaleCondition(params.sellerUserId);
  const oppSeller = sellerOppCondition(params.sellerUserId);

  const salePeriodConditions: SQL[] = [
    eq(sales.storeId, params.storeId),
    eq(sales.status, SALE_STATUS.COMPLETED),
    gte(sales.soldAt, params.from),
    lte(sales.soldAt, params.to),
  ];
  if (saleSeller) {
    salePeriodConditions.push(saleSeller);
  }

  const [salesAgg] = await db
    .select({
      salesCount: count(),
      volumeCents: sql<number>`coalesce(sum(${sales.negotiatedPriceCents}), 0)`,
      grossSum: sql<number>`coalesce(sum(case when ${sales.grossResultCents} is not null then ${sales.grossResultCents} else 0 end), 0)`,
      incompleteGross: sql<number>`coalesce(sum(case when ${sales.grossResultCents} is null then 1 else 0 end), 0)`,
      avgDays: sql<number | null>`avg(julianday(${sales.soldAt}) - julianday(${vehicles.enteredAt}))`,
    })
    .from(sales)
    .innerJoin(vehicles, eq(sales.vehicleId, vehicles.id))
    .where(and(...salePeriodConditions));

  const leadConditions: SQL[] = [
    eq(opportunities.storeId, params.storeId),
    ne(opportunities.stage, OPPORTUNITY_STATUS.DISMISSED),
    gte(opportunities.enteredAt, params.from),
    lte(opportunities.enteredAt, params.to),
  ];
  if (oppSeller) {
    leadConditions.push(oppSeller);
  }

  const [leadsRow] = await db
    .select({ value: count() })
    .from(opportunities)
    .where(and(...leadConditions));

  const wonConditions: SQL[] = [
    eq(opportunities.storeId, params.storeId),
    eq(opportunities.stage, OPPORTUNITY_STATUS.WON),
    isNotNull(opportunities.closedAt),
    gte(opportunities.closedAt, params.from),
    lte(opportunities.closedAt, params.to),
  ];
  if (oppSeller) {
    wonConditions.push(oppSeller);
  }

  const [wonRow] = await db
    .select({ value: count() })
    .from(opportunities)
    .where(and(...wonConditions));

  const negotiatingConditions: SQL[] = [
    eq(opportunities.storeId, params.storeId),
    eq(opportunities.stage, OPPORTUNITY_STATUS.NEGOTIATING),
  ];
  if (oppSeller) {
    negotiatingConditions.push(oppSeller);
  }

  const [negotiatingRow] = await db
    .select({ value: count() })
    .from(opportunities)
    .where(and(...negotiatingConditions));

  const originConditions: SQL[] = [
    eq(opportunities.storeId, params.storeId),
    ne(opportunities.stage, OPPORTUNITY_STATUS.DISMISSED),
    gte(opportunities.enteredAt, params.from),
    lte(opportunities.enteredAt, params.to),
  ];
  if (oppSeller) {
    originConditions.push(oppSeller);
  }

  const originRows = await db
    .select({ origin: opportunities.origin, value: count() })
    .from(opportunities)
    .where(and(...originConditions))
    .groupBy(opportunities.origin);

  const knownOrigins = Object.values(OPPORTUNITY_ORIGINS);
  const leadOrigins: DashboardOriginBucket[] = knownOrigins.map((origin) => ({
    origin,
    count: Number(originRows.find((row) => row.origin === origin)?.value ?? 0),
  }));

  for (const row of originRows) {
    if (!knownOrigins.includes(row.origin as (typeof knownOrigins)[number])) {
      leadOrigins.push({ origin: row.origin, count: Number(row.value) });
    }
  }

  const sellerRows = await db
    .select({
      sellerUserId: sales.sellerUserId,
      sellerName: users.name,
      salesCount: count(),
      volumeCents: sql<number>`coalesce(sum(${sales.negotiatedPriceCents}), 0)`,
    })
    .from(sales)
    .innerJoin(users, eq(sales.sellerUserId, users.id))
    .where(and(...salePeriodConditions))
    .groupBy(sales.sellerUserId, users.name);

  const salesBySeller: DashboardSellerBucket[] = sellerRows
    .map((row) => ({
      sellerUserId: row.sellerUserId,
      sellerName: row.sellerName,
      salesCount: Number(row.salesCount),
      volumeCents: Number(row.volumeCents),
    }))
    .sort((a, b) => b.volumeCents - a.volumeCents);

  const seriesRows = await db
    .select({
      day: sql<string>`strftime('%Y-%m-%d', ${sales.soldAt})`,
      salesCount: count(),
      volumeCents: sql<number>`coalesce(sum(${sales.negotiatedPriceCents}), 0)`,
    })
    .from(sales)
    .where(and(...salePeriodConditions))
    .groupBy(sql`strftime('%Y-%m-%d', ${sales.soldAt})`)
    .orderBy(sql`strftime('%Y-%m-%d', ${sales.soldAt})`);

  const salesSeries: DashboardSalesSeriesPoint[] = seriesRows.map((row) => ({
    day: row.day,
    salesCount: Number(row.salesCount),
    volumeCents: Number(row.volumeCents),
  }));

  const salesCount = Number(salesAgg?.salesCount ?? 0);
  const negotiatedVolumeCents = Number(salesAgg?.volumeCents ?? 0);
  const incompleteGrossResultCount = Number(salesAgg?.incompleteGross ?? 0);
  const grossSum = Number(salesAgg?.grossSum ?? 0);
  const avgDaysRaw = salesAgg?.avgDays;

  return {
    salesCount,
    negotiatedVolumeCents,
    leadsReceived: Number(leadsRow?.value ?? 0),
    negotiationsInProgress: Number(negotiatingRow?.value ?? 0),
    leadOrigins,
    salesBySeller,
    averageDaysInStock:
      avgDaysRaw === null || avgDaysRaw === undefined || salesCount === 0
        ? null
        : Math.round(Number(avgDaysRaw) * 10) / 10,
    estimatedGrossResultCents:
      salesCount === 0
        ? null
        : incompleteGrossResultCount === salesCount
          ? null
          : grossSum,
    incompleteGrossResultCount,
    salesSeries,
    wonClosedInPeriod: Number(wonRow?.value ?? 0),
  };
}
