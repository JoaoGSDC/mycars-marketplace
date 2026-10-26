import Link from 'next/link';

import { PageShell, SiteFooter } from '@components/layout';
import { Button } from '@components/ui';
import { getSiteOrigin } from '@config/site';

import { storefrontContent } from './storefront.content';
import styles from './styles.module.css';

export type StorefrontMissingViewProps = {
  subdomain: string;
};

export function StorefrontMissingView({ subdomain }: StorefrontMissingViewProps) {
  const copy = storefrontContent;
  const origin = getSiteOrigin();

  return (
    <PageShell className={styles.storefrontShell}>
      <main className={styles.storefrontMissing}>
        <p className="text-sm text-text-muted">{subdomain}</p>
        <h1 className="text-2xl font-semibold text-text">{copy.missingSubdomainTitle}</h1>
        <p className="text-sm text-text-muted">{copy.missingSubdomainDescription}</p>
        <Button asChild>
          <Link href={`${origin}/lojas`}>Ver lojas no marketplace</Link>
        </Button>
      </main>
      <SiteFooter variant="compact" />
    </PageShell>
  );
}
