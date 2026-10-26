import {
  DEFAULT_DESIRED_MARGIN_BPS,
  FIPE_MATCH_STATUS,
  FIPE_PROVIDERS,
  type FipeReferenceDto,
  type PricingAnalysisDto,
  type PricingExplanationDto,
} from '@app-types/pricing';
import { PERMISSIONS } from '@app-types/permissions';
import type { VehicleRow } from '@lib/db';
import { authorizeStoreAction } from '@server/auth/access';
import {
  findFipeCandidates,
  listYearsForManualCode,
  resolveCandidatePrice,
  resolveManualFipeCode,
} from '@server/fipe/fipe-match.service';
import * as cacheRepo from '@server/repositories/fipe-cache.repository';
import * as listingsRepo from '@server/repositories/listings.repository';
import * as costsRepo from '@server/repositories/vehicle-costs.repository';
import * as vehiclesRepo from '@server/repositories/vehicles.repository';
import { serviceError, serviceSuccess, type ServiceResult } from '@server/shared/service-result';

import {
  buildCostBreakdown,
  buildPricingExplanation,
  calculatePriceFromMarginCents,
  diffVsFipe,
  estimateMarginBpsOnPrice,
  normalizeMarginBps,
  type CostInput,
} from './pricing-calc.service';
import type {
  PricingManualCodeInput,
  PricingManualYearsInput,
  PricingMarginInput,
  PricingMatchInput,
  PricingPreviewInput,
  PricingSelectCandidateInput,
  PricingVehicleIdInput,
} from './pricing.validators';
import {
  pricingManualCodeSchema,
  pricingManualYearsSchema,
  pricingMarginSchema,
  pricingMatchSchema,
  pricingPreviewSchema,
  pricingSelectCandidateSchema,
  pricingVehicleIdSchema,
} from './pricing.validators';

async function vehicleToFipeDto(vehicle: VehicleRow): Promise<FipeReferenceDto | null> {
  if (
    vehicle.fipeMatchStatus !== FIPE_MATCH_STATUS.MATCHED ||
    !vehicle.fipeCode ||
    !vehicle.fipeYearId ||
    vehicle.fipePriceCents == null
  ) {
    return null;
  }

  const cached =
    vehicle.fipeReferenceCode
      ? await cacheRepo.findCachedPrice({
          provider: vehicle.fipeProvider ?? FIPE_PROVIDERS.PARALLELUM,
          fipeCode: vehicle.fipeCode,
          yearId: vehicle.fipeYearId,
          referenceCode: vehicle.fipeReferenceCode,
        })
      : await cacheRepo.findLatestCachedPrice({
          provider: vehicle.fipeProvider ?? FIPE_PROVIDERS.PARALLELUM,
          fipeCode: vehicle.fipeCode,
          yearId: vehicle.fipeYearId,
        });

  return {
    provider: (vehicle.fipeProvider as FipeReferenceDto['provider']) ?? FIPE_PROVIDERS.PARALLELUM,
    fipeCode: vehicle.fipeCode,
    yearId: vehicle.fipeYearId,
    brandName: cached?.brandName ?? vehicle.make,
    modelName: cached?.modelName ?? vehicle.model,
    fuel: vehicle.fipeFuel ?? cached?.fuel ?? '',
    modelYear: cached?.modelYear ?? vehicle.yearModel,
    priceCents: vehicle.fipePriceCents,
    referenceCode: vehicle.fipeReferenceCode ?? cached?.referenceCode ?? '',
    referenceLabel: vehicle.fipeReferenceLabel ?? cached?.referenceLabel ?? '',
    fetchedAt: vehicle.fipeFetchedAt ?? cached?.fetchedAt ?? '',
  };
}

async function persistMatch(
  vehicleId: string,
  matched: FipeReferenceDto,
  status: string = FIPE_MATCH_STATUS.MATCHED
): Promise<VehicleRow> {
  return vehiclesRepo.updateVehicleRow(vehicleId, {
    fipeMatchStatus: status,
    fipeCode: matched.fipeCode,
    fipeYearId: matched.yearId,
    fipeFuel: matched.fuel,
    fipeBrandCode: null,
    fipeModelCode: null,
    fipeProvider: matched.provider,
    fipeReferenceCode: matched.referenceCode,
    fipeReferenceLabel: matched.referenceLabel,
    fipePriceCents: matched.priceCents,
    fipeFetchedAt: matched.fetchedAt,
  });
}

async function persistMatchWithCodes(
  vehicleId: string,
  matched: FipeReferenceDto,
  codes: { brandCode: string; modelCode: string }
): Promise<VehicleRow> {
  return vehiclesRepo.updateVehicleRow(vehicleId, {
    fipeMatchStatus: FIPE_MATCH_STATUS.MATCHED,
    fipeCode: matched.fipeCode,
    fipeYearId: matched.yearId,
    fipeFuel: matched.fuel,
    fipeBrandCode: codes.brandCode,
    fipeModelCode: codes.modelCode,
    fipeProvider: matched.provider,
    fipeReferenceCode: matched.referenceCode,
    fipeReferenceLabel: matched.referenceLabel,
    fipePriceCents: matched.priceCents,
    fipeFetchedAt: matched.fetchedAt,
  });
}

function buildAnalysis(input: {
  vehicleId: string;
  ownership: string;
  costs: CostInput[];
  desiredMarginBps: number | null | undefined;
  askingPriceCents: number | null;
  listingPriceCents: number | null;
  matchStatus: PricingAnalysisDto['matchStatus'];
  fipe: FipeReferenceDto | null;
  candidates?: PricingAnalysisDto['candidates'];
  messages?: string[];
}): PricingAnalysisDto {
  const costs = buildCostBreakdown(input.ownership, input.costs);
  const desiredMarginBps = normalizeMarginBps(input.desiredMarginBps);
  const priceFromMarginCents =
    costs.marginAnalysisAvailable && costs.knownCostCents != null
      ? calculatePriceFromMarginCents(costs.knownCostCents, desiredMarginBps)
      : null;

  const messages = [...(input.messages ?? [])];

  if (costs.acquisitionMissing && costs.ownership === 'own') {
    messages.push('Informe o custo de aquisição para calcular a margem.');
  }

  if (costs.ownership === 'consigned') {
    messages.push(
      'Veículo consignado: a referência FIPE é exibida, mas a recomendação por margem não se aplica.'
    );
  }

  if (input.matchStatus === FIPE_MATCH_STATUS.MATCHED && input.fipe) {
    // ok
  } else if (input.matchStatus === FIPE_MATCH_STATUS.CANDIDATES) {
    messages.push('Há mais de uma versão FIPE possível — selecione a correta.');
  } else if (input.matchStatus === FIPE_MATCH_STATUS.UNMATCHED) {
    messages.push('Nenhuma correspondência FIPE automática. Use o código FIPE manual.');
  } else if (input.matchStatus === FIPE_MATCH_STATUS.UNAVAILABLE) {
    messages.push('Provedor FIPE indisponível. Tente novamente mais tarde.');
  }

  const canUseCalculatedPrice =
    input.matchStatus === FIPE_MATCH_STATUS.MATCHED &&
    costs.marginAnalysisAvailable &&
    priceFromMarginCents != null &&
    priceFromMarginCents > 0;

  return {
    vehicleId: input.vehicleId,
    matchStatus: input.matchStatus,
    fipe: input.fipe,
    candidates: input.candidates ?? [],
    costs,
    desiredMarginBps,
    priceFromMarginCents,
    askingPriceCents: input.askingPriceCents,
    listingPriceCents: input.listingPriceCents,
    diffAskingVsFipe:
      input.askingPriceCents != null && input.fipe
        ? diffVsFipe(input.askingPriceCents, input.fipe.priceCents)
        : null,
    diffMarginPriceVsFipe:
      priceFromMarginCents != null && input.fipe
        ? diffVsFipe(priceFromMarginCents, input.fipe.priceCents)
        : null,
    estimatedMarginOnAskingBps:
      costs.marginAnalysisAvailable &&
      costs.knownCostCents != null &&
      input.askingPriceCents != null &&
      input.askingPriceCents > 0
        ? estimateMarginBpsOnPrice(input.askingPriceCents, costs.knownCostCents)
        : null,
    canUseCalculatedPrice,
    messages: [...new Set(messages)],
  };
}

export async function getPricingAnalysis(
  input: PricingVehicleIdInput,
  userId: string
): Promise<ServiceResult<PricingAnalysisDto>> {
  const parsed = pricingVehicleIdSchema.safeParse(input);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const access = await authorizeStoreAction(
    userId,
    parsed.data.storeId,
    PERMISSIONS.VEHICLES_READ
  );

  if (!access.ok) {
    return access;
  }

  const canReadCosts = (
    await authorizeStoreAction(userId, parsed.data.storeId, PERMISSIONS.COSTS_READ)
  ).ok;

  const vehicle = await vehiclesRepo.findVehicleInStore(
    parsed.data.storeId,
    parsed.data.vehicleId
  );

  if (!vehicle) {
    return serviceError('NOT_FOUND', 'Veículo não encontrado');
  }

  const costRows = canReadCosts
    ? await costsRepo.listCostsByVehicle(parsed.data.storeId, parsed.data.vehicleId)
    : [];
  const listing = await listingsRepo.findListingByVehicleId(parsed.data.vehicleId);

  const fipe = await vehicleToFipeDto(vehicle);
  const matchStatus = (vehicle.fipeMatchStatus ||
    FIPE_MATCH_STATUS.UNMATCHED) as PricingAnalysisDto['matchStatus'];

  // Leitura local (veículo + cache). Refresh HTTP só via match com force / "Atualizar FIPE".

  return serviceSuccess(
    buildAnalysis({
      vehicleId: vehicle.id,
      ownership: vehicle.ownership,
      costs: costRows.map((c) => ({ type: c.type, amountCents: c.amountCents })),
      desiredMarginBps: vehicle.desiredMarginBps,
      askingPriceCents: vehicle.askingPriceCents,
      listingPriceCents: listing?.priceCents ?? null,
      matchStatus,
      fipe,
      messages: canReadCosts ? [] : ['Sem permissão para ver custos — margem oculta.'],
    })
  );
}

export async function matchVehicleFipe(
  input: PricingMatchInput,
  userId: string
): Promise<ServiceResult<PricingAnalysisDto>> {
  const parsed = pricingMatchSchema.safeParse(input);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const access = await authorizeStoreAction(
    userId,
    parsed.data.storeId,
    PERMISSIONS.VEHICLES_WRITE
  );

  if (!access.ok) {
    return access;
  }

  const vehicle = await vehiclesRepo.findVehicleInStore(
    parsed.data.storeId,
    parsed.data.vehicleId
  );

  if (!vehicle) {
    return serviceError('NOT_FOUND', 'Veículo não encontrado');
  }

  if (
    !parsed.data.force &&
    vehicle.fipeMatchStatus === FIPE_MATCH_STATUS.MATCHED &&
    vehicle.fipeCode
  ) {
    return getPricingAnalysis(parsed.data, userId);
  }

  const outcome = await findFipeCandidates({
    makeSlug: vehicle.makeSlug,
    make: vehicle.make,
    modelSlug: vehicle.modelSlug,
    model: vehicle.model,
    version: vehicle.version,
    yearModel: vehicle.yearModel,
    fuel: vehicle.fuel,
  });

  if (outcome.matched) {
    const only = outcome.candidates[0];

    if (only?.brandCode && only?.modelCode) {
      await persistMatchWithCodes(vehicle.id, outcome.matched, {
        brandCode: only.brandCode,
        modelCode: only.modelCode,
      });
    } else {
      await persistMatch(vehicle.id, outcome.matched);
    }
  } else {
    await vehiclesRepo.updateVehicleRow(vehicle.id, {
      fipeMatchStatus: outcome.status,
      fipeCode: null,
      fipeYearId: null,
      fipeFuel: null,
      fipeBrandCode: null,
      fipeModelCode: null,
      fipeProvider: null,
      fipeReferenceCode: null,
      fipeReferenceLabel: null,
      fipePriceCents: null,
      fipeFetchedAt: null,
    });
  }

  const canReadCosts = (
    await authorizeStoreAction(userId, parsed.data.storeId, PERMISSIONS.COSTS_READ)
  ).ok;
  const costRows = canReadCosts
    ? await costsRepo.listCostsByVehicle(parsed.data.storeId, vehicle.id)
    : [];
  const listing = await listingsRepo.findListingByVehicleId(vehicle.id);

  return serviceSuccess(
    buildAnalysis({
      vehicleId: vehicle.id,
      ownership: vehicle.ownership,
      costs: costRows.map((c) => ({ type: c.type, amountCents: c.amountCents })),
      desiredMarginBps: vehicle.desiredMarginBps,
      askingPriceCents: vehicle.askingPriceCents,
      listingPriceCents: listing?.priceCents ?? null,
      matchStatus: outcome.status,
      fipe: outcome.matched,
      candidates: outcome.candidates,
      messages: outcome.message ? [outcome.message] : [],
    })
  );
}

export async function selectFipeCandidate(
  input: PricingSelectCandidateInput,
  userId: string
): Promise<ServiceResult<PricingAnalysisDto>> {
  const parsed = pricingSelectCandidateSchema.safeParse(input);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const access = await authorizeStoreAction(
    userId,
    parsed.data.storeId,
    PERMISSIONS.VEHICLES_WRITE
  );

  if (!access.ok) {
    return access;
  }

  const vehicle = await vehiclesRepo.findVehicleInStore(
    parsed.data.storeId,
    parsed.data.vehicleId
  );

  if (!vehicle) {
    return serviceError('NOT_FOUND', 'Veículo não encontrado');
  }

  const outcome = await resolveCandidatePrice({
    brandCode: parsed.data.brandCode,
    modelCode: parsed.data.modelCode,
    yearId: parsed.data.yearId,
    fipeCode: parsed.data.fipeCode,
  });

  if (!outcome.matched) {
    return serviceError('VALIDATION', outcome.message ?? 'Não foi possível confirmar a FIPE');
  }

  await persistMatchWithCodes(vehicle.id, outcome.matched, {
    brandCode: parsed.data.brandCode,
    modelCode: parsed.data.modelCode,
  });

  return getPricingAnalysis(parsed.data, userId);
}

export async function applyManualFipeCode(
  input: PricingManualCodeInput,
  userId: string
): Promise<ServiceResult<PricingAnalysisDto>> {
  const parsed = pricingManualCodeSchema.safeParse(input);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const access = await authorizeStoreAction(
    userId,
    parsed.data.storeId,
    PERMISSIONS.VEHICLES_WRITE
  );

  if (!access.ok) {
    return access;
  }

  const vehicle = await vehiclesRepo.findVehicleInStore(
    parsed.data.storeId,
    parsed.data.vehicleId
  );

  if (!vehicle) {
    return serviceError('NOT_FOUND', 'Veículo não encontrado');
  }

  const outcome = await resolveManualFipeCode({
    fipeCode: parsed.data.fipeCode,
    yearId: parsed.data.yearId,
  });

  if (!outcome.matched) {
    return serviceError('VALIDATION', outcome.message ?? 'Código FIPE inválido');
  }

  await persistMatch(vehicle.id, outcome.matched);
  return getPricingAnalysis(parsed.data, userId);
}

export async function getManualFipeYears(
  input: PricingManualYearsInput,
  userId: string
): Promise<ServiceResult<{ years: { code: string; name: string }[] }>> {
  const parsed = pricingManualYearsSchema.safeParse(input);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const access = await authorizeStoreAction(
    userId,
    parsed.data.storeId,
    PERMISSIONS.VEHICLES_READ
  );

  if (!access.ok) {
    return access;
  }

  const result = await listYearsForManualCode(parsed.data.fipeCode);

  if (!result.ok) {
    return serviceError('VALIDATION', result.message);
  }

  return serviceSuccess({
    years: result.years.map((y) => ({ code: y.code, name: y.name })),
  });
}

export async function updateDesiredMargin(
  input: PricingMarginInput,
  userId: string
): Promise<ServiceResult<PricingAnalysisDto>> {
  const parsed = pricingMarginSchema.safeParse(input);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const access = await authorizeStoreAction(
    userId,
    parsed.data.storeId,
    PERMISSIONS.VEHICLES_WRITE
  );

  if (!access.ok) {
    return access;
  }

  const vehicle = await vehiclesRepo.findVehicleInStore(
    parsed.data.storeId,
    parsed.data.vehicleId
  );

  if (!vehicle) {
    return serviceError('NOT_FOUND', 'Veículo não encontrado');
  }

  await vehiclesRepo.updateVehicleRow(vehicle.id, {
    desiredMarginBps: parsed.data.desiredMarginBps,
  });

  return getPricingAnalysis(parsed.data, userId);
}

export async function getPricingExplanation(
  input: PricingVehicleIdInput,
  userId: string
): Promise<ServiceResult<PricingExplanationDto>> {
  const analysis = await getPricingAnalysis(input, userId);

  if (!analysis.ok) {
    return analysis;
  }

  return serviceSuccess(
    buildPricingExplanation({
      fipePriceCents: analysis.data.fipe?.priceCents ?? null,
      fipeReferenceLabel: analysis.data.fipe?.referenceLabel ?? null,
      knownCostCents: analysis.data.costs.knownCostCents,
      desiredMarginBps: analysis.data.desiredMarginBps,
      priceFromMarginCents: analysis.data.priceFromMarginCents,
      marginAnalysisAvailable: analysis.data.costs.marginAnalysisAvailable,
    })
  );
}

/**
 * Preview no wizard (pode não ter vehicleId ainda).
 * Não persiste match sem veículo; calcula margem localmente.
 */
export async function previewPricing(
  input: PricingPreviewInput,
  userId: string
): Promise<ServiceResult<PricingAnalysisDto>> {
  const parsed = pricingPreviewSchema.safeParse(input);

  if (!parsed.success) {
    return serviceError('VALIDATION', parsed.error.issues[0]?.message ?? 'Dados inválidos');
  }

  const access = await authorizeStoreAction(
    userId,
    parsed.data.storeId,
    PERMISSIONS.VEHICLES_READ
  );

  if (!access.ok) {
    return access;
  }

  if (parsed.data.vehicleId) {
    const vehicle = await vehiclesRepo.findVehicleInStore(
      parsed.data.storeId,
      parsed.data.vehicleId
    );

    if (!vehicle) {
      return serviceError('NOT_FOUND', 'Veículo não encontrado');
    }

    const canReadCosts = (
      await authorizeStoreAction(userId, parsed.data.storeId, PERMISSIONS.COSTS_READ)
    ).ok;
    const costRows = canReadCosts
      ? await costsRepo.listCostsByVehicle(parsed.data.storeId, parsed.data.vehicleId)
      : [];
    const listing = await listingsRepo.findListingByVehicleId(parsed.data.vehicleId);
    const draftCosts = parsed.data.draftCosts;
    const costs: CostInput[] =
      draftCosts ?? costRows.map((c) => ({ type: c.type, amountCents: c.amountCents }));

    return serviceSuccess(
      buildAnalysis({
        vehicleId: vehicle.id,
        ownership: parsed.data.ownership ?? vehicle.ownership,
        costs,
        desiredMarginBps:
          parsed.data.desiredMarginBps ?? vehicle.desiredMarginBps ?? DEFAULT_DESIRED_MARGIN_BPS,
        askingPriceCents:
          parsed.data.askingPriceCents !== undefined
            ? parsed.data.askingPriceCents
            : vehicle.askingPriceCents,
        listingPriceCents: listing?.priceCents ?? null,
        matchStatus: (vehicle.fipeMatchStatus ||
          FIPE_MATCH_STATUS.UNMATCHED) as PricingAnalysisDto['matchStatus'],
        fipe: await vehicleToFipeDto(vehicle),
        messages: canReadCosts ? [] : ['Sem permissão para ver custos — margem oculta.'],
      })
    );
  }

  // Sem veículo persistido: só custos/margem locais.
  return serviceSuccess(
    buildAnalysis({
      vehicleId: 'draft',
      ownership: parsed.data.ownership ?? 'own',
      costs: parsed.data.draftCosts ?? [],
      desiredMarginBps: parsed.data.desiredMarginBps ?? DEFAULT_DESIRED_MARGIN_BPS,
      askingPriceCents: parsed.data.askingPriceCents ?? null,
      listingPriceCents: null,
      matchStatus: FIPE_MATCH_STATUS.UNMATCHED,
      fipe: null,
      messages: [
        'Salve o veículo para buscar a referência FIPE. A margem pode ser estimada com os custos informados.',
      ],
    })
  );
}
