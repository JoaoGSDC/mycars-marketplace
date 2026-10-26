import Image from 'next/image';
import Link from 'next/link';
import type { HTMLAttributes } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@components/ui/Avatar';
import { Badge } from '@components/ui/Badge';
import { SpecIcon } from '@components/ui/Icon';
import type { StoreProfile } from '@app-types/vehicle';
import { formatCount } from '@utils/format';
import { cn } from '@utils/cn';

import styles from './styles.module.css';

export type StoreCardProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  store: StoreProfile;
  href?: string;
  /** Texto do CTA visual (card clicável por inteiro — sem controle aninhado). */
  ctaLabel?: string;
};

function StoreCardCover({ store }: { store: StoreProfile }) {
  if (store.coverImageUrl) {
    return (
      <Image
        src={store.coverImageUrl}
        alt=""
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 320px"
        className={styles.storeCard__coverImage}
      />
    );
  }

  return (
    <div className={styles.storeCard__coverFallback} aria-hidden>
      <span className={styles.storeCard__coverFallbackMark}>MyCars</span>
    </div>
  );
}

function StoreCardContent({ store, ctaLabel }: { store: StoreProfile; ctaLabel: string }) {
  const initials = store.logoInitials ?? store.name.slice(0, 2).toUpperCase();
  const location = `${store.city}, ${store.state}`;
  const vehicleLabel =
    store.vehicleCount === 1 ? '1 veículo disponível' : `${formatCount(store.vehicleCount)} veículos disponíveis`;

  return (
    <>
      <div className={styles.storeCard__cover}>
        <StoreCardCover store={store} />
        <Avatar className={styles.storeCard__logo}>
          {store.logoUrl ? <AvatarImage src={store.logoUrl} alt="" /> : null}
          <AvatarFallback className={styles.storeCard__logoInitials}>{initials}</AvatarFallback>
        </Avatar>
      </div>
      <div className={styles.storeCard__body}>
        <div className={styles.storeCard__identity}>
          <div className={styles.storeCard__nameRow}>
            <h3 className={styles.storeCard__name}>{store.name}</h3>
            {store.verified ? (
              <Badge variant="soft" className={styles.storeCard__verified}>
                Verificada
              </Badge>
            ) : null}
          </div>
          <p className={styles.storeCard__location}>
            <SpecIcon name="Location" size="sm" className={styles.storeCard__locationIcon} aria-hidden />
            {location}
          </p>
        </div>
        <p className={styles.storeCard__count}>{vehicleLabel}</p>
        <span className={styles.storeCard__cta}>
          {ctaLabel}
          <span className={styles.storeCard__ctaArrow} aria-hidden>
            →
          </span>
        </span>
      </div>
    </>
  );
}

export function StoreCard({
  store,
  href,
  ctaLabel = 'Ver vitrine',
  className,
  ...props
}: StoreCardProps) {
  const card = (
    <article className={cn(styles.storeCard, className)} {...props}>
      <StoreCardContent store={store} ctaLabel={ctaLabel} />
    </article>
  );

  if (href) {
    return (
      <Link href={href} className={styles.storeCard__link}>
        {card}
      </Link>
    );
  }

  return card;
}
