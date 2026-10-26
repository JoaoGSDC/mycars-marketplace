import { canStorePublishListings, LISTING_STATUS, STORE_STATUS, VEHICLE_STATUS } from '@app-types/status';

export type PublishEligibilityInput = {
  vehicleStatus: string;
  storeStatus: string;
  listingStatus?: string | null;
  hasPhotos?: boolean;
  priceCents?: number | null;
  title?: string | null;
  description?: string | null;
};

export type EligibilityResult =
  | { ok: true }
  | { ok: false; code: 'VEHICLE' | 'STORE' | 'LISTING' | 'CONTENT'; message: string };

/**
 * Regras de domínio para publicar / manter anúncio público.
 * Espelha o contrato de `isPubliclyListable` sem depender do DTO de UI.
 */
export function assertCanPublishListing(input: PublishEligibilityInput): EligibilityResult {
  if (input.vehicleStatus === VEHICLE_STATUS.PREPARING) {
    return {
      ok: false,
      code: 'VEHICLE',
      message: 'Veículo em preparação não pode ser publicado',
    };
  }

  if (input.vehicleStatus === VEHICLE_STATUS.SOLD) {
    return {
      ok: false,
      code: 'VEHICLE',
      message: 'Veículo vendido não pode anunciar disponibilidade',
    };
  }

  if (input.vehicleStatus === VEHICLE_STATUS.WITHDRAWN) {
    return {
      ok: false,
      code: 'VEHICLE',
      message: 'Veículo retirado do estoque não pode ser publicado',
    };
  }

  if (!canStorePublishListings(input.storeStatus)) {
    return {
      ok: false,
      code: 'STORE',
      message: 'Loja não aprovada ou não habilitada para publicar anúncios',
    };
  }

  if (input.listingStatus === LISTING_STATUS.SUSPENDED) {
    return {
      ok: false,
      code: 'LISTING',
      message: 'Anúncio suspenso administrativamente — lojista não pode republicar',
    };
  }

  if (input.listingStatus === LISTING_STATUS.CLOSED) {
    return {
      ok: false,
      code: 'LISTING',
      message: 'Anúncio encerrado não pode ser republicado',
    };
  }

  if (input.priceCents != null && input.priceCents < 0) {
    return { ok: false, code: 'CONTENT', message: 'Preço público inválido' };
  }

  if (input.priceCents === 0 || input.priceCents == null) {
    return { ok: false, code: 'CONTENT', message: 'Informe o preço público do anúncio' };
  }

  if (input.title != null && input.title.trim().length < 3) {
    return { ok: false, code: 'CONTENT', message: 'Título comercial muito curto' };
  }

  if (input.hasPhotos === false) {
    return { ok: false, code: 'CONTENT', message: 'Selecione ao menos uma fotografia pública' };
  }

  return { ok: true };
}

/** Visibilidade pública conjunta (marketplace + vitrine) a partir de rows. */
export function isListingRowPubliclyVisible(input: {
  listingStatus: string;
  vehicleStatus: string;
  storeStatus: string;
}): boolean {
  if (input.listingStatus !== LISTING_STATUS.PUBLISHED) {
    return false;
  }

  if (
    input.vehicleStatus === VEHICLE_STATUS.SOLD ||
    input.vehicleStatus === VEHICLE_STATUS.WITHDRAWN ||
    input.vehicleStatus === VEHICLE_STATUS.PREPARING
  ) {
    return false;
  }

  if (input.storeStatus !== STORE_STATUS.ACTIVE) {
    return false;
  }

  return true;
}

export const DEALER_LISTING_TRANSITIONS: Record<string, readonly string[]> = {
  [LISTING_STATUS.DRAFT]: [LISTING_STATUS.PUBLISHED, LISTING_STATUS.CLOSED],
  [LISTING_STATUS.PUBLISHED]: [LISTING_STATUS.PAUSED, LISTING_STATUS.CLOSED],
  [LISTING_STATUS.PAUSED]: [LISTING_STATUS.PUBLISHED, LISTING_STATUS.CLOSED],
  [LISTING_STATUS.SUSPENDED]: [],
  [LISTING_STATUS.CLOSED]: [],
};

export const ADMIN_LISTING_TRANSITIONS: Record<string, readonly string[]> = {
  [LISTING_STATUS.DRAFT]: [LISTING_STATUS.SUSPENDED, LISTING_STATUS.CLOSED],
  [LISTING_STATUS.PUBLISHED]: [LISTING_STATUS.SUSPENDED, LISTING_STATUS.CLOSED, LISTING_STATUS.PAUSED],
  [LISTING_STATUS.PAUSED]: [
    LISTING_STATUS.SUSPENDED,
    LISTING_STATUS.CLOSED,
    LISTING_STATUS.PUBLISHED,
  ],
  [LISTING_STATUS.SUSPENDED]: [
    LISTING_STATUS.PAUSED,
    LISTING_STATUS.PUBLISHED,
    LISTING_STATUS.CLOSED,
  ],
  [LISTING_STATUS.CLOSED]: [],
};

export function canDealerTransitionListing(from: string, to: string): boolean {
  if (from === to) {
    return true;
  }

  return (DEALER_LISTING_TRANSITIONS[from] ?? []).includes(to);
}

export function canAdminTransitionListing(from: string, to: string): boolean {
  if (from === to) {
    return true;
  }

  return (ADMIN_LISTING_TRANSITIONS[from] ?? []).includes(to);
}
