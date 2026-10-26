import Link from 'next/link';

import type { VehicleListing } from '@app-types/vehicle';
import { PageShell, SiteFooter, SiteHeader, buildMarketplaceNav } from '@components/layout';
import { VehicleCard } from '@components/marketplace';
import { Breadcrumb, Button, EmptyState } from '@components/ui';

import styles from './detail.styles.module.css';
import { detailContent, type DetailUnavailableReason } from './marketplace.detail.content';

export type MarketplaceVehicleUnavailableViewProps = {
  slug: string;
  make: string;
  model: string;
  version: string;
  yearModel: number;
  reason: DetailUnavailableReason;
  similar: VehicleListing[];
};

export function MarketplaceVehicleUnavailableView({
  slug,
  make,
  model,
  version,
  yearModel,
  reason,
  similar,
}: MarketplaceVehicleUnavailableViewProps) {
  const copy = detailContent;
  const reasonText = copy.unavailableReasons[reason] ?? copy.unavailableReasons.closed;

  return (
    <PageShell className={styles.detail}>
      <SiteHeader
        variant="solid"
        navItems={buildMarketplaceNav('/veiculos')}
        showMessages={false}
        showUser={false}
      />

      <main className={styles.detail__main}>
        <Breadcrumb
          className={styles.detail__breadcrumb}
          items={[
            { label: copy.breadcrumbHome, href: '/' },
            { label: copy.breadcrumbVehicles, href: '/veiculos' },
            { label: `${make} ${model}` },
          ]}
        />

        <div className={styles.detail__unavailable}>
          <p className="text-sm text-text-muted">/{slug}</p>
          <h1 className={styles.detail__unavailableTitle}>{copy.unavailableTitle}</h1>
          <p className={styles.detail__unavailableText}>
            {make} {model} {version} · {yearModel}
          </p>
          <p className={styles.detail__unavailableText}>{reasonText}</p>
          <Button asChild>
            <Link href="/veiculos">{copy.unavailableCta}</Link>
          </Button>
        </div>

        <section className={styles.detail__similar} aria-labelledby="unavailable-similar-title">
          <h2 id="unavailable-similar-title" className={styles.detail__sectionTitle}>
            {copy.similarTitle}
          </h2>
          {similar.length === 0 ? (
            <EmptyState title={copy.similarEmpty} />
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

      <SiteFooter />
    </PageShell>
  );
}
