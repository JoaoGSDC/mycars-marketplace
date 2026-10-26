/**
 * Completa a loja demo-autocenter até N anúncios publicados (dev).
 * Uso: ALLOW_DB_SEED=true npx tsx scripts/topup-demo-fleet.ts
 */
import { config } from 'dotenv';
import { and, count, eq } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  if (process.env.ALLOW_DB_SEED !== 'true') {
    throw new Error('Defina ALLOW_DB_SEED=true');
  }

  if (!process.env.TURSO_DATABASE_URL) {
    process.env.TURSO_DATABASE_URL = 'file:./.data/local.db';
  }

  if (!process.env.BETTER_AUTH_SECRET) {
    process.env.BETTER_AUTH_SECRET = 'dev-only-better-auth-secret-change-me';
  }

  const { LISTING_STATUS, VEHICLE_STATUS } = await import('../src/shared/types/status');
  const { VEHICLE_OWNERSHIP } = await import('../src/shared/types/membership');
  const { findStoreBySlug } = await import('../src/server/repositories/stores.repository');
  const { findUserByEmail } = await import('../src/server/repositories/users.repository');
  const { createVehicle } = await import('../src/server/vehicles/vehicles.service');
  const { createListing } = await import('../src/server/listings/listings.service');
  const { insertVehicleMedia } = await import('../src/server/repositories/vehicle-media.repository');
  const { getDb, listings } = await import('../src/shared/lib/db');

  const target = Number(process.env.DEMO_FLEET_TARGET ?? 10);
  const store = await findStoreBySlug('demo-autocenter');

  if (!store) {
    throw new Error('loja demo-autocenter não encontrada');
  }

  const user = await findUserByEmail('owner@demo-autocenter.example');

  if (!user) {
    throw new Error('owner demo não encontrado');
  }

  const [row] = await getDb()
    .select({ value: count() })
    .from(listings)
    .where(and(eq(listings.storeId, store.id), eq(listings.status, LISTING_STATUS.PUBLISHED)));

  const current = Number(row?.value ?? 0);
  const need = Math.max(0, target - current);

  console.log({ store: store.slug, current, target, need });

  if (need === 0) {
    console.log('Já há estoque suficiente.');
    return;
  }

  const fleet = [
    {
      make: 'Toyota',
      makeSlug: 'toyota',
      model: 'Corolla',
      modelSlug: 'corolla',
      version: '2.0 XEi',
      slug: 'toyota-corolla-xei',
      title: 'Toyota Corolla 2.0 XEi',
      price: 12990000,
      km: 41000,
      year: 2022,
      fuel: 'flex' as const,
      transmission: 'automatic' as const,
      bodyType: 'sedan' as const,
      color: 'Prata',
      photo: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=1200',
    },
    {
      make: 'Honda',
      makeSlug: 'honda',
      model: 'HR-V',
      modelSlug: 'hr-v',
      version: '1.5 EXL',
      slug: 'honda-hrv-exl',
      title: 'Honda HR-V 1.5 EXL',
      price: 13990000,
      km: 28000,
      year: 2023,
      fuel: 'flex' as const,
      transmission: 'cvt' as const,
      bodyType: 'suv' as const,
      color: 'Cinza',
      photo: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1200',
    },
    {
      make: 'Jeep',
      makeSlug: 'jeep',
      model: 'Compass',
      modelSlug: 'compass',
      version: '1.3 T270',
      slug: 'jeep-compass-t270',
      title: 'Jeep Compass 1.3 T270',
      price: 16990000,
      km: 19000,
      year: 2023,
      fuel: 'flex' as const,
      transmission: 'automatic' as const,
      bodyType: 'suv' as const,
      color: 'Preto',
      photo: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=1200',
    },
    {
      make: 'Chevrolet',
      makeSlug: 'chevrolet',
      model: 'Onix',
      modelSlug: 'onix',
      version: '1.0 Turbo',
      slug: 'chevrolet-onix-turbo',
      title: 'Chevrolet Onix 1.0 Turbo',
      price: 7990000,
      km: 35000,
      year: 2021,
      fuel: 'flex' as const,
      transmission: 'automatic' as const,
      bodyType: 'hatch' as const,
      color: 'Vermelho',
      photo: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200',
    },
    {
      make: 'Hyundai',
      makeSlug: 'hyundai',
      model: 'Creta',
      modelSlug: 'creta',
      version: '1.0 TGDI',
      slug: 'hyundai-creta-tgdi',
      title: 'Hyundai Creta 1.0 TGDI',
      price: 11990000,
      km: 22000,
      year: 2022,
      fuel: 'flex' as const,
      transmission: 'automatic' as const,
      bodyType: 'suv' as const,
      color: 'Branco',
      photo: 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=1200',
    },
    {
      make: 'Fiat',
      makeSlug: 'fiat',
      model: 'Pulse',
      modelSlug: 'pulse',
      version: '1.3 Audace',
      slug: 'fiat-pulse-audace',
      title: 'Fiat Pulse 1.3 Audace',
      price: 9490000,
      km: 18000,
      year: 2023,
      fuel: 'flex' as const,
      transmission: 'automatic' as const,
      bodyType: 'suv' as const,
      color: 'Azul',
      photo: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1200',
    },
    {
      make: 'Volkswagen',
      makeSlug: 'volkswagen',
      model: 'T-Cross',
      modelSlug: 't-cross',
      version: '1.4 TSI',
      slug: 'vw-tcross-tsi',
      title: 'Volkswagen T-Cross 1.4 TSI',
      price: 10990000,
      km: 27000,
      year: 2022,
      fuel: 'flex' as const,
      transmission: 'automatic' as const,
      bodyType: 'suv' as const,
      color: 'Cinza',
      photo: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200',
    },
    {
      make: 'Nissan',
      makeSlug: 'nissan',
      model: 'Kicks',
      modelSlug: 'kicks',
      version: '1.6 Exclusive',
      slug: 'nissan-kicks-exclusive',
      title: 'Nissan Kicks 1.6 Exclusive',
      price: 10290000,
      km: 31000,
      year: 2021,
      fuel: 'flex' as const,
      transmission: 'cvt' as const,
      bodyType: 'suv' as const,
      color: 'Prata',
      photo: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1200',
    },
    {
      make: 'Renault',
      makeSlug: 'renault',
      model: 'Duster',
      modelSlug: 'duster',
      version: '1.6 Iconic',
      slug: 'renault-duster-iconic',
      title: 'Renault Duster 1.6 Iconic',
      price: 8990000,
      km: 45000,
      year: 2020,
      fuel: 'flex' as const,
      transmission: 'manual' as const,
      bodyType: 'suv' as const,
      color: 'Laranja',
      photo: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1200',
    },
    {
      make: 'Ford',
      makeSlug: 'ford',
      model: 'Territory',
      modelSlug: 'territory',
      version: '1.5 GTDI',
      slug: 'ford-territory-gtdi',
      title: 'Ford Territory 1.5 GTDI',
      price: 14990000,
      km: 15000,
      year: 2023,
      fuel: 'flex' as const,
      transmission: 'automatic' as const,
      bodyType: 'suv' as const,
      color: 'Branco',
      photo: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=1200',
    },
  ];

  let created = 0;

  for (const item of fleet) {
    if (created >= need) {
      break;
    }

    const vehicleResult = await createVehicle(
      {
        storeId: store.id,
        make: item.make,
        makeSlug: item.makeSlug,
        model: item.model,
        modelSlug: item.modelSlug,
        version: item.version,
        condition: 'used',
        status: VEHICLE_STATUS.AVAILABLE,
        ownership: VEHICLE_OWNERSHIP.OWN,
        enteredAt: new Date().toISOString(),
        mileageKm: item.km,
        fuel: item.fuel,
        transmission: item.transmission,
        yearManufacture: item.year,
        yearModel: item.year,
        bodyType: item.bodyType,
        color: item.color,
      },
      user.id
    );

    if (!vehicleResult.ok) {
      console.warn('vehicle fail', item.slug, vehicleResult.message);
      continue;
    }

    const media = await insertVehicleMedia({
      storeId: store.id,
      vehicleId: vehicleResult.data.id,
      url: item.photo,
      cardUrl: item.photo.replace('w=1200', 'w=800'),
      detailUrl: item.photo.replace('w=1200', 'w=1600'),
      sortOrder: 0,
      isPrimary: 'true',
      alt: item.title,
    });

    const listingResult = await createListing({
      storeId: store.id,
      vehicleId: vehicleResult.data.id,
      slug: `${item.slug}-demo`,
      title: item.title,
      description: 'Veículo de demonstração para validar a grade da vitrine.',
      priceCents: item.price,
      status: LISTING_STATUS.PUBLISHED,
      featured: false,
      mediaIds: [media.id],
      publishedAt: new Date().toISOString(),
    });

    if (!listingResult.ok) {
      console.warn('listing fail', item.slug, listingResult.message);
      continue;
    }

    created += 1;
    console.log('ok', listingResult.data.slug);
  }

  const [after] = await getDb()
    .select({ value: count() })
    .from(listings)
    .where(and(eq(listings.storeId, store.id), eq(listings.status, LISTING_STATUS.PUBLISHED)));

  console.log('publicado agora:', Number(after?.value ?? 0));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
