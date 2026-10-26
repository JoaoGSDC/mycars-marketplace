import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { MarketplaceVehicleDetailView } from '@features/marketplace/MarketplaceVehicleDetailView';
import { MarketplaceVehicleUnavailableView } from '@features/marketplace/MarketplaceVehicleUnavailableView';
import { StorefrontMissingView } from '@features/storefront';
import { brand } from '@config/brand';
import { getSiteOrigin } from '@config/site';
import { services } from '@services';
import { resolveMediaUrl } from '@utils/media-url';

export const revalidate = 60;

type Params = Promise<{ slug: string }>;

/**
 * Detalhe do veículo no contexto da vitrine (subdomínio ou /vitrine/veiculos).
 * Canonical aponta para o marketplace para evitar conteúdo duplicado.
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const detail = await services.catalog.getVehicleDetail(slug);
  const siteOrigin = getSiteOrigin();

  if (detail.status !== 'available') {
    return {
      title: 'Anúncio indisponível',
      robots: { index: false, follow: true },
      alternates: { canonical: `${siteOrigin}/veiculos/${slug}` },
    };
  }

  const { vehicle } = detail;
  const title = `${vehicle.make} ${vehicle.model} ${vehicle.version} | ${brand.name}`;

  return {
    title,
    description: vehicle.description.slice(0, 160) || undefined,
    alternates: { canonical: `${siteOrigin}/veiculos/${vehicle.slug}` },
    robots: { index: false, follow: true },
  };
}

export default async function VitrineVeiculoPage({ params }: { params: Params }) {
  const { slug } = await params;
  const tenant = await services.storefront.resolveFromRequest();

  if (tenant.mode === 'missing_subdomain') {
    return <StorefrontMissingView subdomain={tenant.subdomain} />;
  }

  const storefront =
    tenant.mode === 'subdomain' || tenant.mode === 'preview' ? tenant.storefront : null;

  const detail = await services.catalog.getVehicleDetail(slug);

  if (detail.status === 'not_found') {
    notFound();
  }

  if (detail.status === 'unavailable') {
    return (
      <MarketplaceVehicleUnavailableView
        slug={detail.slug}
        make={detail.make}
        model={detail.model}
        version={detail.version}
        yearModel={detail.yearModel}
        reason={detail.reason}
        similar={detail.similar}
      />
    );
  }

  // No subdomínio, só exibe se o veículo pertence à loja do tenant
  if (storefront && detail.vehicle.store.id !== storefront.id) {
    notFound();
  }

  const image = resolveMediaUrl(detail.vehicle, 'detail') ?? resolveMediaUrl(detail.vehicle, 'card');
  const siteOrigin = getSiteOrigin();

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: `${detail.vehicle.make} ${detail.vehicle.model} ${detail.vehicle.version}`,
    url: `${siteOrigin}/veiculos/${detail.vehicle.slug}`,
    image: image ? [image] : undefined,
    offers: {
      '@type': 'Offer',
      url: `${siteOrigin}/veiculos/${detail.vehicle.slug}`,
      priceCurrency: 'BRL',
      price: detail.vehicle.price,
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'AutoDealer',
        name: detail.vehicle.store.name,
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <MarketplaceVehicleDetailView
        vehicle={detail.vehicle}
        storeContact={detail.storeContact}
        similar={
          storefront
            ? detail.similar.filter((item) => item.store.id === storefront.id)
            : detail.similar
        }
        storefront={storefront ?? undefined}
        storefrontMode={tenant.mode === 'preview' ? 'preview' : 'subdomain'}
      />
    </>
  );
}
