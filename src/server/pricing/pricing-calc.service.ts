import { VEHICLE_COST_TYPES, VEHICLE_OWNERSHIP } from '@app-types/membership';
import {
  DEFAULT_DESIRED_MARGIN_BPS,
  type PricingCostBreakdown,
  type PricingDiffVsFipe,
  type PricingExplanationDto,
} from '@app-types/pricing';

export type CostInput = {
  type: string;
  amountCents: number;
};

/**
 * Soma custos conhecidos a partir de vehicle_costs (sem double-count).
 * Consignado: análise de margem por aquisição não é oferecida como recomendação completa.
 */
export function buildCostBreakdown(
  ownership: string,
  costs: CostInput[]
): PricingCostBreakdown {
  const acquisitionRows = costs.filter((c) => c.type === VEHICLE_COST_TYPES.ACQUISITION);
  const extraRows = costs.filter((c) => c.type !== VEHICLE_COST_TYPES.ACQUISITION);

  const acquisitionMissing = acquisitionRows.length === 0;
  const acquisitionCents = acquisitionMissing
    ? null
    : acquisitionRows.reduce((sum, row) => sum + row.amountCents, 0);
  const extrasCents = extraRows.reduce((sum, row) => sum + row.amountCents, 0);

  const isConsigned = ownership === VEHICLE_OWNERSHIP.CONSIGNED;
  const costsComplete = !acquisitionMissing;
  const knownCostCents =
    acquisitionCents == null ? null : acquisitionCents + extrasCents;

  return {
    ownership: isConsigned ? VEHICLE_OWNERSHIP.CONSIGNED : VEHICLE_OWNERSHIP.OWN,
    acquisitionCents,
    acquisitionMissing,
    extrasCents,
    extrasCount: extraRows.length,
    knownCostCents,
    costsComplete,
    marginAnalysisAvailable: !isConsigned && costsComplete && knownCostCents != null,
  };
}

/** Valida margem em basis points. 0 ≤ bps < 10000. */
export function isValidMarginBps(bps: number): boolean {
  return Number.isInteger(bps) && bps >= 0 && bps < 10_000;
}

export function normalizeMarginBps(bps: number | null | undefined): number {
  if (bps == null || !isValidMarginBps(bps)) {
    return DEFAULT_DESIRED_MARGIN_BPS;
  }

  return bps;
}

/**
 * Preço de venda para atingir margem bruta desejada sobre o preço:
 * preço = custo / (1 - margem/100)
 * Usa aritmética inteira (ceil) em centavos.
 */
export function calculatePriceFromMarginCents(
  knownCostCents: number,
  marginBps: number
): number | null {
  if (!Number.isFinite(knownCostCents) || knownCostCents < 0) {
    return null;
  }

  if (!isValidMarginBps(marginBps)) {
    return null;
  }

  if (marginBps === 0) {
    return Math.ceil(knownCostCents);
  }

  const denominator = 10_000 - marginBps;

  if (denominator <= 0) {
    return null;
  }

  return Math.ceil((knownCostCents * 10_000) / denominator);
}

/**
 * Margem bruta estimada no preço anunciado, em bps.
 * ((preço - custo) / preço) * 10000
 */
export function estimateMarginBpsOnPrice(
  priceCents: number,
  knownCostCents: number
): number | null {
  if (!Number.isFinite(priceCents) || priceCents <= 0) {
    return null;
  }

  if (!Number.isFinite(knownCostCents) || knownCostCents < 0) {
    return null;
  }

  return Math.round(((priceCents - knownCostCents) * 10_000) / priceCents);
}

export function diffVsFipe(
  priceCents: number,
  fipePriceCents: number
): PricingDiffVsFipe | null {
  if (!Number.isFinite(priceCents) || priceCents <= 0) {
    return null;
  }

  if (!Number.isFinite(fipePriceCents) || fipePriceCents <= 0) {
    return null;
  }

  const absoluteCents = priceCents - fipePriceCents;
  const percentTimes100 = Math.round(((priceCents * 10_000) / fipePriceCents) - 10_000);
  const absPct = Math.abs(percentTimes100) / 100;

  let label: string;

  if (Math.abs(percentTimes100) <= 200) {
    label = 'Próximo da referência FIPE';
  } else if (percentTimes100 < 0) {
    label = `${formatPct(absPct)} abaixo da FIPE`;
  } else {
    label = `${formatPct(absPct)} acima da FIPE`;
  }

  return { absoluteCents, percentTimes100, label };
}

function formatPct(value: number): string {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

export function buildPricingExplanation(input: {
  fipePriceCents: number | null;
  fipeReferenceLabel: string | null;
  knownCostCents: number | null;
  desiredMarginBps: number;
  priceFromMarginCents: number | null;
  marginAnalysisAvailable: boolean;
}): PricingExplanationDto {
  const marginPct = input.desiredMarginBps / 100;
  const limitations: string[] = [
    'A referência FIPE é informativa e vem de provedor terceiro (não é API oficial da Fundação FIPE).',
    'A margem estimada considera apenas custos registrados neste veículo — não inclui tributos, comissões ou despesas indiretas.',
    'A sugestão não garante venda, lucro ou competitividade regional.',
  ];

  if (!input.marginAnalysisAvailable) {
    limitations.unshift(
      'Análise de margem incompleta: custos insuficientes ou veículo consignado.'
    );
  }

  return {
    fipePriceCents: input.fipePriceCents,
    fipeReferenceLabel: input.fipeReferenceLabel,
    knownCostCents: input.knownCostCents,
    desiredMarginBps: input.desiredMarginBps,
    formula: `Preço = Custo conhecido ÷ (1 − ${marginPct}% / 100)`,
    priceFromMarginCents: input.priceFromMarginCents,
    limitations,
  };
}
