import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';

import { brand } from '@config/brand';
import '@/styles/index.css';

/**
 * Fonte embutida no repo (next/font/local).
 * Evita falha intermitente do next/font/google com URLs /l/font?kit=… no build Turbopack/Vercel.
 * @see https://github.com/vercel/next.js/issues/99114
 */
const hankenGrotesk = localFont({
  src: [
    {
      path: './fonts/HankenGrotesk-latin.woff2',
      weight: '100 900',
      style: 'normal',
    },
    {
      path: './fonts/HankenGrotesk-latin-ext.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
  variable: '--font-hanken-grotesk',
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: brand.name,
    template: `%s · ${brand.name}`,
  },
  description: brand.tagline,
};

/** Viewport mobile: safe areas e zoom acessível (não desabilita pinch-zoom). */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${hankenGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-bg text-text">{children}</body>
    </html>
  );
}
