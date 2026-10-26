import type { ListingStatus, VehicleStatus } from './status';

export type FuelType = 'flex' | 'gasoline' | 'ethanol' | 'diesel' | 'electric' | 'hybrid';
export type TransmissionType = 'manual' | 'automatic' | 'cvt' | 'automated';
export type BodyType = 'sedan' | 'suv' | 'hatch' | 'pickup' | 'utility' | 'coupe' | 'convertible' | 'wagon';
export type DrivetrainType = 'fwd' | 'rwd' | 'awd' | '4wd';
/** Condição comercial no domínio interno. */
export type VehicleCondition = 'new' | 'seminew' | 'used';

export interface StoreSummary {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  /** Bairro exibido na listagem (quando houver). */
  neighborhood?: string;
  logoInitials?: string;
  /** WhatsApp público da loja (cards/contato). */
  whatsappNumber?: string;
  /** Status operacional da loja — default ativa nas fixtures. */
  storeStatus?: import('./status').StoreStatus;
}

export interface StoreProfile extends StoreSummary {
  /** Contagem publicada — fixture / agregação. */
  vehicleCount: number;
  verified: boolean;
  /** Capa da vitrine (fixtures: Unsplash). */
  coverImageUrl?: string;
  logoUrl?: string;
  subdomain?: string | null;
  tagline?: string;
}

/** Identidade pública completa da vitrine. */
export type PublicStorefront = StoreProfile & {
  about?: string;
  primaryColor?: string;
  /** Composição do hero — default integrated. */
  heroVariant?: import('./subscription').StorefrontHeroVariant;
  /** Enquadramento da capa — default center. */
  coverFocus?: import('./subscription').StorefrontCoverFocus;
  whatsappNumber?: string;
  contactPhone?: string;
  contactEmail?: string;
  socialInstagram?: string;
  socialFacebook?: string;
  /** JSON parseado ou lista vazia. */
  businessHours: Array<{ day?: string; open?: string; close?: string; label?: string }>;
  street?: string;
  addressNumber?: string;
  zipCode?: string;
  /** URL canônica preferida da vitrine (subdomínio ou /lojas/slug). */
  canonicalUrl: string;
  /** Base path para links internos ('' no subdomínio, `/lojas/slug` no path). */
  basePath: string;
};

export interface VehicleSpec {
  mileageKm: number;
  fuel: FuelType;
  transmission: TransmissionType;
  yearManufacture: number;
  yearModel: number;
  powerKw?: number;
  drivetrain?: DrivetrainType;
  bodyType: BodyType;
  color?: string;
}

export type VehicleGalleryImage = {
  id: string;
  url: string;
  cardUrl?: string | null;
  detailUrl?: string | null;
};

/** Dados comerciais públicos da loja (detalhe do anúncio). */
export type PublicStoreContact = {
  logoUrl?: string;
  tagline?: string;
  about?: string;
  contactPhone?: string;
  contactEmail?: string;
  whatsappNumber?: string;
};

export interface VehicleListing {
  id: string;
  slug: string;
  make: string;
  makeSlug: string;
  model: string;
  modelSlug: string;
  version: string;
  price: number;
  /** Preço anterior riscado — marca objetiva de "preço reduzido" (featured visual). */
  previousPrice?: number;
  condition: VehicleCondition;
  status: VehicleStatus;
  listingStatus: ListingStatus;
  /** ISO date — ordenação "recentes". */
  publishedAt: string;
  featured?: boolean;
  description: string;
  /** Opcionais e equipamentos públicos. */
  features?: string[];
  specs: VehicleSpec;
  store: StoreSummary;
  /** Sem foto — usa ImagePlaceholder. */
  hasPhoto?: boolean;
  /** URL da foto (fixtures: Unsplash; produção: storage / cardUrl). */
  imageUrl?: string;
  /** Variante otimizada para cards (object storage). */
  cardUrl?: string | null;
  /** Variante para página de detalhe. */
  detailUrl?: string | null;
  /** Galeria ordenada (detalhe). */
  gallery?: VehicleGalleryImage[];
}

export const FUEL_LABELS: Record<FuelType, string> = {
  flex: 'Flex',
  gasoline: 'Gasolina',
  ethanol: 'Etanol',
  diesel: 'Diesel',
  electric: 'Elétrico',
  hybrid: 'Híbrido',
};

export const TRANSMISSION_LABELS: Record<TransmissionType, string> = {
  manual: 'Manual',
  automatic: 'Automático',
  cvt: 'CVT',
  automated: 'Automatizado',
};

export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  sedan: 'Sedã',
  suv: 'SUV',
  hatch: 'Hatch',
  pickup: 'Picape',
  utility: 'Utilitário',
  coupe: 'Cupê',
  convertible: 'Conversível',
  wagon: 'Perua',
};

export const CONDITION_LABELS: Record<VehicleCondition, string> = {
  new: 'Novo',
  seminew: 'Seminovo',
  used: 'Usado',
};

export const DRIVETRAIN_LABELS: Record<DrivetrainType, string> = {
  fwd: 'Dianteira',
  rwd: 'Traseira',
  awd: 'AWD',
  '4wd': '4x4',
};

/** Corpo aceito na busca pública (subset). */
export const PUBLIC_BODY_TYPES = ['hatch', 'sedan', 'suv', 'pickup', 'utility'] as const;
export type PublicBodyType = (typeof PUBLIC_BODY_TYPES)[number];
