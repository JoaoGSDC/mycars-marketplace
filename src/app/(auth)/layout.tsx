import type { Metadata } from 'next';

import { ToastProvider } from '@components/ui';

export const metadata: Metadata = {
  title: 'Acesso',
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
