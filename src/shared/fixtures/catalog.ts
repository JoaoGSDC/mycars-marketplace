import { slugify } from '@utils/slug';

export type CatalogModel = {
  slug: string;
  name: string;
};

export type CatalogMake = {
  slug: string;
  name: string;
  models: CatalogModel[];
};

function models(...names: string[]): CatalogModel[] {
  return names.map((name) => ({ name, slug: slugify(name) }));
}

/** Catálogo de marcas/modelos brasileiros comuns (fixture). */
export const fixtureCatalog: CatalogMake[] = [
  { slug: 'volkswagen', name: 'Volkswagen', models: models('Polo', 'Virtus', 'T-Cross', 'Nivus', 'Taos', 'Amarok') },
  { slug: 'fiat', name: 'Fiat', models: models('Argo', 'Cronos', 'Pulse', 'Fastback', 'Strada', 'Toro') },
  { slug: 'chevrolet', name: 'Chevrolet', models: models('Onix', 'Onix Plus', 'Tracker', 'Spin', 'S10', 'Montana') },
  { slug: 'toyota', name: 'Toyota', models: models('Corolla', 'Corolla Cross', 'Yaris', 'Hilux', 'SW4') },
  { slug: 'honda', name: 'Honda', models: models('City', 'Civic', 'HR-V', 'WR-V', 'CR-V') },
  { slug: 'hyundai', name: 'Hyundai', models: models('HB20', 'HB20S', 'Creta', 'Tucson', 'Santa Fe') },
  { slug: 'jeep', name: 'Jeep', models: models('Renegade', 'Compass', 'Commander', 'Wrangler') },
  { slug: 'nissan', name: 'Nissan', models: models('Kicks', 'Versa', 'Frontier', 'Sentra') },
  { slug: 'renault', name: 'Renault', models: models('Kwid', 'Stepway', 'Duster', 'Oroch', 'Captur') },
  { slug: 'byd', name: 'BYD', models: models('Dolphin', 'Yuan Plus', 'Song Plus', 'Seal') },
];

export const fixtureCatalogBySlug = Object.fromEntries(fixtureCatalog.map((m) => [m.slug, m])) as Record<
  string,
  CatalogMake
>;
