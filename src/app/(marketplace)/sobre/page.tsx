import type { Metadata } from 'next';

import { ComingSoonView } from '@features/marketing';

export const metadata: Metadata = { title: 'Sobre' };

export default function SobrePage() {
  return <ComingSoonView title="Sobre" />;
}
