import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vitrine da loja',
};

/**
 * Layout fino do grupo (storefront).
 * A identidade visual é aplicada em StorefrontHomeView / páginas filhas.
 */
export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return children;
}
