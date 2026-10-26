import type { Metadata } from 'next';

import { ComingSoonView } from '@features/marketing';

export const metadata: Metadata = { title: 'Contato' };

export default function ContatoPage() {
  return <ComingSoonView title="Contato" />;
}
