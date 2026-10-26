import type { NextConfig } from 'next';

/**
 * Tailwind v4 via PostCSS (`@tailwindcss/postcss`).
 * Não usar `turbopack.rules['*.css']` com `@tailwindcss/turbopack` —
 * isso intercepta `*.module.css` e quebra os exports (className fica undefined).
 */
const r2PublicHost = (() => {
  try {
    const raw = process.env.R2_PUBLIC_BASE_URL;

    if (!raw) {
      return null;
    }

    return new URL(raw).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'rrautomoveis.osasco.br',
        pathname: '/wp-content/uploads/**',
      },
      ...(r2PublicHost
        ? [
            {
              protocol: 'https' as const,
              hostname: r2PublicHost,
              pathname: '/**',
            },
          ]
        : []),
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/api/media/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        pathname: '/api/media/**',
      },
    ],
  },
};

export default nextConfig;
