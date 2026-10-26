import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { count, eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/libsql/migrator';

const TEST_DB = resolve(process.cwd(), '.data/test-crm.db');

describe('módulo CRM (clientes e oportunidades)', () => {
  before(async () => {
    rmSync(TEST_DB, { force: true });
    mkdirSync(dirname(TEST_DB), { recursive: true });

    process.env.TURSO_DATABASE_URL = `file:${TEST_DB}`;
    delete process.env.TURSO_AUTH_TOKEN;

    const { resetDbSingletons, getDb } = await import('@lib/db');
    resetDbSingletons();
    const db = getDb();
    await migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
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

    const user = await createUser({ email, name: 'Owner CRM' });
    assert.equal(user.ok, true);
    if (!user.ok) throw new Error(user.message);

    const membership = await addStoreMember({
      storeId: store.data.id,
      userId: user.data.id,
      role: STORE_ROLES.OWNER,
    });
    assert.equal(membership.ok, true);

    const seller = await createUser({
      email: `seller-${email}`,
      name: 'Seller CRM',
    });
    assert.equal(seller.ok, true);
    if (!seller.ok) throw new Error(seller.message);

    const sellerMembership = await addStoreMember({
      storeId: store.data.id,
      userId: seller.data.id,
      role: STORE_ROLES.SELLER,
    });
    assert.equal(sellerMembership.ok, true);

    return { store: store.data, user: user.data, seller: seller.data };
  }

  it('cadastro, duplicidade, oportunidade, etapa, atribuição, atividade e isolamento', async () => {
    const { createCustomer, searchCustomers, getCustomerDetail } = await import(
      '@server/crm/customers.service'
    );
    const {
      createOpportunity,
      changeOpportunityStage,
      assignOpportunity,
      addOpportunityActivity,
      getOpportunityDetail,
      searchOpportunities,
      scheduleFollowUp,
      completeFollowUp,
    } = await import('@server/crm/opportunities.service');
    const { OPPORTUNITY_ORIGINS } = await import('@app-types/crm');
    const { OPPORTUNITY_STATUS } = await import('@app-types/status');

    const a = await seedStore('crm-loja-a', 'owner-a@crm.test');
    const b = await seedStore('crm-loja-b', 'owner-b@crm.test');

    const created = await createCustomer(
      {
        storeId: a.store.id,
        name: 'Maria Silva',
        phone: '(19) 98888-1000',
        source: OPPORTUNITY_ORIGINS.WALK_IN,
      },
      a.user.id
    );
    assert.equal(created.ok, true);
    if (!created.ok) throw new Error(created.message);

    const dup = await createCustomer(
      {
        storeId: a.store.id,
        name: 'Maria Outra',
        phone: '19988881000',
        source: OPPORTUNITY_ORIGINS.OTHER,
      },
      a.user.id
    );
    assert.equal(dup.ok, false);
    if (dup.ok) throw new Error('deveria detectar duplicado');
    assert.equal(dup.code, 'CONFLICT');

    const forced = await createCustomer(
      {
        storeId: a.store.id,
        name: 'Maria Forçada',
        phone: '19988881000',
        source: OPPORTUNITY_ORIGINS.OTHER,
        allowDuplicate: true,
      },
      a.user.id
    );
    assert.equal(forced.ok, true);

    const otherStoreCustomer = await createCustomer(
      {
        storeId: b.store.id,
        name: 'Maria Silva',
        phone: '(19) 98888-1000',
        source: OPPORTUNITY_ORIGINS.WALK_IN,
      },
      b.user.id
    );
    assert.equal(otherStoreCustomer.ok, true);
    if (!otherStoreCustomer.ok) throw new Error(otherStoreCustomer.message);

    const search = await searchCustomers(
      { storeId: a.store.id, q: '98888', page: 1, pageSize: 20 },
      a.user.id
    );
    assert.equal(search.ok, true);
    if (!search.ok) throw new Error(search.message);
    assert.ok(search.data.total >= 2);

    const crossRead = await getCustomerDetail(
      a.store.id,
      otherStoreCustomer.data.customer.id,
      a.user.id
    );
    assert.equal(crossRead.ok, false);

    const opportunity = await createOpportunity(
      {
        storeId: a.store.id,
        customerId: created.data.customer.id,
        origin: OPPORTUNITY_ORIGINS.WHATSAPP_MANUAL,
        notes: 'Ligou pedindo Corolla',
        assigneeUserId: a.seller.id,
      },
      a.user.id
    );
    assert.equal(opportunity.ok, true);
    if (!opportunity.ok) throw new Error(opportunity.message);
    assert.equal(opportunity.data.assigneeUserId, a.seller.id);
    assert.equal(opportunity.data.stage, OPPORTUNITY_STATUS.NEW_LEAD);

    const stage = await changeOpportunityStage(
      {
        storeId: a.store.id,
        opportunityId: opportunity.data.id,
        stage: OPPORTUNITY_STATUS.IN_SERVICE,
      },
      a.seller.id
    );
    assert.equal(stage.ok, true);
    if (!stage.ok) throw new Error(stage.message);
    assert.equal(stage.data.stage, OPPORTUNITY_STATUS.IN_SERVICE);

    const reassign = await assignOpportunity(
      {
        storeId: a.store.id,
        opportunityId: opportunity.data.id,
        assigneeUserId: a.user.id,
      },
      a.user.id
    );
    assert.equal(reassign.ok, true);

    const activity = await addOpportunityActivity(
      {
        storeId: a.store.id,
        opportunityId: opportunity.data.id,
        type: 'contact',
        body: 'Conversei por telefone; cliente virá amanhã.',
      },
      a.user.id
    );
    assert.equal(activity.ok, true);

    const dueAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const task = await scheduleFollowUp(
      {
        storeId: a.store.id,
        opportunityId: opportunity.data.id,
        title: 'Confirmar visita',
        dueAt,
      },
      a.user.id
    );
    assert.equal(task.ok, true);
    if (!task.ok) throw new Error(task.message);

    const completed = await completeFollowUp(
      { storeId: a.store.id, taskId: task.data.id },
      a.user.id
    );
    assert.equal(completed.ok, true);

    const detail = await getOpportunityDetail(a.store.id, opportunity.data.id, a.user.id);
    assert.equal(detail.ok, true);
    if (!detail.ok) throw new Error(detail.message);
    assert.ok(detail.data.activities.length >= 3);
    assert.equal(detail.data.tasks[0]?.status, 'done');

    const dismiss = await changeOpportunityStage(
      {
        storeId: a.store.id,
        opportunityId: opportunity.data.id,
        stage: OPPORTUNITY_STATUS.DISMISSED,
        resultNotes: 'Contato duplicado',
      },
      a.user.id
    );
    assert.equal(dismiss.ok, true);
    if (!dismiss.ok) throw new Error(dismiss.message);
    assert.equal(dismiss.data.stage, OPPORTUNITY_STATUS.DISMISSED);
    assert.ok(dismiss.data.closedAt);

    const crossOpp = await getOpportunityDetail(b.store.id, opportunity.data.id, b.user.id);
    assert.equal(crossOpp.ok, false);

    const listB = await searchOpportunities(
      { storeId: b.store.id, page: 1, pageSize: 20 },
      b.user.id
    );
    assert.equal(listB.ok, true);
    if (!listB.ok) throw new Error(listB.message);
    assert.equal(listB.data.total, 0);
  });

  it('lead via formulário público cria cliente e oportunidade; WhatsApp não cria lead', async () => {
    const { createStore } = await import('@server/stores/stores.service');
    const { createUser, addStoreMember } = await import('@server/users/users.service');
    const { createVehicle } = await import('@server/vehicles/vehicles.service');
    const { createListingForStore, transitionListing } = await import(
      '@server/listings/listings.service'
    );
    const { insertVehicleMedia } = await import('@server/repositories/vehicle-media.repository');
    const { createListingLead, registerWhatsAppClick } = await import(
      '@server/leads/leads.service'
    );
    const { searchCustomers } = await import('@server/crm/customers.service');
    const { searchOpportunities } = await import('@server/crm/opportunities.service');
    const { STORE_STATUS, VEHICLE_STATUS, LISTING_STATUS, OPPORTUNITY_STATUS } = await import(
      '@app-types/status'
    );
    const { STORE_ROLES, VEHICLE_OWNERSHIP } = await import('@app-types/membership');
    const { getDb, listingEngagementEvents } = await import('@lib/db');

    const store = await createStore({
      legalName: 'Lead Public LTDA',
      tradeName: 'Lead Public',
      publicName: 'Lead Public',
      slug: 'crm-lead-public',
      subdomain: 'crmleadpublic',
      city: 'Campinas',
      state: 'SP',
      status: STORE_STATUS.ACTIVE,
      verified: true,
    });
    assert.equal(store.ok, true);
    if (!store.ok) throw new Error(store.message);

    const user = await createUser({ email: 'lead-public@crm.test', name: 'Owner' });
    assert.equal(user.ok, true);
    if (!user.ok) throw new Error(user.message);

    await addStoreMember({
      storeId: store.data.id,
      userId: user.data.id,
      role: STORE_ROLES.OWNER,
    });

    const vehicle = await createVehicle(
      {
        storeId: store.data.id,
        make: 'Honda',
        makeSlug: 'honda',
        model: 'Civic',
        modelSlug: 'civic',
        version: 'EXL',
        condition: 'used',
        status: VEHICLE_STATUS.AVAILABLE,
        ownership: VEHICLE_OWNERSHIP.OWN,
        enteredAt: new Date().toISOString(),
        mileageKm: 20000,
        fuel: 'flex',
        transmission: 'automatic',
        yearManufacture: 2021,
        yearModel: 2022,
        bodyType: 'sedan',
        plate: 'CRM1A23',
        askingPriceCents: 12000000,
      },
      user.data.id
    );
    assert.equal(vehicle.ok, true);
    if (!vehicle.ok) throw new Error(vehicle.message);

    const media = await insertVehicleMedia({
      storeId: store.data.id,
      vehicleId: vehicle.data.id,
      url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800',
      cardUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400',
      detailUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1200',
      sortOrder: 0,
      isPrimary: 'true',
    });

    const listing = await createListingForStore(
      {
        storeId: store.data.id,
        vehicleId: vehicle.data.id,
        title: 'Civic EXL',
        description: 'Anúncio público de teste CRM',
        priceCents: 12000000,
        mediaIds: [media.id],
        status: LISTING_STATUS.DRAFT,
      },
      user.data.id
    );
    assert.equal(listing.ok, true);
    if (!listing.ok) throw new Error(listing.message);

    const published = await transitionListing(
      {
        storeId: store.data.id,
        listingId: listing.data.id,
        toStatus: LISTING_STATUS.PUBLISHED,
      },
      user.data.id
    );
    assert.equal(published.ok, true);

    const lead = await createListingLead(
      {
        listingSlug: listing.data.slug,
        name: 'João Interesse',
        phone: '19977776666',
        message: 'Quero agendar visita neste fim de semana.',
        source: 'detail_form',
        originPath: `/veiculos/${listing.data.slug}`,
        company: '',
        formOpenedAt: Date.now() - 5000,
      },
      { ip: '203.0.113.10', userAgent: 'test' }
    );
    assert.equal(lead.ok, true);
    if (!lead.ok) throw new Error(lead.message);
    assert.ok(lead.data.opportunityId);
    assert.notEqual(lead.data.opportunityId, 'ignored');

    const customers = await searchCustomers(
      { storeId: store.data.id, q: 'João', page: 1, pageSize: 10 },
      user.data.id
    );
    assert.equal(customers.ok, true);
    if (!customers.ok) throw new Error(customers.message);
    assert.equal(customers.data.total, 1);

    const opps = await searchOpportunities(
      { storeId: store.data.id, page: 1, pageSize: 10 },
      user.data.id
    );
    assert.equal(opps.ok, true);
    if (!opps.ok) throw new Error(opps.message);
    assert.equal(opps.data.total, 1);
    assert.equal(opps.data.items[0]?.stage, OPPORTUNITY_STATUS.NEW_LEAD);
    assert.equal(opps.data.items[0]?.origin, 'marketplace');

    const click = await registerWhatsAppClick(
      {
        listingSlug: listing.data.slug,
        originPath: `/veiculos/${listing.data.slug}`,
      },
      { ip: '203.0.113.11', userAgent: 'test' }
    );
    assert.equal(click.ok, true);

    const oppsAfterClick = await searchOpportunities(
      { storeId: store.data.id, page: 1, pageSize: 10 },
      user.data.id
    );
    assert.equal(oppsAfterClick.ok, true);
    if (!oppsAfterClick.ok) throw new Error(oppsAfterClick.message);
    assert.equal(oppsAfterClick.data.total, 1);

    const db = getDb();
    const [engagementCount] = await db
      .select({ value: count() })
      .from(listingEngagementEvents)
      .where(eq(listingEngagementEvents.storeId, store.data.id));
    assert.equal(engagementCount?.value, 1);
  });
});
