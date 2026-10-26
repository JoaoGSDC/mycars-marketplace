import Link from 'next/link';

import { VEHICLE_STATUS } from '@app-types/status';
import type { PublicStoreContact, PublicStorefront, VehicleListing } from '@app-types/vehicle';
import {
  BODY_TYPE_LABELS,
  CONDITION_LABELS,
  DRIVETRAIN_LABELS,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
} from '@app-types/vehicle';
import { PageShell, SiteFooter, SiteHeader, buildMarketplaceNav } from '@components/layout';
import { StatusBadge, StoreBadge, VehicleCard } from '@components/marketplace';
import { Breadcrumb, Button, Eyebrow, SpecIcon } from '@components/ui';
import { StorefrontFooter } from '@features/storefront/components/StorefrontFooter';
import { StorefrontHeader } from '@features/storefront/components/StorefrontHeader';
import { storefrontBrandStyle } from '@features/storefront/lib/storefront-brand';
import { storefrontContent } from '@features/storefront/storefront.content';
import { formatCurrency, formatMileage } from '@utils/format';
import { buildWhatsAppHref } from '@utils/whatsapp';

import { VehicleGallery } from './components/VehicleGallery';
import { VehicleInterestForm } from './components/VehicleInterestForm';
import { VehicleWhatsAppButton } from './components/VehicleWhatsAppButton';
import styles from './detail.styles.module.css';
import { detailContent } from './marketplace.detail.content';

export type MarketplaceVehicleDetailViewProps = {
  vehicle: VehicleListing;
  storeContact: PublicStoreContact;
  similar: VehicleListing[];
  /** Quando informado, chrome da vitrine substitui o header/footer do marketplace. */
  storefront?: PublicStorefront;
  storefrontMode?: 'subdomain' | 'path' | 'preview';
};

export function MarketplaceVehicleDetailView({
  vehicle,
  storeContact,
  similar,
  storefront,
  storefrontMode = 'subdomain',
}: MarketplaceVehicleDetailViewProps) {
  const copy = detailContent;
  const title = `${vehicle.make} ${vehicle.model} ${vehicle.version}`.trim();
  const isSold = vehicle.status === VEHICLE_STATUS.SOLD;
  const isReserved = vehicle.status === VEHICLE_STATUS.RESERVED;
  const canContact = !isSold;
  const whatsappMessage = copy.formDefaultMessage(title);
  const whatsappHref = buildWhatsAppHref(storeContact.whatsappNumber, whatsappMessage);
  const location = `${vehicle.store.city}/${vehicle.store.state}${
    vehicle.store.neighborhood ? ` · ${vehicle.store.neighborhood}` : ''
  }`;

  const storeBasePath =
    storefrontMode === 'subdomain' ? '' : storefront?.basePath || `/lojas/${storefront?.slug ?? vehicle.store.slug}`;
  const storeHomeHref = storefront ? storeBasePath || '/' : '/';

  const breadcrumb = storefront
    ? [
        { label: storefront.name, href: storeHomeHref },
        { label: storefrontContent.vehiclesNav, href: storeHomeHref },
        { label: `${vehicle.model} ${vehicle.version}` },
      ]
    : [
        { label: copy.breadcrumbHome, href: '/' },
        { label: copy.breadcrumbVehicles, href: '/veiculos' },
        { label: vehicle.make, href: `/veiculos?marca=${vehicle.makeSlug}` },
        { label: `${vehicle.model} ${vehicle.version}` },
      ];

  const storeNavItems = storefront
    ? [
        { href: storeHomeHref, label: storefrontContent.vehiclesNav, active: true },
        { href: `${storeBasePath}#sobre`, label: storefrontContent.aboutNav },
        { href: `${storeBasePath}#contato`, label: storefrontContent.contactNav },
      ]
    : [];

  const storeWhatsappHref = storefront
    ? buildWhatsAppHref(
        storefront.whatsappNumber,
        `Olá! Vi a vitrine da ${storefront.name} e gostaria de mais informações.`
      )
    : undefined;

  const mainSpecs: Array<{
    name: 'Mileage' | 'Fuel' | 'Transmission' | 'Year' | 'Body' | 'Color';
    label: string;
    value: string;
  }> = [
    {
      name: 'Year',
      label: 'Ano',
      value: `${vehicle.specs.yearManufacture}/${vehicle.specs.yearModel}`,
    },
    { name: 'Mileage', label: 'Quilometragem', value: formatMileage(vehicle.specs.mileageKm) },
    { name: 'Fuel', label: 'Combustível', value: FUEL_LABELS[vehicle.specs.fuel] },
    {
      name: 'Transmission',
      label: 'Câmbio',
      value: TRANSMISSION_LABELS[vehicle.specs.transmission],
    },
    { name: 'Body', label: 'Carroceria', value: BODY_TYPE_LABELS[vehicle.specs.bodyType] },
    {
      name: 'Color',
      label: 'Cor',
      value: vehicle.specs.color?.trim() ? vehicle.specs.color : '—',
    },
  ];

  const heroHighlights = [
    { label: 'Ano', value: String(vehicle.specs.yearModel) },
    { label: 'Km', value: formatMileage(vehicle.specs.mileageKm) },
    { label: 'Câmbio', value: TRANSMISSION_LABELS[vehicle.specs.transmission] },
    { label: 'Combustível', value: FUEL_LABELS[vehicle.specs.fuel] },
    { label: 'Carroceria', value: BODY_TYPE_LABELS[vehicle.specs.bodyType] },
    { label: 'Condição', value: CONDITION_LABELS[vehicle.condition] },
  ];

  const techRows: Array<{ label: string; value: string }> = [
    { label: 'Condição', value: CONDITION_LABELS[vehicle.condition] },
    { label: 'Ano fabricação', value: String(vehicle.specs.yearManufacture) },
    { label: 'Ano modelo', value: String(vehicle.specs.yearModel) },
    { label: 'Quilometragem', value: formatMileage(vehicle.specs.mileageKm) },
    { label: 'Combustível', value: FUEL_LABELS[vehicle.specs.fuel] },
    { label: 'Câmbio', value: TRANSMISSION_LABELS[vehicle.specs.transmission] },
    { label: 'Carroceria', value: BODY_TYPE_LABELS[vehicle.specs.bodyType] },
  ];

  if (vehicle.specs.drivetrain) {
    techRows.push({
      label: 'Tração',
      value: DRIVETRAIN_LABELS[vehicle.specs.drivetrain],
    });
  }

  if (vehicle.specs.powerKw != null) {
    techRows.push({
      label: 'Potência',
      value: `${vehicle.specs.powerKw} kW`,
    });
  }

  if (vehicle.specs.color) {
    techRows.push({ label: 'Cor', value: vehicle.specs.color });
  }

  const features = vehicle.features ?? [];
  const gallery = vehicle.gallery ?? [];
  const hasDescription = Boolean(vehicle.description.trim());

  return (
    <PageShell
      className={styles.detail}
      style={storefront ? storefrontBrandStyle(storefront.primaryColor) : undefined}
    >
      <a href="#conteudo-anuncio" className={styles.detail__skip}>
        {copy.skipLink}
      </a>

      {storefront ? (
        <StorefrontHeader
          storefront={storefront}
          homeHref={storeHomeHref}
          navItems={storeNavItems}
          whatsappHref={storeWhatsappHref}
          adminHref={storefrontMode === 'preview' ? '/painel/vitrine' : undefined}
        />
      ) : (
        <SiteHeader
          variant="solid"
          navItems={buildMarketplaceNav('/veiculos')}
          showMessages={false}
          showUser={false}
        />
      )}

      <header className={styles.detail__hero} data-theme="dark">
        <div className={styles.detail__heroInner}>
          <Breadcrumb className={styles.detail__breadcrumb} items={breadcrumb} />

          <div className={styles.detail__heroIdentity}>
            <p className={styles.detail__make}>{vehicle.make}</p>
            <h1 className={styles.detail__title}>
              {vehicle.model}
              {vehicle.version ? (
                <span className={styles.detail__version}>{vehicle.version}</span>
              ) : null}
            </h1>

            <div className={styles.detail__heroMeta}>
              <span>{vehicle.specs.yearModel}</span>
              <span className={styles.detail__heroMetaSep} aria-hidden>
                ·
              </span>
              <span>{CONDITION_LABELS[vehicle.condition]}</span>
              <span className={styles.detail__heroMetaSep} aria-hidden>
                ·
              </span>
              <StatusBadge kind="vehicle" status={vehicle.status} />
            </div>
          </div>

          <div className={styles.detail__heroHighlights} aria-label={copy.specsTitle}>
            {heroHighlights.map((item) => (
              <div key={item.label} className={styles.detail__heroHighlight}>
                <span className={styles.detail__heroHighlightLabel}>{item.label}</span>
                <span className={styles.detail__heroHighlightValue}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main id="conteudo-anuncio" className={styles.detail__main}>
        <div className={styles.detail__layout}>
          <div className={styles.detail__gallery}>
            <VehicleGallery images={gallery} alt={title} emptyLabel={title} />
          </div>

          <aside className={styles.detail__aside}>
            <div className={styles.detail__commerce}>
              <div className={styles.detail__priceBlock}>
                <p className={styles.detail__priceLabel}>{copy.priceLabel}</p>
                <p className={styles.detail__price}>{formatCurrency(vehicle.price)}</p>
                {vehicle.previousPrice != null ? (
                  <p className={styles.detail__previousPrice}>
                    {copy.previousPriceLabel}: {formatCurrency(vehicle.previousPrice)}
                  </p>
                ) : null}

                <div className={styles.detail__availability}>
                  <span className={styles.detail__availabilityLabel}>{copy.availabilityTitle}</span>
                  <StatusBadge kind="vehicle" status={vehicle.status} />
                </div>

                {isReserved ? <p className={styles.detail__notice}>{copy.reservedNotice}</p> : null}
                {isSold ? <p className={styles.detail__notice}>{copy.soldNotice}</p> : null}
              </div>

              <div className={styles.detail__storeBlock}>
                <StoreBadge store={vehicle.store} logoUrl={storeContact.logoUrl} compact />
                <p className={styles.detail__storeMeta}>{location}</p>
              </div>

              <div className={styles.detail__ctaStack}>
                {canContact && whatsappHref ? (
                  <VehicleWhatsAppButton
                    href={whatsappHref}
                    listingSlug={vehicle.slug}
                    label={copy.whatsappLabel}
                  />
                ) : null}
                {canContact && !whatsappHref ? (
                  <p className={styles.detail__notice}>{copy.whatsappUnavailable}</p>
                ) : null}
                <Button variant="primary" asChild className="w-full">
                  <Link href={`/lojas/${vehicle.store.slug}`}>{copy.storeCta}</Link>
                </Button>
              </div>

              {canContact ? (
                <div id="interesse" className={styles.detail__contactBlock}>
                  <h2 className={styles.detail__sectionTitle}>{copy.contactTitle}</h2>
                  <p className={styles.detail__contactIntro}>{copy.contactDescription}</p>
                  <VehicleInterestForm listingSlug={vehicle.slug} vehicleTitle={title} />
                </div>
              ) : null}
            </div>
          </aside>

          <div className={styles.detail__content}>
            <section className={styles.detail__section} aria-labelledby="detail-specs-title">
              <div className={styles.detail__sectionHeader}>
                <Eyebrow>{copy.specsEyebrow}</Eyebrow>
                <h2 id="detail-specs-title" className={styles.detail__sectionTitle}>
                  {copy.specsTitle}
                </h2>
              </div>
              <div className={styles.detail__specs}>
                {mainSpecs.map((spec) => (
                  <div key={spec.label} className={styles.detail__spec}>
                    <SpecIcon name={spec.name} className={styles.detail__specIcon} />
                    <div>
                      <p className={styles.detail__specLabel}>{spec.label}</p>
                      <p className={styles.detail__specValue}>{spec.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.detail__section} aria-labelledby="detail-tech-title">
              <div className={styles.detail__sectionHeader}>
                <Eyebrow>{copy.techEyebrow}</Eyebrow>
                <h2 id="detail-tech-title" className={styles.detail__sectionTitle}>
                  {copy.techTitle}
                </h2>
              </div>
              <dl className={styles.detail__tech}>
                {techRows.map((row) => (
                  <div key={row.label} className={styles.detail__techRow}>
                    <dt className={styles.detail__techLabel}>{row.label}</dt>
                    <dd className={styles.detail__techValue}>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {features.length > 0 ? (
              <section className={styles.detail__section} aria-labelledby="detail-features-title">
                <div className={styles.detail__sectionHeader}>
                  <Eyebrow>{copy.featuresEyebrow}</Eyebrow>
                  <h2 id="detail-features-title" className={styles.detail__sectionTitle}>
                    {copy.featuresTitle}
                  </h2>
                </div>
                <ul className={styles.detail__features}>
                  {features.map((feature) => (
                    <li key={feature} className={styles.detail__feature}>
                      {feature}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {hasDescription ? (
              <section
                className={styles.detail__section}
                aria-labelledby="detail-description-title"
              >
                <div className={styles.detail__sectionHeader}>
                  <Eyebrow>{copy.descriptionEyebrow}</Eyebrow>
                  <h2 id="detail-description-title" className={styles.detail__sectionTitle}>
                    {copy.descriptionTitle}
                  </h2>
                </div>
                <p className={styles.detail__description}>{vehicle.description}</p>
              </section>
            ) : null}
          </div>
        </div>

        {canContact ? (
          <section
            className={styles.detail__closing}
            data-theme="dark"
            aria-labelledby="detail-closing-title"
          >
            <div className={styles.detail__closingCopy}>
              <Eyebrow>{copy.closingEyebrow}</Eyebrow>
              <h2 id="detail-closing-title" className={styles.detail__closingTitle}>
                Interessado neste {vehicle.make} {vehicle.model}?
              </h2>
              <p className={styles.detail__closingDescription}>{copy.closingDescription}</p>
            </div>
            <div className={styles.detail__closingActions}>
              {whatsappHref ? (
                <VehicleWhatsAppButton
                  href={whatsappHref}
                  listingSlug={vehicle.slug}
                  label={copy.whatsappLabel}
                />
              ) : null}
              <Button variant="primary" asChild className="w-full">
                <a href="#interesse">{copy.closingFormCta}</a>
              </Button>
            </div>
          </section>
        ) : null}

        <section className={styles.detail__similar} aria-labelledby="detail-similar-title">
          <div className={styles.detail__sectionHeader}>
            <Eyebrow>{copy.similarEyebrow}</Eyebrow>
            <h2 id="detail-similar-title" className={styles.detail__sectionTitle}>
              {copy.similarTitle}
            </h2>
          </div>
          {similar.length === 0 ? (
            <p className={styles.detail__similarEmpty}>{copy.similarEmpty}</p>
          ) : (
            <div className={styles.detail__similarGrid}>
              {similar.map((item) => (
                <VehicleCard
                  key={item.id}
                  variant="grid"
                  vehicle={item}
                  href={`/veiculos/${item.slug}`}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {canContact && whatsappHref ? (
        <div className={styles.detail__mobileBar}>
          <div className={styles.detail__mobileBarPrice}>
            <p className={styles.detail__mobileBarLabel}>{copy.priceLabel}</p>
            <p className={styles.detail__mobileBarValue}>{formatCurrency(vehicle.price)}</p>
          </div>
          <div className={styles.detail__mobileBarAction}>
            <VehicleWhatsAppButton
              href={whatsappHref}
              listingSlug={vehicle.slug}
              label={copy.whatsappLabel}
            />
          </div>
        </div>
      ) : null}

      {storefront ? (
        <StorefrontFooter
          storefront={storefront}
          homeHref={storeHomeHref}
          navItems={storeNavItems}
        />
      ) : (
        <SiteFooter />
      )}
    </PageShell>
  );
}
