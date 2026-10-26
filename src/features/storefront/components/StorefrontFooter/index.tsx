import Link from 'next/link';

import type { PublicStorefront } from '@app-types/vehicle';
import { Avatar, AvatarFallback, AvatarImage } from '@components/ui';
import { cn } from '@utils/cn';

import { storefrontContent } from '../../storefront.content';
import styles from './styles.module.css';

export type StorefrontFooterProps = {
  storefront: PublicStorefront;
  homeHref: string;
  navItems: Array<{ href: string; label: string }>;
  poweredByHref?: string;
  className?: string;
};

export function StorefrontFooter({
  storefront,
  homeHref,
  navItems,
  poweredByHref = '/',
  className,
}: StorefrontFooterProps) {
  const copy = storefrontContent;
  const initials = storefront.name.slice(0, 2).toUpperCase();

  return (
    <footer className={cn(styles.storefrontFooter, className)}>
      <div className={styles.storefrontFooter__inner}>
        <Link href={homeHref} className={styles.storefrontFooter__brandLink}>
          <Avatar className={styles.storefrontFooter__logo}>
            {storefront.logoUrl ? <AvatarImage src={storefront.logoUrl} alt="" /> : null}
            <AvatarFallback className={styles.storefrontFooter__logoFallback}>{initials}</AvatarFallback>
          </Avatar>
          <span>{storefront.name}</span>
        </Link>

        <nav aria-label="Rodapé" className={styles.storefrontFooter__nav}>
          <ul>
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <a href={poweredByHref} className={styles.storefrontFooter__powered}>
          {copy.poweredBy}
        </a>
      </div>
    </footer>
  );
}
