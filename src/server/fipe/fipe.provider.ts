import type { FipeProviderId, FipeVehicleType } from '@app-types/pricing';

export type FipeBrand = {
  code: string;
  name: string;
};

export type FipeModel = {
  code: string;
  name: string;
};

export type FipeYear = {
  code: string;
  name: string;
  /** Ano numérico extraído (9999 = zero km). */
  modelYear: number;
  fuel: string;
};

export type FipePriceResult = {
  provider: FipeProviderId;
  vehicleType: FipeVehicleType;
  fipeCode: string;
  yearId: string;
  brandCode: string;
  brandName: string;
  modelCode: string;
  modelName: string;
  fuel: string;
  modelYear: number;
  priceCents: number;
  referenceCode: string;
  referenceLabel: string;
  fetchedAt: string;
};

export type FipeReferenceMonth = {
  code: string;
  month: string;
};

export class FipeProviderError extends Error {
  constructor(
    message: string,
    readonly kind: 'timeout' | 'rate_limit' | 'http' | 'parse' | 'not_found',
    readonly status?: number
  ) {
    super(message);
    this.name = 'FipeProviderError';
  }
}

/** Contrato para provedores FIPE (Parallelum hoje; trocável depois). */
export interface FipeProvider {
  readonly id: FipeProviderId;

  listReferences(): Promise<FipeReferenceMonth[]>;
  listBrands(vehicleType?: FipeVehicleType): Promise<FipeBrand[]>;
  listModels(brandCode: string, vehicleType?: FipeVehicleType): Promise<FipeModel[]>;
  listYears(
    brandCode: string,
    modelCode: string,
    vehicleType?: FipeVehicleType
  ): Promise<FipeYear[]>;
  getPrice(input: {
    brandCode: string;
    modelCode: string;
    yearId: string;
    vehicleType?: FipeVehicleType;
    referenceCode?: string;
  }): Promise<FipePriceResult>;
  /** Lookup direto por código FIPE + ano. */
  getPriceByCode(input: {
    fipeCode: string;
    yearId: string;
    vehicleType?: FipeVehicleType;
    referenceCode?: string;
  }): Promise<FipePriceResult>;
  listYearsByCode(
    fipeCode: string,
    vehicleType?: FipeVehicleType
  ): Promise<FipeYear[]>;
}
