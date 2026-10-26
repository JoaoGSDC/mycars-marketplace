import {
  FIPE_MATCH_STATUS,
  FIPE_PROVIDERS,
  FIPE_VEHICLE_TYPES,
  type FipeCandidate,
  type FipeMatchStatus,
  type FipeReferenceDto,
} from '@app-types/pricing';
import type { FipePriceCacheRow } from '@lib/db';
import * as cacheRepo from '@server/repositories/fipe-cache.repository';

import { MAKE_SLUG_FIPE_ALIASES, normalizeText, scoreNameMatch, tokenize } from './brand-map';
import { FipeProviderError, type FipeBrand, type FipeProvider, type FipeYear } from './fipe.provider';
import { getDefaultFipeProvider } from './parallelum.fipe.provider';

export type MatchVehicleInput = {
  makeSlug: string;
  make?: string | null;
  modelSlug: string;
  model?: string | null;
  version?: string | null;
  yearModel: number;
  fuel?: string | null;
};

export type MatchOutcome = {
  status: FipeMatchStatus;
  candidates: FipeCandidate[];
  matched: FipeReferenceDto | null;
  message?: string;
};

function fuelAliases(fuel?: string | null): string[] {
  const map: Record<string, string[]> = {
    flex: ['flex', 'gasolina', 'álcool', 'alcool', 'etanol'],
    gasoline: ['gasolina'],
    ethanol: ['álcool', 'alcool', 'etanol'],
    diesel: ['diesel'],
    hybrid: ['híbrido', 'hibrido'],
    electric: ['elétrico', 'eletrico'],
  };

  if (!fuel) {
    return [];
  }

  return map[fuel] ?? [fuel];
}

function yearMatches(year: FipeYear, yearModel: number, fuel?: string | null): boolean {
  if (year.modelYear !== yearModel && year.modelYear !== 32000) {
    return false;
  }

  const aliases = fuelAliases(fuel);

  if (!aliases.length) {
    return true;
  }

  const yearFuel = normalizeText(year.fuel);

  return aliases.some((alias) => yearFuel.includes(normalizeText(alias)));
}

function toCandidate(input: {
  fipeCode: string;
  year: FipeYear;
  brand: FipeBrand;
  modelCode: string;
  modelName: string;
}): FipeCandidate {
  return {
    fipeCode: input.fipeCode,
    yearId: input.year.code,
    brandCode: input.brand.code,
    brandName: input.brand.name,
    modelCode: input.modelCode,
    modelName: input.modelName,
    fuel: input.year.fuel,
    modelYear: input.year.modelYear === 32000 ? input.year.modelYear : input.year.modelYear,
    label: `${input.brand.name} ${input.modelName} · ${input.year.name}`,
  };
}

function cacheToDto(row: FipePriceCacheRow): FipeReferenceDto {
  return {
    provider: row.provider as FipeReferenceDto['provider'],
    fipeCode: row.fipeCode,
    yearId: row.yearId,
    brandName: row.brandName,
    modelName: row.modelName,
    fuel: row.fuel,
    modelYear: row.modelYear,
    priceCents: row.priceCents,
    referenceCode: row.referenceCode,
    referenceLabel: row.referenceLabel,
    fetchedAt: row.fetchedAt,
  };
}

async function resolveLatestReferenceCode(provider: FipeProvider): Promise<{
  code: string;
  label: string;
} | null> {
  try {
    const refs = await provider.listReferences();
    const latest = refs[0];

    if (!latest) {
      return null;
    }

    return { code: latest.code, label: latest.month };
  } catch {
    return null;
  }
}

async function ensureCachedPrice(input: {
  provider: FipeProvider;
  brandCode: string;
  modelCode: string;
  yearId: string;
  fipeCodeHint?: string;
}): Promise<FipeReferenceDto | null> {
  const reference = await resolveLatestReferenceCode(input.provider);
  const referenceCode = reference?.code ?? 'latest';

  let price;

  try {
    price = await input.provider.getPrice({
      brandCode: input.brandCode,
      modelCode: input.modelCode,
      yearId: input.yearId,
      vehicleType: FIPE_VEHICLE_TYPES.CARS,
      referenceCode: reference?.code,
    });
  } catch (error) {
    if (error instanceof FipeProviderError && input.fipeCodeHint) {
      price = await input.provider.getPriceByCode({
        fipeCode: input.fipeCodeHint,
        yearId: input.yearId,
        vehicleType: FIPE_VEHICLE_TYPES.CARS,
        referenceCode: reference?.code,
      });
    } else {
      throw error;
    }
  }

  const cached = await cacheRepo.upsertCachedPrice({
    provider: price.provider,
    vehicleType: price.vehicleType,
    fipeCode: price.fipeCode,
    yearId: input.yearId,
    referenceCode: price.referenceCode || referenceCode,
    referenceLabel: price.referenceLabel || reference?.label || 'Referência atual',
    brandCode: price.brandCode || input.brandCode,
    brandName: price.brandName,
    modelCode: price.modelCode || input.modelCode,
    modelName: price.modelName,
    fuel: price.fuel,
    modelYear: price.modelYear,
    priceCents: price.priceCents,
    fetchedAt: price.fetchedAt,
  });

  return cacheToDto(cached);
}

function findBrand(brands: FipeBrand[], makeSlug: string, makeName?: string | null): FipeBrand[] {
  const aliases = MAKE_SLUG_FIPE_ALIASES[makeSlug] ?? [makeSlug.replace(/-/g, ' ')];
  const queries = [...aliases, makeName].filter(Boolean) as string[];

  const scored = brands
    .map((brand) => {
      const score = Math.max(...queries.map((q) => scoreNameMatch(q, brand.name)), 0);
      return { brand, score };
    })
    .filter((row) => row.score >= 50)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    return [];
  }

  const top = scored[0]!.score;
  return scored.filter((row) => row.score >= top - 5).map((row) => row.brand);
}

function filterModels(
  models: { code: string; name: string }[],
  modelSlug: string,
  modelName?: string | null,
  version?: string | null
) {
  const queryParts = [modelName, modelSlug.replace(/-/g, ' '), version]
    .filter(Boolean)
    .join(' ');
  const mustTokens = tokenize(modelName || modelSlug.replace(/-/g, ' '));

  const scored = models
    .map((model) => {
      let score = scoreNameMatch(queryParts, model.name);

      for (const token of mustTokens) {
        if (!normalizeText(model.name).includes(token)) {
          score -= 25;
        }
      }

      if (version) {
        const versionScore = scoreNameMatch(version, model.name);
        score += Math.round(versionScore * 0.3);
      }

      return { model, score };
    })
    .filter((row) => row.score >= 40)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 25);
}

/**
 * Matching assistido — nunca escolhe silenciosamente quando há ambiguidade.
 */
export async function findFipeCandidates(
  input: MatchVehicleInput,
  provider: FipeProvider = getDefaultFipeProvider()
): Promise<MatchOutcome> {
  try {
    const brands = await provider.listBrands(FIPE_VEHICLE_TYPES.CARS);
    const brandHits = findBrand(brands, input.makeSlug, input.make);

    if (!brandHits.length) {
      return {
        status: FIPE_MATCH_STATUS.UNMATCHED,
        candidates: [],
        matched: null,
        message: 'Marca não encontrada na tabela FIPE do provedor.',
      };
    }

    if (brandHits.length > 1) {
      return {
        status: FIPE_MATCH_STATUS.CANDIDATES,
        candidates: brandHits.map((brand) => ({
          fipeCode: '',
          yearId: '',
          brandCode: brand.code,
          brandName: brand.name,
          modelCode: '',
          modelName: '',
          fuel: '',
          modelYear: input.yearModel,
          label: `Marca: ${brand.name}`,
        })),
        matched: null,
        message: 'Há mais de uma marca possível. Refine ou informe o código FIPE.',
      };
    }

    const brand = brandHits[0]!;
    const models = await provider.listModels(brand.code, FIPE_VEHICLE_TYPES.CARS);
    const modelHits = filterModels(models, input.modelSlug, input.model, input.version);

    if (!modelHits.length) {
      return {
        status: FIPE_MATCH_STATUS.UNMATCHED,
        candidates: [],
        matched: null,
        message: 'Nenhum modelo FIPE correspondente. Tente o código FIPE manual.',
      };
    }

    const candidates: FipeCandidate[] = [];

    for (const hit of modelHits.slice(0, 12)) {
      const years = await provider.listYears(brand.code, hit.model.code, FIPE_VEHICLE_TYPES.CARS);
      const yearHits = years.filter((year) => yearMatches(year, input.yearModel, input.fuel));
      const selectedYears = yearHits.length
        ? yearHits
        : years.filter((y) => y.modelYear === input.yearModel);

      for (const year of selectedYears) {
        candidates.push(
          toCandidate({
            fipeCode: '',
            year,
            brand,
            modelCode: hit.model.code,
            modelName: hit.model.name,
          })
        );
      }
    }

    if (!candidates.length) {
      return {
        status: FIPE_MATCH_STATUS.UNMATCHED,
        candidates: [],
        matched: null,
        message: 'Modelo encontrado, mas sem ano/combustível correspondente.',
      };
    }

    // Match inequívoco: um único candidato → busca cotação e persiste.
    if (candidates.length === 1) {
      const only = candidates[0]!;
      const matched = await ensureCachedPrice({
        provider,
        brandCode: only.brandCode,
        modelCode: only.modelCode,
        yearId: only.yearId,
      });

      if (matched) {
        only.fipeCode = matched.fipeCode;
      }

      return {
        status: matched ? FIPE_MATCH_STATUS.MATCHED : FIPE_MATCH_STATUS.CANDIDATES,
        candidates,
        matched,
        message: matched ? undefined : 'Não foi possível obter a cotação FIPE.',
      };
    }

    return {
      status: FIPE_MATCH_STATUS.CANDIDATES,
      candidates,
      matched: null,
      message: 'Selecione a versão FIPE correspondente ao veículo.',
    };
  } catch (error) {
    if (error instanceof FipeProviderError) {
      return {
        status: FIPE_MATCH_STATUS.UNAVAILABLE,
        candidates: [],
        matched: null,
        message:
          error.kind === 'rate_limit'
            ? 'Limite de consultas FIPE atingido. Tente novamente mais tarde.'
            : 'Provedor FIPE indisponível no momento.',
      };
    }

    return {
      status: FIPE_MATCH_STATUS.UNAVAILABLE,
      candidates: [],
      matched: null,
      message: 'Falha ao consultar o provedor FIPE.',
    };
  }
}

export async function resolveCandidatePrice(
  candidate: Pick<FipeCandidate, 'brandCode' | 'modelCode' | 'yearId' | 'fipeCode'>,
  provider: FipeProvider = getDefaultFipeProvider()
): Promise<MatchOutcome> {
  try {
    const matched = await ensureCachedPrice({
      provider,
      brandCode: candidate.brandCode,
      modelCode: candidate.modelCode,
      yearId: candidate.yearId,
      fipeCodeHint: candidate.fipeCode || undefined,
    });

    if (!matched) {
      return {
        status: FIPE_MATCH_STATUS.UNAVAILABLE,
        candidates: [],
        matched: null,
        message: 'Não foi possível obter a cotação FIPE.',
      };
    }

    return {
      status: FIPE_MATCH_STATUS.MATCHED,
      candidates: [],
      matched,
    };
  } catch (error) {
    if (error instanceof FipeProviderError) {
      return {
        status: FIPE_MATCH_STATUS.UNAVAILABLE,
        candidates: [],
        matched: null,
        message:
          error.kind === 'not_found'
            ? 'Código FIPE não encontrado.'
            : 'Provedor FIPE indisponível no momento.',
      };
    }

    return {
      status: FIPE_MATCH_STATUS.UNAVAILABLE,
      candidates: [],
      matched: null,
      message: 'Falha ao consultar o provedor FIPE.',
    };
  }
}

/**
 * Escape hatch: código FIPE digitado manualmente + yearId (ex. 2014-1).
 */
export async function resolveManualFipeCode(input: {
  fipeCode: string;
  yearId: string;
  provider?: FipeProvider;
}): Promise<MatchOutcome> {
  const provider = input.provider ?? getDefaultFipeProvider();
  const fipeCode = input.fipeCode.trim();
  const yearId = input.yearId.trim();

  if (!fipeCode || !yearId) {
    return {
      status: FIPE_MATCH_STATUS.UNMATCHED,
      candidates: [],
      matched: null,
      message: 'Informe o código FIPE e o identificador do ano.',
    };
  }

  try {
    const reference = await resolveLatestReferenceCode(provider);
    const referenceCode = reference?.code ?? 'latest';

    const cachedHit = reference
      ? await cacheRepo.findCachedPrice({
          provider: FIPE_PROVIDERS.PARALLELUM,
          fipeCode,
          yearId,
          referenceCode: reference.code,
        })
      : await cacheRepo.findLatestCachedPrice({
          provider: FIPE_PROVIDERS.PARALLELUM,
          fipeCode,
          yearId,
        });

    if (cachedHit) {
      return {
        status: FIPE_MATCH_STATUS.MATCHED,
        candidates: [],
        matched: cacheToDto(cachedHit),
      };
    }

    const price = await provider.getPriceByCode({
      fipeCode,
      yearId,
      vehicleType: FIPE_VEHICLE_TYPES.CARS,
      referenceCode: reference?.code,
    });

    const cached = await cacheRepo.upsertCachedPrice({
      provider: price.provider,
      vehicleType: price.vehicleType,
      fipeCode: price.fipeCode,
      yearId,
      referenceCode: price.referenceCode || referenceCode,
      referenceLabel: price.referenceLabel || reference?.label || 'Referência atual',
      brandCode: price.brandCode || 'manual',
      brandName: price.brandName,
      modelCode: price.modelCode || 'manual',
      modelName: price.modelName,
      fuel: price.fuel,
      modelYear: price.modelYear,
      priceCents: price.priceCents,
      fetchedAt: price.fetchedAt,
    });

    return {
      status: FIPE_MATCH_STATUS.MATCHED,
      candidates: [],
      matched: cacheToDto(cached),
    };
  } catch (error) {
    if (error instanceof FipeProviderError && error.kind === 'not_found') {
      return {
        status: FIPE_MATCH_STATUS.UNMATCHED,
        candidates: [],
        matched: null,
        message: 'Código FIPE ou ano não encontrado.',
      };
    }

    return {
      status: FIPE_MATCH_STATUS.UNAVAILABLE,
      candidates: [],
      matched: null,
      message: 'Provedor FIPE indisponível no momento.',
    };
  }
}

export async function listYearsForManualCode(
  fipeCode: string,
  provider: FipeProvider = getDefaultFipeProvider()
): Promise<{ ok: true; years: FipeYear[] } | { ok: false; message: string }> {
  try {
    const years = await provider.listYearsByCode(fipeCode.trim(), FIPE_VEHICLE_TYPES.CARS);
    return { ok: true, years };
  } catch (error) {
    if (error instanceof FipeProviderError && error.kind === 'not_found') {
      return { ok: false, message: 'Código FIPE não encontrado.' };
    }

    return { ok: false, message: 'Provedor FIPE indisponível no momento.' };
  }
}

export async function refreshMatchedFromCacheOrProvider(input: {
  fipeCode: string;
  yearId: string;
  brandCode?: string | null;
  modelCode?: string | null;
  provider?: FipeProvider;
}): Promise<MatchOutcome> {
  if (input.brandCode && input.modelCode) {
    return resolveCandidatePrice(
      {
        brandCode: input.brandCode,
        modelCode: input.modelCode,
        yearId: input.yearId,
        fipeCode: input.fipeCode,
      },
      input.provider
    );
  }

  return resolveManualFipeCode({
    fipeCode: input.fipeCode,
    yearId: input.yearId,
    provider: input.provider,
  });
}
