/** DTOs e constantes do Assistente de Precificação (painel privado). */

export const FIPE_PROVIDERS = {
  PARALLELUM: 'parallelum',
} as const;

export type FipeProviderId = (typeof FIPE_PROVIDERS)[keyof typeof FIPE_PROVIDERS];

export const FIPE_MATCH_STATUS = {
  UNMATCHED: 'unmatched',
  CANDIDATES: 'candidates',
  MATCHED: 'matched',
  STALE: 'stale',
  UNAVAILABLE: 'unavailable',
} as const;

export type FipeMatchStatus = (typeof FIPE_MATCH_STATUS)[keyof typeof FIPE_MATCH_STATUS];

export const FIPE_VEHICLE_TYPES = {
  CARS: 'cars',
} as const;

export type FipeVehicleType = (typeof FIPE_VEHICLE_TYPES)[keyof typeof FIPE_VEHICLE_TYPES];

/** Margem padrão do assistente: 15% = 1500 bps. */
export const DEFAULT_DESIRED_MARGIN_BPS = 1500;

export type FipeCandidate = {
  fipeCode: string;
  yearId: string;
  brandCode: string;
  brandName: string;
  modelCode: string;
  modelName: string;
  fuel: string;
  modelYear: number;
  label: string;
};

export type FipeReferenceDto = {
  provider: FipeProviderId;
  fipeCode: string;
  yearId: string;
  brandName: string;
  modelName: string;
  fuel: string;
  modelYear: number;
  priceCents: number;
  referenceCode: string;
  referenceLabel: string;
  fetchedAt: string;
};

export type PricingCostBreakdown = {
  ownership: 'own' | 'consigned';
  acquisitionCents: number | null;
  acquisitionMissing: boolean;
  extrasCents: number;
  extrasCount: number;
  knownCostCents: number | null;
  costsComplete: boolean;
  /** Consignado: análise de margem por aquisição não se aplica da mesma forma. */
  marginAnalysisAvailable: boolean;
};

export type PricingDiffVsFipe = {
  absoluteCents: number;
  percentTimes100: number;
  label: string;
};

export type PricingAnalysisDto = {
  vehicleId: string;
  matchStatus: FipeMatchStatus;
  fipe: FipeReferenceDto | null;
  candidates: FipeCandidate[];
  costs: PricingCostBreakdown;
  desiredMarginBps: number;
  priceFromMarginCents: number | null;
  askingPriceCents: number | null;
  listingPriceCents: number | null;
  diffAskingVsFipe: PricingDiffVsFipe | null;
  diffMarginPriceVsFipe: PricingDiffVsFipe | null;
  estimatedMarginOnAskingBps: number | null;
  canUseCalculatedPrice: boolean;
  messages: string[];
};

export type PricingExplanationDto = {
  fipePriceCents: number | null;
  fipeReferenceLabel: string | null;
  knownCostCents: number | null;
  desiredMarginBps: number;
  formula: string;
  priceFromMarginCents: number | null;
  limitations: string[];
};
