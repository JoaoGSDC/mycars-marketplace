import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { MarketplaceVehicleDetailView } from '@features/marketplace/MarketplaceVehicleDetailView';
import { MarketplaceVehicleUnavailableView } from '@features/marketplace/MarketplaceVehicleUnavailableView';
import { brand } from '@config/brand';
import { services } from '@services';
import { resolveMediaUrl } from '@utils/media-url';

export const revalidate = 60;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const detail = await services.catalog.getVehicleDetail(slug);

  if (detail.status === 'not_found') {
    return {
      title: 'Anúncio não encontrado',
      robots: { index: false, follow: true },
    };
  }

  if (detail.status === 'unavailable') {
    const title = `${detail.make} ${detail.model} — indisponível | ${brand.name}`;

    return {
      title,
      description: 'Este anúncio não está disponível no momento.',
      alternates: { canonical: `/veiculos/${slug}` },
      robots: { index: false, follow: true },
    };
  }

  const { vehicle } = detail;
  const title = `${vehicle.make} ${vehicle.model} ${vehicle.version} ${vehicle.specs.yearModel} | ${brand.name}`;
  const description =
    vehicle.description.slice(0, 160) ||
    `${vehicle.make} ${vehicle.model} ${vehicle.version} à venda em ${vehicle.store.city}/${vehicle.store.state}.`;
  const image = resolveMediaUrl(vehicle, 'detail') ?? resolveMediaUrl(vehicle, 'card');

  return {
    title,
    description,
    alternates: { canonical: `/veiculos/${vehicle.slug}` },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: brand.locale,
      url: `/veiculos/${vehicle.slug}`,
      images: image
        ? [
            {
              url: image,
              alt: `${vehicle.make} ${vehicle.model}`,
            },
          ]
        : undefined,
    },
  };
}

export default async function VeiculoDetalhePage({ params }: { params: Params }) {
  const { slug } = await params;
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

  const { vehicle, storeContact, similar } = detail;
  const image = resolveMediaUrl(vehicle, 'detail') ?? resolveMediaUrl(vehicle, 'card');

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: `${vehicle.make} ${vehicle.model} ${vehicle.version}`,
    brand: { '@type': 'Brand', name: vehicle.make },
    model: vehicle.model,
    vehicleModelDate: String(vehicle.specs.yearModel),
    mileageFromOdometer: {
      '@type': 'QuantitativeValue',
      value: vehicle.specs.mileageKm,
      unitCode: 'KMT',
    },
    color: vehicle.specs.color,
    description: vehicle.description || undefined,
    image: image ? [image] : undefined,
    offers: {
      '@type': 'Offer',
      url: `/veiculos/${vehicle.slug}`,
      priceCurrency: 'BRL',
      price: vehicle.price,
      availability:
        vehicle.status === 'reserved'
          ? 'https://schema.org/PreOrder'
          : 'https://schema.org/InStock',
      seller: {
        '@type': 'AutoDealer',
        name: vehicle.store.name,
        address: {
          '@type': 'PostalAddress',
          addressLocality: vehicle.store.city,
          addressRegion: vehicle.store.state,
          addressCountry: 'BR',
        },
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
        vehicle={vehicle}
        storeContact={storeContact}
        similar={similar}
      />
    </>
  );
}
