import { FIPE_PROVIDERS, FIPE_VEHICLE_TYPES, type FipeVehicleType } from '@app-types/pricing';

import {
  FipeProviderError,
  type FipeBrand,
  type FipeModel,
  type FipePriceResult,
  type FipeProvider,
  type FipeReferenceMonth,
  type FipeYear,
} from './fipe.provider';

const BASE_URL = 'https://fipe.parallelum.com.br/api/v2';
const DEFAULT_TIMEOUT_MS = 8_000;

type ParallelumBrand = { code: string; name: string };
type ParallelumModel = { code: string; name: string };
type ParallelumYear = { code: string; name: string };
type ParallelumReference = { code: string; month: string };
type ParallelumPrice = {
  brand: string;
  codeFipe: string;
  fuel: string;
  model: string;
  modelYear: number;
  price: string;
  referenceMonth: string;
  vehicleType?: number;
};

function parseBrlToCents(price: string): number {
  const cleaned = price.replace(/[^\d,]/g, '').replace(',', '.');
  const value = Number.parseFloat(cleaned);

  if (!Number.isFinite(value)) {
    throw new FipeProviderError('Preço FIPE inválido na resposta', 'parse');
  }

  return Math.round(value * 100);
}

function parseYearName(name: string): { modelYear: number; fuel: string } {
  const [yearPart, ...fuelParts] = name.split(' ');
  const fuel = fuelParts.join(' ').trim() || '—';

  if (yearPart === '32000') {
    return { modelYear: 32000, fuel };
  }

  const modelYear = Number.parseInt(yearPart, 10);

  return {
    modelYear: Number.isFinite(modelYear) ? modelYear : 0,
    fuel,
  };
}

export class ParallelumFipeProvider implements FipeProvider {
  readonly id = FIPE_PROVIDERS.PARALLELUM;

  constructor(
    private readonly token: string | undefined = process.env.FIPE_API_TOKEN,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS
  ) {}

  async listReferences(): Promise<FipeReferenceMonth[]> {
    const rows = await this.getJson<ParallelumReference[]>('/references');
    return rows.map((row) => ({ code: String(row.code), month: row.month.trim() }));
  }

  async listBrands(vehicleType: FipeVehicleType = FIPE_VEHICLE_TYPES.CARS): Promise<FipeBrand[]> {
    const rows = await this.getJson<ParallelumBrand[]>(`/${vehicleType}/brands`);
    return rows.map((row) => ({ code: String(row.code), name: row.name }));
  }

  async listModels(
    brandCode: string,
    vehicleType: FipeVehicleType = FIPE_VEHICLE_TYPES.CARS
  ): Promise<FipeModel[]> {
    const rows = await this.getJson<ParallelumModel[]>(
      `/${vehicleType}/brands/${encodeURIComponent(brandCode)}/models`
    );
    return rows.map((row) => ({ code: String(row.code), name: row.name }));
  }

  async listYears(
    brandCode: string,
    modelCode: string,
    vehicleType: FipeVehicleType = FIPE_VEHICLE_TYPES.CARS
  ): Promise<FipeYear[]> {
    const rows = await this.getJson<ParallelumYear[]>(
      `/${vehicleType}/brands/${encodeURIComponent(brandCode)}/models/${encodeURIComponent(modelCode)}/years`
    );
    return rows.map((row) => {
      const parsed = parseYearName(row.name);
      return {
        code: String(row.code),
        name: row.name,
        modelYear: parsed.modelYear,
        fuel: parsed.fuel,
      };
    });
  }

  async getPrice(input: {
    brandCode: string;
    modelCode: string;
    yearId: string;
    vehicleType?: FipeVehicleType;
    referenceCode?: string;
  }): Promise<FipePriceResult> {
    const vehicleType = input.vehicleType ?? FIPE_VEHICLE_TYPES.CARS;
    const path =
      `/${vehicleType}/brands/${encodeURIComponent(input.brandCode)}` +
      `/models/${encodeURIComponent(input.modelCode)}` +
      `/years/${encodeURIComponent(input.yearId)}`;
    const data = await this.getJson<ParallelumPrice>(path, input.referenceCode);
    return this.toPriceResult(data, {
      brandCode: input.brandCode,
      modelCode: input.modelCode,
      yearId: input.yearId,
      vehicleType,
      referenceCode: input.referenceCode,
    });
  }

  async listYearsByCode(
    fipeCode: string,
    vehicleType: FipeVehicleType = FIPE_VEHICLE_TYPES.CARS
  ): Promise<FipeYear[]> {
    const rows = await this.getJson<ParallelumYear[]>(
      `/${vehicleType}/${encodeURIComponent(fipeCode)}/years`
    );
    return rows.map((row) => {
      const parsed = parseYearName(row.name);
      return {
        code: String(row.code),
        name: row.name,
        modelYear: parsed.modelYear,
        fuel: parsed.fuel,
      };
    });
  }

  async getPriceByCode(input: {
    fipeCode: string;
    yearId: string;
    vehicleType?: FipeVehicleType;
    referenceCode?: string;
  }): Promise<FipePriceResult> {
    const vehicleType = input.vehicleType ?? FIPE_VEHICLE_TYPES.CARS;
    const path =
      `/${vehicleType}/${encodeURIComponent(input.fipeCode)}` +
      `/years/${encodeURIComponent(input.yearId)}`;
    const data = await this.getJson<ParallelumPrice>(path, input.referenceCode);
    return this.toPriceResult(data, {
      brandCode: '',
      modelCode: '',
      yearId: input.yearId,
      vehicleType,
      referenceCode: input.referenceCode,
    });
  }

  private toPriceResult(
    data: ParallelumPrice,
    meta: {
      brandCode: string;
      modelCode: string;
      yearId: string;
      vehicleType: FipeVehicleType;
      referenceCode?: string;
    }
  ): FipePriceResult {
    return {
      provider: this.id,
      vehicleType: meta.vehicleType,
      fipeCode: data.codeFipe,
      yearId: meta.yearId,
      brandCode: meta.brandCode,
      brandName: data.brand,
      modelCode: meta.modelCode,
      modelName: data.model,
      fuel: data.fuel,
      modelYear: data.modelYear,
      priceCents: parseBrlToCents(data.price),
      referenceCode: meta.referenceCode ?? '',
      referenceLabel: data.referenceMonth.trim(),
      fetchedAt: new Date().toISOString(),
    };
  }

  private async getJson<T>(path: string, referenceCode?: string): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);

    if (referenceCode) {
      url.searchParams.set('reference', referenceCode);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      if (this.token) {
        headers['X-Subscription-Token'] = this.token;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
        cache: 'no-store',
      });

      if (response.status === 429) {
        throw new FipeProviderError('Limite de consultas FIPE atingido', 'rate_limit', 429);
      }

      if (response.status === 404) {
        throw new FipeProviderError('Referência FIPE não encontrada', 'not_found', 404);
      }

      if (!response.ok) {
        throw new FipeProviderError(
          `Provedor FIPE respondeu ${response.status}`,
          'http',
          response.status
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof FipeProviderError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new FipeProviderError('Timeout ao consultar provedor FIPE', 'timeout');
      }

      throw new FipeProviderError(
        error instanceof Error ? error.message : 'Falha ao consultar provedor FIPE',
        'http'
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

let singleton: ParallelumFipeProvider | null = null;

export function getDefaultFipeProvider(): FipeProvider {
  if (!singleton) {
    singleton = new ParallelumFipeProvider();
  }

  return singleton;
}

/** Apenas testes. */
export function resetFipeProviderSingleton(): void {
  singleton = null;
}
