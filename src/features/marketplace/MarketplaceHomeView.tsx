import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, FileText, MessageCircle } from 'lucide-react';

import { PageShell, SiteFooter } from '@components/layout';
import {
  BentoGrid,
  BrandCard,
  CTABanner,
  ImageOverlayCard,
  StatCard,
  VehicleCard,
} from '@components/marketplace';
import { Button, DeviceFrame, Eyebrow, FeatureItem, Heading, ImagePlaceholder, SectionHeader } from '@components/ui';
import { brand } from '@config/brand';
import { services } from '@services';
import { formatCount } from '@utils/format';
import {
  buildVehicleSearchHref,
  createEmptyVehicleSearchParams,
} from '@utils/vehicle-search-params';

import { HomeCategories } from './components/HomeCategories';
import { HomeLatestListings } from './components/HomeLatestListings';
import { HomeNewsletter } from './components/HomeNewsletter';
import { HomeStickyHeader } from './components/HomeStickyHeader';
import { HomeStoresShowcase } from './components/HomeStoresShowcase';
import { MarketplaceHomeSearch } from './components/MarketplaceHomeSearch';
import { BODY_TYPE_IMAGES, VEHICLE_IMAGE_POOL } from '@fixtures/vehicle-images';

import { resolveHeroImageSrc } from './lib/hero-image';
import { homeContent } from './marketplace.home.content';
import styles from './styles.module.css';

/**
 * Home pública do marketplace.
 * revalidate=60 na page: estoque público não deve mostrar vendido por muito tempo.
 */
export async function MarketplaceHomeView() {
  const copy = homeContent;
  const heroSrc = await resolveHeroImageSrc();

  const [categories, stores, stats, latestAll, latestNew, latestSeminew, latestUsed, searchBootstrap] =
    await Promise.all([
      services.catalog.getCategoryCountsWithSearch(),
      services.catalog.getVerifiedStores(),
      services.catalog.getMarketStats(),
      services.catalog.getLatestVehicles('all', 6),
      services.catalog.getLatestVehicles('novo', 6),
      services.catalog.getLatestVehicles('seminovo', 6),
      services.catalog.getLatestVehicles('usado', 6),
      services.vehicleSearch.searchVehicles(createEmptyVehicleSearchParams()),
    ]);

  const categoryItemsTyped = categories.map((item) => ({
    id: item.body,
    label: item.label,
    availableCount: item.count,
    imageUrl: BODY_TYPE_IMAGES[item.body],
    href: buildVehicleSearchHref({
      carroceria: [item.searchValue as 'hatch' | 'sedan' | 'suv' | 'picape' | 'utilitario'],
    }),
  }));

  const previewVehicle = latestAll[0];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: brand.name,
        url: '/',
        email: brand.email,
        description: brand.tagline,
      },
      {
        '@type': 'WebSite',
        name: brand.name,
        url: '/',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: '/veiculos?q={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <PageShell className={styles.marketplaceHome}>
      <a href="#conteudo" className={styles.marketplaceHome__skip}>
        {copy.skipLink}
      </a>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        className={styles.marketplaceHome__jsonLd}
      />

      <div className={styles.marketplaceHome__heroShell}>
        <section className={styles.marketplaceHome__hero} aria-labelledby="home-hero-title">
          <div id="home-hero-sentinel" className={styles.marketplaceHome__heroMedia} aria-hidden>
            {heroSrc ? (
              <Image src={heroSrc} alt="" fill priority sizes="100vw" className={styles.marketplaceHome__heroImage} />
            ) : (
              <ImagePlaceholder aspectRatio="16/9" className={styles.marketplaceHome__heroPlaceholder} />
            )}
            <div className={styles.marketplaceHome__heroOverlay} />
          </div>

          <HomeStickyHeader />

          <div className={styles.marketplaceHome__heroContent}>
            <div className={styles.marketplaceHome__heroCopy}>
              <Eyebrow className="text-inverse/90">{copy.hero.eyebrow}</Eyebrow>
              <h1 id="home-hero-title" className={styles.marketplaceHome__title}>
                {copy.hero.titleLines.map((line, index) => (
                  <span key={line} className={styles.marketplaceHome__titleLine}>
                    {index > 0 ? <br /> : null}
                    {line}
                  </span>
                ))}
              </h1>
              <p className={styles.marketplaceHome__subtitle}>{copy.hero.subtitle}</p>
            </div>
            <MarketplaceHomeSearch
              facets={searchBootstrap.facets}
              className={styles.marketplaceHome__search}
            />
          </div>
        </section>
      </div>

      <main id="conteudo">
        <section className={styles.marketplaceHome__section} aria-labelledby="home-intro-title">
          <SectionHeader
            align="center"
            title={copy.intro.title}
            titleSecondary={copy.intro.titleSecondary}
            description={copy.intro.description}
            className={styles.marketplaceHome__introHeader}
          />
          <span id="home-intro-title" className="sr-only">
            {copy.intro.title} {copy.intro.titleSecondary}
          </span>

          <BentoGrid>
            <div className={styles.marketplaceHome__bentoMedia}>
              <Image
                src={VEHICLE_IMAGE_POOL[2]}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className={styles.marketplaceHome__bentoPhoto}
              />
            </div>
            <StatCard
              label={copy.bento.statLabel}
              value={`${formatCount(stats.listedVehicles)}+`}
              hint={`${copy.bento.statValueSuffix} · ${brand.email}`}
            />
            <BrandCard
              name={copy.bento.brandName}
              initials={brand.accentLetter}
              badge={copy.bento.brandBadge}
              description={copy.bento.brandDescription}
            />
            <ImageOverlayCard title={copy.bento.overlayTitle} imageUrl={VEHICLE_IMAGE_POOL[5]} />
          </BentoGrid>
        </section>

        <section className={styles.marketplaceHome__section}>
          <HomeCategories
            eyebrow={copy.categories.eyebrow}
            title={copy.categories.title}
            description={copy.categories.description}
            items={categoryItemsTyped}
          />
        </section>

        <section className={styles.marketplaceHome__sectionCompact} aria-label={copy.ctaDealers.title}>
          <CTABanner
            eyebrow={copy.ctaDealers.eyebrow}
            title={copy.ctaDealers.title}
            description={copy.ctaDealers.description}
            actionLabel={copy.ctaDealers.actionLabel}
            href={copy.ctaDealers.href}
            mediaSlot={
              // eslint-disable-next-line @next/next/no-img-element -- slot genérico do CTA
              <img src={VEHICLE_IMAGE_POOL[8]} alt="" />
            }
          />
        </section>

        <section className={styles.marketplaceHome__section}>
          <HomeLatestListings
            byTab={{
              all: latestAll,
              novo: latestNew,
              seminovo: latestSeminew,
              usado: latestUsed,
            }}
          />
        </section>

        <HomeStoresShowcase stores={stores} stats={stats} />

        <section className={styles.marketplaceHome__section} aria-labelledby="home-how-title">
          <div className={styles.marketplaceHome__how}>
            <div className={styles.marketplaceHome__howCopy}>
              <Eyebrow>{copy.howItWorks.eyebrow}</Eyebrow>
              <Heading as="h2">{copy.howItWorks.title}</Heading>
              <p className="text-text-muted">{copy.howItWorks.description}</p>
              <Button variant="dark" withArrow asChild className={styles.marketplaceHome__howAction}>
                <Link href={copy.howItWorks.actionHref}>{copy.howItWorks.actionLabel}</Link>
              </Button>
              <div className={styles.marketplaceHome__howFeatures}>
                <FeatureItem
                  icon={<BadgeCheck className="size-5" strokeWidth={1.5} aria-hidden />}
                  title={copy.howItWorks.features[0].title}
                  description={copy.howItWorks.features[0].description}
                />
                <FeatureItem
                  icon={<FileText className="size-5" strokeWidth={1.5} aria-hidden />}
                  title={copy.howItWorks.features[1].title}
                  description={copy.howItWorks.features[1].description}
                />
                <FeatureItem
                  icon={<MessageCircle className="size-5" strokeWidth={1.5} aria-hidden />}
                  title={copy.howItWorks.features[2].title}
                  description={copy.howItWorks.features[2].description}
                />
              </div>
            </div>

            <DeviceFrame className={styles.marketplaceHome__device} ariaLabel="Prévia do anúncio no celular">
              <div className={styles.marketplaceHome__deviceScreen}>
                {previewVehicle ? (
                  <VehicleCard variant="compact" vehicle={previewVehicle} href={`/veiculos/${previewVehicle.slug}`} />
                ) : (
                  <ImagePlaceholder aspectRatio="4/3" />
                )}
                <Button variant="primary" size="sm" className="w-full" asChild>
                  <Link href={previewVehicle ? `/veiculos/${previewVehicle.slug}` : '/veiculos'}>
                    Chamar no WhatsApp
                  </Link>
                </Button>
              </div>
            </DeviceFrame>
          </div>
          <span id="home-how-title" className="sr-only">
            {copy.howItWorks.title}
          </span>
        </section>

        <HomeNewsletter />
      </main>

      <SiteFooter showNewsletter={false} />
    </PageShell>
  );
}
