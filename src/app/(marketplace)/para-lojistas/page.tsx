import type { Metadata } from 'next';

import { DealersLandingView } from '@features/marketing';
import { dealersLandingContent } from '@features/marketing/dealers.landing.content';

export const metadata: Metadata = {
  title: dealersLandingContent.meta.title,
  description: dealersLandingContent.meta.description,
};

export default function ParaLojistasPage() {
  return <DealersLandingView />;
}
