import { getSiteOrigin } from '@config/site';
import type { PublicStorefront } from '@app-types/vehicle';
import { PageShell } from '@components/layout';
import type { VehicleSearchResult } from '@services';
import { buildWhatsAppHref } from '@utils/whatsapp';
import type { VehicleSearchParams } from '@utils/vehicle-search-params';

import { StorefrontAbout } from './components/StorefrontAbout';
import { StorefrontBrowse } from './components/StorefrontBrowse';
import { StorefrontFooter } from './components/StorefrontFooter';
import { storefrontBrandStyle } from './lib/storefront-brand';
import { storefrontContent } from './storefront.content';
import styles from './styles.module.css';

export type StorefrontHomeViewProps = {
  storefront: PublicStorefront;
  params: VehicleSearchParams;
  result: VehicleSearchResult;
  /** Subdomínio (links relativos) ou path `/lojas/slug`. */
  mode: 'subdomain' | 'path' | 'preview';
};

export function StorefrontHomeView({ storefront, params, result, mode }: StorefrontHomeViewProps) {
  const copy = storefrontContent;
  const basePath = mode === 'subdomain' ? '' : storefront.basePath || `/lojas/${storefront.slug}`;
  const homeHref = basePath || '/';
  const stockHref = `${homeHref}#estoque`;
  const whatsappHref = buildWhatsAppHref(
    storefront.whatsappNumber,
    `Olá! Vi a vitrine da ${storefront.name} e gostaria de mais informações.`
  );

  const navItems = [
    { href: stockHref, label: copy.vehiclesNav, active: true },
    { href: `${basePath}#sobre`, label: copy.aboutNav },
    { href: `${basePath}#contato`, label: copy.contactNav },
  ];

  return (
    <PageShell className={styles.storefrontHome} style={storefrontBrandStyle(storefront.primaryColor)}>
      {mode === 'preview' ? (
        <p className={styles.storefrontShell__preview} role="status">
          {copy.previewBanner}
        </p>
      ) : null}

      <StorefrontBrowse
        storefront={storefront}
        params={params}
        result={result}
        basePath={basePath}
        homeHref={homeHref}
        navItems={navItems}
        whatsappHref={whatsappHref}
        adminHref={mode === 'preview' ? '/painel/vitrine' : undefined}
      />

      <StorefrontAbout storefront={storefront} />

      <StorefrontFooter
        storefront={storefront}
        homeHref={homeHref}
        navItems={navItems}
        poweredByHref={getSiteOrigin()}
      />
    </PageShell>
  );
}
