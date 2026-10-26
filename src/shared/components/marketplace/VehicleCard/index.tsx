'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Badge } from '@components/ui/Badge';
import { Button } from '@components/ui/Button';
import { Card } from '@components/ui/Card';
import { IconButton } from '@components/ui/IconButton';
import { ImagePlaceholder } from '@components/ui/ImagePlaceholder';
import { SpecIcon } from '@components/ui/Icon';
import { Skeleton } from '@components/ui/Skeleton';
import { VEHICLE_STATUS } from '@app-types/status';
import type { VehicleListing } from '@app-types/vehicle';
import { CONDITION_LABELS, FUEL_LABELS, TRANSMISSION_LABELS } from '@app-types/vehicle';
import { formatCurrency, formatMileage } from '@utils/format';
import { resolveMediaUrl } from '@utils/media-url';
import { buildWhatsAppHref as buildWaMeHref } from '@utils/whatsapp';
import { cn } from '@utils/cn';

import { StatusBadge } from '../StatusBadge';
import styles from './styles.module.css';

export type VehicleCardVariant = 'grid' | 'listing' | 'featured' | 'compact';

export type VehicleCardProps = {
  variant?: VehicleCardVariant;
  vehicle?: VehicleListing;
  loading?: boolean;
  favorited?: boolean;
  onFavoriteToggle?: () => void;
  onViewDetails?: () => void;
  onWhatsApp?: () => void;
  /** Callback opcional para futuro registro de interesse (sem tracking agora). */
  onContactClick?: () => void;
  href?: string;
  className?: string;
};

function resolveVehicleWhatsAppHref(vehicle: VehicleListing): string | undefined {
  const title = `${vehicle.make} ${vehicle.model} ${vehicle.version}`;
  const text = `Olá! Tenho interesse no ${title} anunciado no MyCars.`;

  return buildWaMeHref(vehicle.store.whatsappNumber, text);
}

function VehicleCardLink({ href, className, children }: { href?: string; className?: string; children: ReactNode }) {
  if (!href) {
    return children;
  }

  return (
    <Link href={href} className={cn(styles.vehicleCard__link, className)}>
      {children}
    </Link>
  );
}

function VehicleMedia({ vehicle, className }: { vehicle?: VehicleListing; className?: string }) {
  const imageUrl = vehicle ? resolveMediaUrl(vehicle, 'card') : undefined;

  if (!vehicle || vehicle.hasPhoto === false || !imageUrl) {
    return <ImagePlaceholder aspectRatio="4/3" className={className} />;
  }

  return (
    <div className={cn(styles.vehicleCard__media, className)}>
      <Image
        src={imageUrl}
        alt={`${vehicle.make} ${vehicle.model} ${vehicle.version}`}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 400px"
        className={styles.vehicleCard__photo}
      />
    </div>
  );
}

function VehicleCardSkeleton({ variant }: { variant: VehicleCardVariant }) {
  if (variant === 'compact') {
    return (
      <div className={cn(styles.vehicleCard, styles['vehicleCard--compact'])}>
        <Skeleton className="aspect-[16/10] w-full rounded-md" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (variant === 'listing' || variant === 'featured') {
    return (
      <div className={cn(styles.vehicleCard, styles['vehicleCard--listing'])}>
        <Skeleton className="aspect-[4/5] w-[38%] max-w-[9.5rem] shrink-0 rounded-md sm:aspect-auto sm:h-44 sm:w-52 sm:max-w-none" />
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:gap-3">
          <Skeleton className="h-5 w-4/5 sm:h-6 sm:w-2/3" />
          <Skeleton className="h-6 w-1/3 sm:h-8" />
          <Skeleton className="hidden h-8 w-full rounded-md sm:block" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-auto h-9 w-full sm:h-10" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(styles.vehicleCard, styles['vehicleCard--grid'])}>
      <Skeleton className="aspect-[16/10] w-full rounded-t-lg" />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex justify-between gap-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/4" />
        </div>
        <Skeleton className="h-14 w-full rounded-md" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
}

function SpecRow({ vehicle }: { vehicle: VehicleListing }) {
  const { specs } = vehicle;
  const items: { icon: 'Mileage' | 'Fuel' | 'Transmission' | 'Year'; label: string }[] = [
    { icon: 'Mileage', label: formatMileage(specs.mileageKm) },
    { icon: 'Fuel', label: FUEL_LABELS[specs.fuel] },
    { icon: 'Transmission', label: TRANSMISSION_LABELS[specs.transmission] },
    {
      icon: 'Year',
      label: `${specs.yearManufacture}/${specs.yearModel}`,
    },
  ];

  return (
    <ul className={styles.vehicleCard__specs} aria-label="Especificações">
      {items.map((item) => (
        <li key={item.icon} className={styles.vehicleCard__spec}>
          <SpecIcon name={item.icon} size="sm" className={styles.vehicleCard__specIcon} aria-hidden />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

function ReservedOverlay(): ReactNode {
  return (
    <div className={styles.vehicleCard__reserved}>
      <StatusBadge kind="vehicle" status={VEHICLE_STATUS.RESERVED} />
    </div>
  );
}

function locationLabel(vehicle: VehicleListing): string {
  if (vehicle.store.neighborhood) {
    return `${vehicle.store.city} · ${vehicle.store.neighborhood}`;
  }

  return `${vehicle.store.city}, ${vehicle.store.state}`;
}

export function VehicleCard({
  variant = 'grid',
  vehicle,
  loading = false,
  favorited = false,
  onFavoriteToggle,
  onViewDetails,
  onWhatsApp,
  onContactClick,
  href,
  className,
}: VehicleCardProps) {
  if (loading) {
    return <VehicleCardSkeleton variant={variant} />;
  }

  if (!vehicle) {
    return null;
  }

  const isReserved = vehicle.status === VEHICLE_STATUS.RESERVED;
  const hasReducedPrice = typeof vehicle.previousPrice === 'number' && vehicle.previousPrice > vehicle.price;
  const isOffer = hasReducedPrice || Boolean(vehicle.featured);
  const listingTitle = `${vehicle.make} ${vehicle.model} ${vehicle.version}`;
  const detailsHref = href ?? `/veiculos/${vehicle.slug}`;
  const whatsappHref = resolveVehicleWhatsAppHref(vehicle);

  const offerBadge = isOffer ? (
    <Badge variant="offer" className={styles.vehicleCard__offerBadge}>
      Oferta
    </Badge>
  ) : null;

  function handleContactClick() {
    onContactClick?.();
    onWhatsApp?.();
  }

  const detailsButton = (
    <Button variant="primary" size="sm" className={styles.vehicleCard__detailsBtn} asChild>
      <Link href={detailsHref} onClick={onViewDetails}>
        Ver detalhes
      </Link>
    </Button>
  );

  if (variant === 'compact') {
    return (
      <article
        className={cn(
          styles.vehicleCard,
          styles['vehicleCard--compact'],
          isReserved && styles['vehicleCard--reserved'],
          className
        )}
      >
        <div className={styles.vehicleCard__compactMedia}>
          <VehicleMedia vehicle={vehicle} className={styles.vehicleCard__compactImage} />
          {isReserved ? <ReservedOverlay /> : null}
        </div>
        <div className={styles.vehicleCard__compactHead}>
          <Link href={detailsHref} className={styles.vehicleCard__compactTitleLink}>
            <h3 className={styles.vehicleCard__compactTitle}>{listingTitle}</h3>
          </Link>
          <p className={styles.vehicleCard__price}>{formatCurrency(vehicle.price)}</p>
        </div>
        <div className={styles.vehicleCard__compactActions}>
          {!isReserved && whatsappHref ? (
            <Button variant="whatsapp" size="sm" className="w-full" asChild>
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" onClick={handleContactClick}>
                <SpecIcon name="WhatsApp" size="sm" aria-hidden />
                WhatsApp
              </a>
            </Button>
          ) : (
            detailsButton
          )}
        </div>
      </article>
    );
  }

  if (variant === 'featured') {
    return (
      <Card
        variant="featured"
        className={cn(
          styles.vehicleCard,
          styles['vehicleCard--featured'],
          isOffer && styles['vehicleCard--offer'],
          isReserved && styles['vehicleCard--reserved'],
          className
        )}
      >
        <div className={styles.vehicleCard__featuredMedia}>
          <VehicleMedia vehicle={vehicle} className={styles.vehicleCard__featuredImage} />
          {offerBadge}
          {isReserved ? <ReservedOverlay /> : null}
        </div>
        <div className={styles.vehicleCard__featuredBody}>
          <div className={styles.vehicleCard__featuredHead}>
            <h3 className={styles.vehicleCard__listingTitle}>{listingTitle}</h3>
            <p className={styles.vehicleCard__featuredPrice}>{formatCurrency(vehicle.price)}</p>
          </div>
          <div className={styles.vehicleCard__specsBar}>
            <SpecRow vehicle={vehicle} />
          </div>
          <p className={styles.vehicleCard__location}>
            <SpecIcon name="Location" size="sm" aria-hidden />
            {locationLabel(vehicle)}
          </p>
          <p className={styles.vehicleCard__description}>{vehicle.description}</p>
          <div className={styles.vehicleCard__listingActions}>
            {detailsButton}
            {onFavoriteToggle ? (
              <IconButton
                variant="square-outline"
                size="md"
                aria-label={favorited ? 'Remover dos favoritos' : 'Favoritar'}
                aria-pressed={favorited}
                onClick={onFavoriteToggle}
                icon={
                  <SpecIcon name="Heart" size="sm" className={cn(favorited && 'fill-accent-button text-accent-button')} />
                }
              />
            ) : null}
          </div>
        </div>
      </Card>
    );
  }

  if (variant === 'listing') {
    return (
      <article
        className={cn(
          styles.vehicleCard,
          styles['vehicleCard--listing'],
          isOffer && styles['vehicleCard--offer'],
          isReserved && styles['vehicleCard--reserved'],
          className
        )}
      >
        <div className={styles.vehicleCard__listingMedia}>
          <VehicleMedia vehicle={vehicle} className={styles.vehicleCard__listingImage} />
          {offerBadge}
          {isReserved ? <ReservedOverlay /> : null}
        </div>
        <div className={styles.vehicleCard__listingBody}>
          <div className={styles.vehicleCard__listingHead}>
            <Link href={detailsHref} className={styles.vehicleCard__gridTitleLink}>
              <h3 className={styles.vehicleCard__listingTitle}>{listingTitle}</h3>
            </Link>
            <div className={styles.vehicleCard__priceBlock}>
              {hasReducedPrice ? (
                <p className={styles.vehicleCard__previousPrice}>
                  {formatCurrency(vehicle.previousPrice as number)}
                </p>
              ) : null}
              <p className={styles.vehicleCard__listingPrice}>{formatCurrency(vehicle.price)}</p>
            </div>
          </div>
          <div className={cn(styles.vehicleCard__specsBar, styles.vehicleCard__listingSpecs)}>
            <SpecRow vehicle={vehicle} />
          </div>
          <p className={cn(styles.vehicleCard__location, styles.vehicleCard__listingMeta)}>
            <SpecIcon name="Location" size="sm" aria-hidden />
            {locationLabel(vehicle)}
          </p>
          {vehicle.description ? (
            <p className={cn(styles.vehicleCard__description, styles.vehicleCard__listingDesc)}>
              {vehicle.description}
            </p>
          ) : null}
          <div className={styles.vehicleCard__listingActions}>
            {detailsButton}
            {onFavoriteToggle ? (
              <IconButton
                variant="square-outline"
                size="md"
                aria-label={favorited ? 'Remover dos favoritos' : 'Favoritar'}
                aria-pressed={favorited}
                onClick={onFavoriteToggle}
                icon={
                  <SpecIcon name="Heart" size="sm" className={cn(favorited && 'fill-accent-button text-accent-button')} />
                }
              />
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        styles.vehicleCard,
        styles['vehicleCard--grid'],
        isOffer && styles['vehicleCard--offer'],
        isReserved && styles['vehicleCard--reserved'],
        className
      )}
    >
      <div className={styles.vehicleCard__gridMediaWrap}>
        <VehicleCardLink href={detailsHref}>
          <VehicleMedia vehicle={vehicle} className={styles.vehicleCard__gridImage} />
        </VehicleCardLink>
        {offerBadge ?? (
          <Badge variant="soft" className={styles.vehicleCard__conditionBadge}>
            {CONDITION_LABELS[vehicle.condition]}
          </Badge>
        )}
        {isReserved ? <ReservedOverlay /> : null}
      </div>

      <div className={styles.vehicleCard__gridBody}>
        <div className={styles.vehicleCard__gridHead}>
          <p className={styles.vehicleCard__gridPrice}>{formatCurrency(vehicle.price)}</p>
          <Link href={detailsHref} className={styles.vehicleCard__gridTitleLink}>
            <h3 className={styles.vehicleCard__gridTitle}>{listingTitle}</h3>
          </Link>
        </div>

        <div className={styles.vehicleCard__specsBar}>
          <SpecRow vehicle={vehicle} />
        </div>

        <p className={styles.vehicleCard__location}>
          <SpecIcon name="Location" size="sm" aria-hidden />
          {locationLabel(vehicle)}
        </p>

        {vehicle.description ? (
          <p className={styles.vehicleCard__description}>{vehicle.description}</p>
        ) : null}

        <div className={styles.vehicleCard__gridActions}>
          <Button variant="primary" size="md" className={styles.vehicleCard__detailsBtn} asChild>
            <Link href={detailsHref} onClick={onViewDetails}>
              Ver detalhes
            </Link>
          </Button>
          {onFavoriteToggle ? (
            <IconButton
              variant="square-outline"
              size="md"
              aria-label={favorited ? 'Remover dos favoritos' : 'Favoritar'}
              aria-pressed={favorited}
              onClick={onFavoriteToggle}
              icon={
                <SpecIcon
                  name="Heart"
                  size="sm"
                  className={cn(favorited && 'fill-accent-button text-accent-button')}
                />
              }
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}
