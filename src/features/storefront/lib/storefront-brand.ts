import type { CSSProperties } from 'react';

/** Aplica a cor principal da loja nos tokens locais da vitrine. */
export function storefrontBrandStyle(primaryColor?: string): CSSProperties | undefined {
  if (!primaryColor) {
    return undefined;
  }

  return {
    ['--storefront-accent' as string]: primaryColor,
    ['--storefront-accent-hover' as string]: primaryColor,
    ['--color-accent-button' as string]: primaryColor,
    ['--color-accent-button-hover' as string]: primaryColor,
    ['--color-accent-strong' as string]: primaryColor,
  };
}

export function formatStorefrontAddress(store: {
  street?: string;
  addressNumber?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zipCode?: string;
}): string {
  return [
    store.street,
    store.addressNumber,
    store.neighborhood,
    `${store.city}/${store.state}`,
    store.zipCode,
  ]
    .filter(Boolean)
    .join(', ');
}
