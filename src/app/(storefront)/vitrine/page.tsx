import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { StorefrontHomeView, StorefrontMissingView } from '@features/storefront';
import { brand } from '@config/brand';
import { requireSession, requireStoreAccess } from '@server/auth/access';
import { PERMISSIONS } from '@app-types/permissions';
import { services } from '@services';
import { parseVehicleSearchParams } from '@utils/vehicle-search-params';

export const revalidate = 60;

type SearchParamsInput = Record<string, string | string[] | undefined>;

function toURLSearchParams(input: SearchParamsInput): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
    } else {
      params.set(key, value);
    }
  }

  return params;
}

export async function generateMetadata(): Promise<Metadata> {
  const resolved = await services.storefront.resolveFromRequest();

  if (resolved.mode === 'subdomain') {
    return {
      title: `${resolved.storefront.name} | ${brand.name}`,
      description: resolved.storefront.tagline || undefined,
      alternates: { canonical: resolved.storefront.canonicalUrl },
      robots: { index: true, follow: true },
    };
  }

  return {
    title: `Pré-visualização da vitrine | ${brand.name}`,
    robots: { index: false, follow: false },
  };
}

/**
 * Responsabilidades de `/vitrine`:
 * 1. Subdomínio (via proxy rewrite) → vitrine pública da loja.
 * 2. Apex autenticado → preview da loja do usuário (não é URL pública genérica).
 */
export default async function VitrinePage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const raw = await searchParams;
  const filters = parseVehicleSearchParams(toURLSearchParams(raw));

  const resolved = await services.storefront.resolveFromRequest();

  if (resolved.mode === 'missing_subdomain') {
    return <StorefrontMissingView subdomain={resolved.subdomain} />;
  }

  if (resolved.mode === 'subdomain') {
    const result = await services.storefront.searchStoreVehicles(
      resolved.storefront.id,
      filters
    );

    return (
      <StorefrontHomeView
        storefront={resolved.storefront}
        params={filters}
        result={result}
        mode="subdomain"
      />
    );
  }

  // Preview autenticado no apex
  const session = await requireSession();

  if (!session.ok) {
    redirect('/entrar?next=/vitrine');
  }

  const access = await requireStoreAccess({
    permission: PERMISSIONS.STOREFRONT_WRITE,
  });

  if (!access.ok) {
    notFound();
  }

  const useDraft = firstParam(raw.rascunho) === '1';
  const preview = await services.storefront.resolveFromRequest(access.data.store.id, {
    useDraft,
  });

  if (preview.mode !== 'preview') {
    notFound();
  }

  const result = await services.storefront.searchStoreVehicles(preview.storefront.id, filters);

  return (
    <StorefrontHomeView
      storefront={preview.storefront}
      params={filters}
      result={result}
      mode="preview"
    />
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}
