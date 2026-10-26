import type { Metadata } from 'next';

import { ComingSoonView } from '@features/marketing';

export const metadata: Metadata = { title: 'Termos de uso' };

export default function TermosPage() {
  return <ComingSoonView title="Termos de uso" />;
}
