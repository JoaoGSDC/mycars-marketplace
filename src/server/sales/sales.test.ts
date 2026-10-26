import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { migrate } from 'drizzle-orm/libsql/migrator';

const TEST_DB = resolve(process.cwd(), '.data/test-sales.db');

describe('módulo de vendas', () => {
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

    const owner = await createUser({ email, name: 'Owner Sale' });
    assert.equal(owner.ok, true);
    if (!owner.ok) throw new Error(owner.message);

    await addStoreMember({
      storeId: store.data.id,
      userId: owner.data.id,
      role: STORE_ROLES.OWNER,
    });

    const seller = await createUser({ email: `seller-${email}`, name: 'Seller Sale' });
    assert.equal(seller.ok, true);
    if (!seller.ok) throw new Error(seller.message);

    await addStoreMember({
      storeId: store.data.id,
      userId: seller.data.id,
      role: STORE_ROLES.SELLER,
    });

    const operator = await createUser({ email: `op-${email}`, name: 'Op Sale' });
    assert.equal(operator.ok, true);
    if (!operator.ok) throw new Error(operator.message);

    await addStoreMember({
      storeId: store.data.id,
      userId: operator.data.id,
      role: STORE_ROLES.OPERATOR,
    });

    return { store: store.data, owner: owner.data, seller: seller.data, operator: operator.data };
  }

  async function seedAvailableVehicle(storeId: string, actorUserId: string, plate: string) {
    const { createVehicle } = await import('@server/vehicles/vehicles.service');
    const { VEHICLE_STATUS } = await import('@app-types/status');
    const { VEHICLE_OWNERSHIP } = await import('@app-types/membership');
    const { insertVehicleMedia } = await import('@server/repositories/vehicle-media.repository');

    const vehicle = await createVehicle(
      {
        storeId,
        make: 'VW',
        makeSlug: 'vw',
        model: 'Golf',
        modelSlug: 'golf',
        version: 'TSI',
        condition: 'used',
        status: VEHICLE_STATUS.AVAILABLE,
        ownership: VEHICLE_OWNERSHIP.OWN,
        enteredAt: new Date().toISOString(),
        mileageKm: 30000,
        fuel: 'flex',
        transmission: 'automatic',
        yearManufacture: 2019,
        yearModel: 2020,
        bodyType: 'hatch',
        plate,
        askingPriceCents: 8000000,
      },
      actorUserId
    );
    assert.equal(vehicle.ok, true);
    if (!vehicle.ok) throw new Error(vehicle.message);

    await insertVehicleMedia({
      storeId,
      vehicleId: vehicle.data.id,
      url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800',
      cardUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400',
      detailUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1200',
      sortOrder: 0,
      isPrimary: 'true',
    });

    return vehicle.data;
  }

  async function seedCustomer(storeId: string, actorUserId: string, phone: string) {
    const { createCustomer } = await import('@server/crm/customers.service');
    const { OPPORTUNITY_ORIGINS } = await import('@app-types/crm');

    const customer = await createCustomer(
      {
        storeId,
        name: 'Comprador Teste',
        phone,
        source: OPPORTUNITY_ORIGINS.WALK_IN,
        dataPurpose: 'commercial_contact',
      },
      actorUserId
    );
    assert.equal(customer.ok, true);
    if (!customer.ok) throw new Error(customer.message);

    return customer.data.customer;
  }

  it('venda direta, via oportunidade, reservado, duplicata, cancelamento, permissão e isolamento', async () => {
    const { createSale, cancelSale, getSaleDetail, searchSales } = await import(
      '@server/sales/sales.service'
    );
    const { createReservation } = await import('@server/reservations/reservations.service');
    const { createOpportunity, getOpportunityDetail } = await import(
      '@server/crm/opportunities.service'
    );
    const { createListingForStore, transitionListing, getPublicVehicleListingBySlug } =
      await import('@server/listings/listings.service');
    const { getVehicleInStore, addVehicleCost } = await import('@server/vehicles/vehicles.service');
    const { SALE_MODALITIES } = await import('@app-types/sale');
    const { OPPORTUNITY_ORIGINS } = await import('@app-types/crm');
    const {
      LISTING_STATUS,
      OPPORTUNITY_STATUS,
      RESERVATION_STATUS,
      SALE_STATUS,
      VEHICLE_STATUS,
    } = await import('@app-types/status');
    const { findActiveReservationForVehicle } = await import(
      '@server/repositories/reservations.repository'
    );

    const a = await seedStore('sale-loja-a', 'owner-a@sale.test');
    const b = await seedStore('sale-loja-b', 'owner-b@sale.test');

    const vehicleDirect = await seedAvailableVehicle(a.store.id, a.owner.id, 'SAL1A11');
    const customerA = await seedCustomer(a.store.id, a.owner.id, '19910001111');

    const cost = await addVehicleCost(
      {
        storeId: a.store.id,
        vehicleId: vehicleDirect.id,
        type: 'acquisition',
        amountCents: 6000000,
        incurredAt: new Date().toISOString(),
        description: 'Compra',
      },
      a.owner.id
    );
    assert.equal(cost.ok, true);
    if (!cost.ok) throw new Error(cost.message);

    const media = await import('@server/repositories/vehicle-media.repository').then((m) =>
      m.listMediaByVehicle(a.store.id, vehicleDirect.id)
    );
    const listing = await createListingForStore(
      {
        storeId: a.store.id,
        vehicleId: vehicleDirect.id,
        title: 'Golf TSI',
        description: 'Anúncio de teste de venda',
        priceCents: 8200000,
        mediaIds: [media[0]!.id],
        status: LISTING_STATUS.DRAFT,
      },
      a.owner.id
    );
    assert.equal(listing.ok, true);
    if (!listing.ok) throw new Error(listing.message);

    await transitionListing(
      {
        storeId: a.store.id,
        listingId: listing.data.id,
        toStatus: LISTING_STATUS.PUBLISHED,
      },
      a.owner.id
    );

    const forbidden = await createSale(
      {
        storeId: a.store.id,
        vehicleId: vehicleDirect.id,
        customerId: customerA.id,
        negotiatedPriceCents: 7900000,
        modality: SALE_MODALITIES.CASH,
      },
      a.operator.id
    );
    assert.equal(forbidden.ok, false);
    if (forbidden.ok) throw new Error('operador não vende');
    assert.equal(forbidden.code, 'FORBIDDEN');

    const direct = await createSale(
      {
        storeId: a.store.id,
        vehicleId: vehicleDirect.id,
        customerId: customerA.id,
        sellerUserId: a.seller.id,
        negotiatedPriceCents: 7900000,
        modality: SALE_MODALITIES.CASH,
        notes: 'Venda direta no estoque',
      },
      a.seller.id
    );
    assert.equal(direct.ok, true);
    if (!direct.ok) throw new Error(direct.message);
    assert.equal(direct.data.status, SALE_STATUS.COMPLETED);
    assert.equal(direct.data.grossResultCents, 1900000);

    const vehicleSold = await getVehicleInStore(a.store.id, vehicleDirect.id, a.owner.id);
    assert.equal(vehicleSold.ok, true);
    if (!vehicleSold.ok) throw new Error(vehicleSold.message);
    assert.equal(vehicleSold.data.status, VEHICLE_STATUS.SOLD);

    assert.equal(await getPublicVehicleListingBySlug(listing.data.slug), undefined);

    const duplicate = await createSale(
      {
        storeId: a.store.id,
        vehicleId: vehicleDirect.id,
        customerId: customerA.id,
        negotiatedPriceCents: 7000000,
        modality: SALE_MODALITIES.CASH,
      },
      a.owner.id
    );
    assert.equal(duplicate.ok, false);
    if (duplicate.ok) throw new Error('duplicata deveria falhar');
    assert.equal(duplicate.code, 'CONFLICT');

    const cancelled = await cancelSale(
      {
        storeId: a.store.id,
        saleId: direct.data.id,
        reason: 'Cliente desistiu antes do pagamento',
      },
      a.owner.id
    );
    assert.equal(cancelled.ok, true);
    if (!cancelled.ok) throw new Error(cancelled.message);
    assert.equal(cancelled.data.status, SALE_STATUS.CANCELLED);

    const vehicleBack = await getVehicleInStore(a.store.id, vehicleDirect.id, a.owner.id);
    assert.equal(vehicleBack.ok, true);
    if (!vehicleBack.ok) throw new Error(vehicleBack.message);
    assert.equal(vehicleBack.data.status, VEHICLE_STATUS.AVAILABLE);
    assert.equal(await getPublicVehicleListingBySlug(listing.data.slug), undefined);

    const vehicleOpp = await seedAvailableVehicle(a.store.id, a.owner.id, 'SAL2B22');
    const customerOpp = await seedCustomer(a.store.id, a.owner.id, '19920002222');
    const opportunity = await createOpportunity(
      {
        storeId: a.store.id,
        customerId: customerOpp.id,
        vehicleId: vehicleOpp.id,
        origin: OPPORTUNITY_ORIGINS.MARKETPLACE,
        assigneeUserId: a.seller.id,
      },
      a.owner.id
    );
    assert.equal(opportunity.ok, true);
    if (!opportunity.ok) throw new Error(opportunity.message);

    const viaOpp = await createSale(
      {
        storeId: a.store.id,
        vehicleId: vehicleOpp.id,
        customerId: customerOpp.id,
        opportunityId: opportunity.data.id,
        negotiatedPriceCents: 7500000,
        modality: SALE_MODALITIES.FINANCED,
        hasTradeIn: true,
        tradeInDescription: 'Fiat Uno 2012 trocado como entrada',
      },
      a.seller.id
    );
    assert.equal(viaOpp.ok, true);
    if (!viaOpp.ok) throw new Error(viaOpp.message);

    const oppDetail = await getOpportunityDetail(
      a.store.id,
      opportunity.data.id,
      a.owner.id
    );
    assert.equal(oppDetail.ok, true);
    if (!oppDetail.ok) throw new Error(oppDetail.message);
    assert.equal(oppDetail.data.opportunity.stage, OPPORTUNITY_STATUS.WON);

    const vehicleReserved = await seedAvailableVehicle(a.store.id, a.owner.id, 'SAL3C33');
    const customerRes = await seedCustomer(a.store.id, a.owner.id, '19930003333');
    const reservation = await createReservation(
      {
        storeId: a.store.id,
        vehicleId: vehicleReserved.id,
        customerId: customerRes.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        durationHours: 24,
      },
      a.seller.id
    );
    assert.equal(reservation.ok, true);
    if (!reservation.ok) throw new Error(reservation.message);

    const saleReserved = await createSale(
      {
        storeId: a.store.id,
        vehicleId: vehicleReserved.id,
        customerId: customerRes.id,
        negotiatedPriceCents: 7100000,
        modality: SALE_MODALITIES.MIXED,
      },
      a.owner.id
    );
    assert.equal(saleReserved.ok, true);
    if (!saleReserved.ok) throw new Error(saleReserved.message);

    const activeAfter = await findActiveReservationForVehicle(vehicleReserved.id);
    assert.equal(activeAfter, undefined);

    const detail = await getSaleDetail(a.store.id, saleReserved.data.id, a.owner.id);
    assert.equal(detail.ok, true);
    if (!detail.ok) throw new Error(detail.message);
    assert.ok(detail.data.events.length >= 1);

    const listB = await searchSales(
      { storeId: b.store.id, page: 1, pageSize: 20 },
      b.owner.id
    );
    assert.equal(listB.ok, true);
    if (!listB.ok) throw new Error(listB.message);
    assert.equal(listB.data.total, 0);

    const cross = await createSale(
      {
        storeId: b.store.id,
        vehicleId: vehicleOpp.id,
        customerId: customerOpp.id,
        negotiatedPriceCents: 100,
        modality: SALE_MODALITIES.CASH,
      },
      b.owner.id
    );
    assert.equal(cross.ok, false);

    void RESERVATION_STATUS;
  });

  it('concorrência: no máximo uma venda concluída e rollback do perdedor', async () => {
    const { createSale } = await import('@server/sales/sales.service');
    const { getVehicleInStore } = await import('@server/vehicles/vehicles.service');
    const { SALE_MODALITIES } = await import('@app-types/sale');
    const { SALE_STATUS, VEHICLE_STATUS } = await import('@app-types/status');
    const { findCompletedSaleForVehicle } = await import(
      '@server/repositories/sales.repository'
    );

    const a = await seedStore('sale-race', 'race@sale.test');
    const vehicle = await seedAvailableVehicle(a.store.id, a.owner.id, 'RACE911');
    const customer = await seedCustomer(a.store.id, a.owner.id, '19944445555');

    const payload = {
      storeId: a.store.id,
      vehicleId: vehicle.id,
      customerId: customer.id,
      negotiatedPriceCents: 7000000,
      modality: SALE_MODALITIES.CASH,
    };

    const [r1, r2] = await Promise.all([
      createSale(payload, a.owner.id),
      createSale(payload, a.seller.id),
    ]);

    const oks = [r1, r2].filter((r) => r.ok);
    const conflicts = [r1, r2].filter((r) => !r.ok && r.code === 'CONFLICT');

    assert.ok(oks.length <= 1, 'no máximo uma venda criada com sucesso');
    assert.ok(oks.length + conflicts.length === 2, 'perdedor deve receber CONFLICT');

    const completed = await findCompletedSaleForVehicle(vehicle.id);
    assert.ok(completed);
    assert.equal(completed?.status, SALE_STATUS.COMPLETED);

    const vehicleRow = await getVehicleInStore(a.store.id, vehicle.id, a.owner.id);
    assert.equal(vehicleRow.ok, true);
    if (!vehicleRow.ok) throw new Error(vehicleRow.message);
    assert.equal(vehicleRow.data.status, VEHICLE_STATUS.SOLD);
  });
});
