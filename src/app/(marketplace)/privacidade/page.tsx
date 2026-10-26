import type { Metadata } from 'next';

import { ComingSoonView } from '@features/marketing';

export const metadata: Metadata = { title: 'Privacidade' };

export default function PrivacidadePage() {
  return <ComingSoonView title="Política de Privacidade" />;
}
