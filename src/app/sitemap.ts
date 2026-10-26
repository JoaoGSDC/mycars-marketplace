import type { MetadataRoute } from 'next';

import { getSiteOrigin } from '@config/site';
import { services } from '@services';
import { createEmptyVehicleSearchParams } from '@utils/vehicle-search-params';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteOrigin();
  const entries: MetadataRoute.Sitemap = [
    { url: `${origin}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${origin}/veiculos`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${origin}/lojas`, changeFrequency: 'daily', priority: 0.8 },
  ];

  try {
    const stores = await services.catalog.getVerifiedStores();

    for (const store of stores) {
      entries.push({
        url: store.subdomain
          ? (await services.storefront.getStorefrontBySlug(store.slug))?.canonicalUrl ??
            `${origin}/lojas/${store.slug}`
          : `${origin}/lojas/${store.slug}`,
        changeFrequency: 'daily',
        priority: 0.7,
      });
    }

    const catalog = await services.vehicleSearch.searchVehicles(
      createEmptyVehicleSearchParams(),
      { pageSize: 100 }
    );

    // Primeira página + até totalPaginas razoável
    const maxPages = Math.min(catalog.totalPaginas, 20);

    for (let page = 1; page <= maxPages; page += 1) {
      const result =
        page === 1
          ? catalog
          : await services.vehicleSearch.searchVehicles(
              { ...createEmptyVehicleSearchParams(), pagina: page },
              { pageSize: 100 }
            );

      for (const vehicle of result.items) {
        entries.push({
          url: `${origin}/veiculos/${vehicle.slug}`,
          lastModified: vehicle.publishedAt,
          changeFrequency: 'daily',
          priority: 0.6,
        });
      }
    }
  } catch {
    // sitemap degradado sem DB
  }

  return entries;
}
