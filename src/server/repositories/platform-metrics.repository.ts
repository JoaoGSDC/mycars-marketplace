import { and, count, eq, gte, inArray, lte } from 'drizzle-orm';

import { LISTING_STATUS, STORE_STATUS } from '@app-types/status';
import { SUBSCRIPTION_STATUS } from '@app-types/subscription';
import { getDb, listings, opportunities, storeSubscriptions, stores } from '@lib/db';

export type PlatformMetricsSnapshot = {
  storesRegistered: number;
  storesActive: number;
  storesPending: number;
  storesSuspended: number;
  storesPaying: number;
  vehiclesPublished: number;
  opportunitiesGenerated: number;
  opportunitiesInPeriod: number;
  storesRegisteredInPeriod: number;
  listingsPublishedInPeriod: number;
};

export async function fetchPlatformMetrics(params: {
  from: string;
  to: string;
}): Promise<PlatformMetricsSnapshot> {
  const db = getDb();

  const [registered] = await db.select({ value: count() }).from(stores);
  const [active] = await db
    .select({ value: count() })
    .from(stores)
    .where(eq(stores.status, STORE_STATUS.ACTIVE));
  const [pending] = await db
    .select({ value: count() })
    .from(stores)
    .where(eq(stores.status, STORE_STATUS.PENDING));
  const [suspended] = await db
    .select({ value: count() })
    .from(stores)
    .where(eq(stores.status, STORE_STATUS.SUSPENDED));

  const payingRows = await db
    .select({ storeId: storeSubscriptions.storeId })
    .from(storeSubscriptions)
    .where(
      inArray(storeSubscriptions.status, [
        SUBSCRIPTION_STATUS.TRIAL,
        SUBSCRIPTION_STATUS.ACTIVE,
        SUBSCRIPTION_STATUS.PAST_DUE,
      ])
    )
    .groupBy(storeSubscriptions.storeId);

  const [published] = await db
    .select({ value: count() })
    .from(listings)
    .where(eq(listings.status, LISTING_STATUS.PUBLISHED));

  const [opps] = await db.select({ value: count() }).from(opportunities);

  const [oppsPeriod] = await db
    .select({ value: count() })
    .from(opportunities)
    .where(
      and(gte(opportunities.enteredAt, params.from), lte(opportunities.enteredAt, params.to))
    );

  const [storesPeriod] = await db
    .select({ value: count() })
    .from(stores)
    .where(and(gte(stores.createdAt, params.from), lte(stores.createdAt, params.to)));

  const [listingsPeriod] = await db
    .select({ value: count() })
    .from(listings)
    .where(
      and(
        eq(listings.status, LISTING_STATUS.PUBLISHED),
        gte(listings.publishedAt, params.from),
        lte(listings.publishedAt, params.to)
      )
    );

  return {
    storesRegistered: Number(registered?.value ?? 0),
    storesActive: Number(active?.value ?? 0),
    storesPending: Number(pending?.value ?? 0),
    storesSuspended: Number(suspended?.value ?? 0),
    storesPaying: payingRows.length,
    vehiclesPublished: Number(published?.value ?? 0),
    opportunitiesGenerated: Number(opps?.value ?? 0),
    opportunitiesInPeriod: Number(oppsPeriod?.value ?? 0),
    storesRegisteredInPeriod: Number(storesPeriod?.value ?? 0),
    listingsPublishedInPeriod: Number(listingsPeriod?.value ?? 0),
  };
}
