import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { migrate } from 'drizzle-orm/libsql/migrator';

const TEST_DB = resolve(process.cwd(), '.data/test-dashboard.db');

describe('dashboard lojista', () => {
  before(async () => {
    rmSync(TEST_DB, { force: true });
    mkdirSync(dirname(TEST_DB), { recursive: true });

    process.env.TURSO_DATABASE_URL = `file:${TEST_DB}`;
    delete process.env.TURSO_AUTH_TOKEN;

    const { resetDbSingletons, getDb } = await import('@lib/db');
    resetDbSingletons();
    await migrate(getDb(), { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  });

  after(async () => {
    const { resetDbSingletons } = await import('@lib/db');
    resetDbSingletons();
    rmSync(TEST_DB, { force: true });
  });

  it('calcula ticket, conversão e resolve período sem ambiguidade', async () => {
    const { computeAverageTicket, computeConversionRate, DASHBOARD_PERIOD_PRESETS } =
      await import('@app-types/dashboard');
    const { resolveDashboardPeriod } = await import('@server/dashboard/dashboard.service');

    assert.equal(computeAverageTicket(300, 0), null);
    assert.equal(computeAverageTicket(30000, 3), 10000);
    assert.equal(computeConversionRate(2, 0), null);
    assert.equal(computeConversionRate(1, 4), 0.25);

    const now = new Date('2026-10-21T15:00:00.000Z');
    const month = resolveDashboardPeriod(DASHBOARD_PERIOD_PRESETS.THIS_MONTH, undefined, undefined, now);
    assert.equal(month.from.startsWith('2026-10-01'), true);

    const custom = resolveDashboardPeriod(
      DASHBOARD_PERIOD_PRESETS.CUSTOM,
      '2026-01-01T00:00:00.000Z',
      '2026-01-31T23:59:59.999Z',
      now
    );
    assert.equal(custom.from, '2026-01-01T00:00:00.000Z');
  });

  async function seedStore(slug: string, email: string) {
    const { createStore } = await import('@server/stores/stores.service');
    const { createUser, addStoreMember } = await import('@server/users/users.service');
    const { STORE_STATUS } = await import('@app-types/status');
    const { STORE_ROLES } = await import('@app-types/membership');

    const store = await createStore({
      legalName: `${slug} LTDA`,
      tradeName: slug,
      publicName: slug,
      slug,
      subdomain: slug.replace(/-/g, ''),
      city: 'Campinas',
      state: 'SP',
      status: STORE_STATUS.ACTIVE,
      verified: true,
    });
    assert.equal(store.ok, true);
    if (!store.ok) throw new Error(store.message);

    const owner = await createUser({ email, name: 'Owner Dash' });
    assert.equal(owner.ok, true);
    if (!owner.ok) throw new Error(owner.message);

    await addStoreMember({
      storeId: store.data.id,
      userId: owner.data.id,
      role: STORE_ROLES.OWNER,
    });

    const seller = await createUser({ email: `seller-${email}`, name: 'Seller Dash' });
    assert.equal(seller.ok, true);
    if (!seller.ok) throw new Error(seller.message);

    await addStoreMember({
      storeId: store.data.id,
      userId: seller.data.id,
      role: STORE_ROLES.SELLER,
    });

    const operator = await createUser({ email: `op-${email}`, name: 'Op Dash' });
    assert.equal(operator.ok, true);
    if (!operator.ok) throw new Error(operator.message);

    await addStoreMember({
      storeId: store.data.id,
      userId: operator.data.id,
      role: STORE_ROLES.OPERATOR,
    });

    return { store: store.data, owner: owner.data, seller: seller.data, operator: operator.data };
  }

  async function seedVehicle(
    storeId: string,
    actorUserId: string,
    plate: string,
    status: string,
    enteredAt: string
  ) {
    const { createVehicle } = await import('@server/vehicles/vehicles.service');
    const { VEHICLE_OWNERSHIP } = await import('@app-types/membership');

    const vehicle = await createVehicle(
      {
        storeId,
        make: 'VW',
        makeSlug: 'vw',
        model: 'Polo',
        modelSlug: 'polo',
        version: 'TSI',
        condition: 'used',
        status,
        ownership: VEHICLE_OWNERSHIP.OWN,
        enteredAt,
        mileageKm: 20000,
        fuel: 'flex',
        transmission: 'automatic',
        yearManufacture: 2020,
        yearModel: 2021,
        bodyType: 'hatch',
        plate,
        askingPriceCents: 7000000,
      },
      actorUserId
    );
    assert.equal(vehicle.ok, true);
    if (!vehicle.ok) throw new Error(vehicle.message);

    return vehicle.data;
  }

  it('agrega indicadores reais, isola lojas, ignora venda cancelada e mascara custos sem permissão', async () => {
    const { getDealerDashboardUncached } = await import('@server/dashboard/dashboard.service');
    const { createCustomer } = await import('@server/crm/customers.service');
    const { createOpportunity, changeOpportunityStage, scheduleFollowUp } = await import(
      '@server/crm/opportunities.service'
    );
    const { createSale, cancelSale } = await import('@server/sales/sales.service');
    const { createReservation } = await import('@server/reservations/reservations.service');
    const { addVehicleCost } = await import('@server/vehicles/vehicles.service');
    const { DASHBOARD_PERIOD_PRESETS } = await import('@app-types/dashboard');
    const { OPPORTUNITY_ORIGINS } = await import('@app-types/crm');
    const { SALE_MODALITIES } = await import('@app-types/sale');
    const { OPPORTUNITY_STATUS, VEHICLE_STATUS } = await import('@app-types/status');

    const a = await seedStore('dash-loja-a', 'owner-a@dash.test');
    const b = await seedStore('dash-loja-b', 'owner-b@dash.test');

    const now = new Date();
    const enteredRecent = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const enteredOld = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const available = await seedVehicle(
      a.store.id,
      a.owner.id,
      'DSH1A11',
      VEHICLE_STATUS.AVAILABLE,
      enteredRecent
    );
    await seedVehicle(
      a.store.id,
      a.owner.id,
      'DSH1B22',
      VEHICLE_STATUS.PREPARING,
      enteredRecent
    );
    const longStock = await seedVehicle(
      a.store.id,
      a.owner.id,
      'DSH1C33',
      VEHICLE_STATUS.AVAILABLE,
      enteredOld
    );
    const reservedVehicle = await seedVehicle(
      a.store.id,
      a.owner.id,
      'DSH1D44',
      VEHICLE_STATUS.AVAILABLE,
      enteredRecent
    );

    await seedVehicle(
      b.store.id,
      b.owner.id,
      'DSH2Z99',
      VEHICLE_STATUS.AVAILABLE,
      enteredRecent
    );

    const cost = await addVehicleCost(
      {
        storeId: a.store.id,
        vehicleId: available.id,
        type: 'acquisition',
        amountCents: 5000000,
        incurredAt: enteredRecent,
        description: 'Compra',
      },
      a.owner.id
    );
    assert.equal(cost.ok, true);

    const customer = await createCustomer(
      {
        storeId: a.store.id,
        name: 'Lead Dash',
        phone: '19970001111',
        source: OPPORTUNITY_ORIGINS.MARKETPLACE,
        dataPurpose: 'commercial_contact',
      },
      a.owner.id
    );
    assert.equal(customer.ok, true);
    if (!customer.ok) throw new Error(customer.message);

    const lead = await createOpportunity(
      {
        storeId: a.store.id,
        customerId: customer.data.customer.id,
        vehicleId: available.id,
        origin: OPPORTUNITY_ORIGINS.MARKETPLACE,
        assigneeUserId: a.seller.id,
      },
      a.owner.id
    );
    assert.equal(lead.ok, true);
    if (!lead.ok) throw new Error(lead.message);

    const wonLeadCustomer = await createCustomer(
      {
        storeId: a.store.id,
        name: 'Won Dash',
        phone: '19970002222',
        source: OPPORTUNITY_ORIGINS.WALK_IN,
        dataPurpose: 'commercial_contact',
      },
      a.owner.id
    );
    assert.equal(wonLeadCustomer.ok, true);
    if (!wonLeadCustomer.ok) throw new Error(wonLeadCustomer.message);

    const wonOpp = await createOpportunity(
      {
        storeId: a.store.id,
        customerId: wonLeadCustomer.data.customer.id,
        vehicleId: longStock.id,
        origin: OPPORTUNITY_ORIGINS.WALK_IN,
        assigneeUserId: a.seller.id,
      },
      a.owner.id
    );
    assert.equal(wonOpp.ok, true);
    if (!wonOpp.ok) throw new Error(wonOpp.message);

    const stage = await changeOpportunityStage(
      {
        storeId: a.store.id,
        opportunityId: wonOpp.data.id,
        stage: OPPORTUNITY_STATUS.WON,
        resultNotes: 'Fechado no teste',
      },
      a.owner.id
    );
    assert.equal(stage.ok, true);

    const overdue = await scheduleFollowUp(
      {
        storeId: a.store.id,
        opportunityId: lead.data.id,
        title: 'Retornar cliente',
        dueAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        assignedToUserId: a.seller.id,
      },
      a.owner.id
    );
    assert.equal(overdue.ok, true);

    const reservationCustomer = await createCustomer(
      {
        storeId: a.store.id,
        name: 'Reserva Dash',
        phone: '19970003333',
        source: OPPORTUNITY_ORIGINS.FORM,
        dataPurpose: 'commercial_contact',
      },
      a.owner.id
    );
    assert.equal(reservationCustomer.ok, true);
    if (!reservationCustomer.ok) throw new Error(reservationCustomer.message);

    const reservation = await createReservation(
      {
        storeId: a.store.id,
        vehicleId: reservedVehicle.id,
        customerId: reservationCustomer.data.customer.id,
        expiresAt: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(),
        durationHours: 12,
        assigneeUserId: a.seller.id,
      },
      a.owner.id
    );
    assert.equal(reservation.ok, true);

    const saleCustomer = await createCustomer(
      {
        storeId: a.store.id,
        name: 'Compra Dash',
        phone: '19970004444',
        source: OPPORTUNITY_ORIGINS.STOREFRONT,
        dataPurpose: 'commercial_contact',
      },
      a.owner.id
    );
    assert.equal(saleCustomer.ok, true);
    if (!saleCustomer.ok) throw new Error(saleCustomer.message);

    const sale = await createSale(
      {
        storeId: a.store.id,
        vehicleId: available.id,
        customerId: saleCustomer.data.customer.id,
        sellerUserId: a.seller.id,
        negotiatedPriceCents: 6500000,
        modality: SALE_MODALITIES.CASH,
        soldAt: now.toISOString(),
      },
      a.seller.id
    );
    assert.equal(sale.ok, true);
    if (!sale.ok) throw new Error(sale.message);
    assert.equal(sale.data.grossResultCents, 1500000);

    const incompleteVehicle = await seedVehicle(
      a.store.id,
      a.owner.id,
      'DSH1E55',
      VEHICLE_STATUS.AVAILABLE,
      enteredRecent
    );
    const incompleteCustomer = await createCustomer(
      {
        storeId: a.store.id,
        name: 'Sem custo',
        phone: '19970005555',
        source: OPPORTUNITY_ORIGINS.OTHER,
        dataPurpose: 'commercial_contact',
      },
      a.owner.id
    );
    assert.equal(incompleteCustomer.ok, true);
    if (!incompleteCustomer.ok) throw new Error(incompleteCustomer.message);

    const incompleteSale = await createSale(
      {
        storeId: a.store.id,
        vehicleId: incompleteVehicle.id,
        customerId: incompleteCustomer.data.customer.id,
        sellerUserId: a.owner.id,
        negotiatedPriceCents: 4000000,
        modality: SALE_MODALITIES.CASH,
        soldAt: now.toISOString(),
      },
      a.owner.id
    );
    assert.equal(incompleteSale.ok, true);
    if (!incompleteSale.ok) throw new Error(incompleteSale.message);
    assert.equal(incompleteSale.data.grossResultCents, null);

    const cancelledVehicle = await seedVehicle(
      a.store.id,
      a.owner.id,
      'DSH1F66',
      VEHICLE_STATUS.AVAILABLE,
      enteredRecent
    );
    const cancelledCustomer = await createCustomer(
      {
        storeId: a.store.id,
        name: 'Cancelado',
        phone: '19970006666',
        source: OPPORTUNITY_ORIGINS.OTHER,
        dataPurpose: 'commercial_contact',
      },
      a.owner.id
    );
    assert.equal(cancelledCustomer.ok, true);
    if (!cancelledCustomer.ok) throw new Error(cancelledCustomer.message);

    const cancelledSale = await createSale(
      {
        storeId: a.store.id,
        vehicleId: cancelledVehicle.id,
        customerId: cancelledCustomer.data.customer.id,
        negotiatedPriceCents: 3000000,
        modality: SALE_MODALITIES.CASH,
        soldAt: now.toISOString(),
      },
      a.owner.id
    );
    assert.equal(cancelledSale.ok, true);
    if (!cancelledSale.ok) throw new Error(cancelledSale.message);

    const cancelled = await cancelSale(
      {
        storeId: a.store.id,
        saleId: cancelledSale.data.id,
        reason: 'Estorno no teste do dashboard',
      },
      a.owner.id
    );
    assert.equal(cancelled.ok, true);

    const dashA = await getDealerDashboardUncached(
      {
        storeId: a.store.id,
        preset: DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS,
      },
      a.owner.id
    );
    assert.equal(dashA.ok, true);
    if (!dashA.ok) throw new Error(dashA.message);

    assert.equal(dashA.data.operational.preparingVehicles, 1);
    assert.equal(dashA.data.operational.reservedVehicles, 1);
    assert.ok(dashA.data.operational.stockWithoutListing >= 1);
    assert.ok(dashA.data.operational.longStockVehicles >= 1);
    assert.equal(dashA.data.operational.overdueActivities, 1);
    assert.equal(dashA.data.operational.reservationsNearExpiry, 1);
    assert.equal(dashA.data.operational.customersAwaitingService, 1);

    assert.equal(dashA.data.commercial.salesCount, 2);
    assert.equal(dashA.data.commercial.negotiatedVolumeCents, 10500000);
    assert.equal(dashA.data.commercial.averageTicketCents, 5250000);
    assert.equal(dashA.data.commercial.incompleteGrossResultCount, 1);
    assert.equal(dashA.data.commercial.estimatedGrossResultCents, 1500000);
    assert.ok(dashA.data.commercial.leadsReceived >= 2);
    assert.equal(dashA.data.commercial.conversion.numerator, 1);
    assert.ok(dashA.data.commercial.conversion.denominator >= 2);
    assert.ok(dashA.data.commercial.conversion.rate !== null);
    assert.ok(dashA.data.commercial.salesBySeller.length >= 1);
    assert.equal(dashA.data.capabilities.canViewGrossResult, true);
    assert.equal(dashA.data.capabilities.canFilterSeller, true);

    const dashB = await getDealerDashboardUncached(
      {
        storeId: b.store.id,
        preset: DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS,
      },
      b.owner.id
    );
    assert.equal(dashB.ok, true);
    if (!dashB.ok) throw new Error(dashB.message);
    assert.equal(dashB.data.commercial.salesCount, 0);
    assert.equal(dashB.data.operational.availableVehicles, 1);

    const asOperator = await getDealerDashboardUncached(
      {
        storeId: a.store.id,
        preset: DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS,
      },
      a.operator.id
    );
    assert.equal(asOperator.ok, true);
    if (!asOperator.ok) throw new Error(asOperator.message);
    assert.equal(asOperator.data.capabilities.canViewGrossResult, false);
    assert.equal(asOperator.data.capabilities.canFilterSeller, false);
    assert.equal(asOperator.data.commercial.estimatedGrossResultCents, null);

    const forbiddenSellerFilter = await getDealerDashboardUncached(
      {
        storeId: a.store.id,
        preset: DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS,
        sellerUserId: a.seller.id,
      },
      a.operator.id
    );
    assert.equal(forbiddenSellerFilter.ok, false);
    if (forbiddenSellerFilter.ok) throw new Error('operador não filtra outro vendedor');
    assert.equal(forbiddenSellerFilter.code, 'FORBIDDEN');

    const filtered = await getDealerDashboardUncached(
      {
        storeId: a.store.id,
        preset: DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS,
        sellerUserId: a.seller.id,
      },
      a.owner.id
    );
    assert.equal(filtered.ok, true);
    if (!filtered.ok) throw new Error(filtered.message);
    assert.equal(filtered.data.commercial.salesCount, 1);
    assert.equal(filtered.data.commercial.negotiatedVolumeCents, 6500000);

    const outsidePeriod = await getDealerDashboardUncached(
      {
        storeId: a.store.id,
        preset: DASHBOARD_PERIOD_PRESETS.CUSTOM,
        from: '2020-01-01T00:00:00.000Z',
        to: '2020-01-31T23:59:59.999Z',
      },
      a.owner.id
    );
    assert.equal(outsidePeriod.ok, true);
    if (!outsidePeriod.ok) throw new Error(outsidePeriod.message);
    assert.equal(outsidePeriod.data.commercial.salesCount, 0);
    assert.equal(outsidePeriod.data.commercial.leadsReceived, 0);
  });
});
