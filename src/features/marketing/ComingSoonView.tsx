'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { SiteFooter, SiteHeader, buildMarketplaceNav } from '@components/layout';
import { Button, Heading } from '@components/ui';

import styles from './styles.module.css';

export type ComingSoonViewProps = {
  title: string;
  description?: string;
};

export function ComingSoonView({
  title,
  description = 'Esta página está em construção. Enquanto isso, explore o marketplace.',
}: ComingSoonViewProps) {
  const pathname = usePathname() ?? '/';

  return (
    <div className={styles.comingSoon}>
      <SiteHeader
        variant="solid"
        navItems={buildMarketplaceNav(pathname)}
        showMessages={false}
        showUser={false}
      />
      <main className={styles.comingSoon__main}>
        <p className={styles.comingSoon__eyebrow}>Em construção</p>
        <Heading as="h1">{title}</Heading>
        <p className={styles.comingSoon__description}>{description}</p>
        <Button variant="dark" withArrow asChild>
          <Link href="/">Voltar ao início</Link>
        </Button>
      </main>
      <SiteFooter variant="compact" />
    </div>
  );
}
