import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { VEHICLE_COST_TYPES, VEHICLE_OWNERSHIP } from '@app-types/membership';

import {
  buildCostBreakdown,
  buildPricingExplanation,
  calculatePriceFromMarginCents,
  diffVsFipe,
  estimateMarginBpsOnPrice,
  isValidMarginBps,
  normalizeMarginBps,
} from './pricing-calc.service';

describe('pricing-calc.service', () => {
  it('soma aquisição + extras sem double-count', () => {
    const breakdown = buildCostBreakdown(VEHICLE_OWNERSHIP.OWN, [
      { type: VEHICLE_COST_TYPES.ACQUISITION, amountCents: 7_000_000 },
      { type: VEHICLE_COST_TYPES.REPAIR, amountCents: 300_000 },
      { type: VEHICLE_COST_TYPES.DETAILING, amountCents: 200_000 },
    ]);

    assert.equal(breakdown.acquisitionCents, 7_000_000);
    assert.equal(breakdown.extrasCents, 500_000);
    assert.equal(breakdown.knownCostCents, 7_500_000);
    assert.equal(breakdown.costsComplete, true);
    assert.equal(breakdown.marginAnalysisAvailable, true);
  });

  it('distingue aquisição ausente de zero', () => {
    const missing = buildCostBreakdown(VEHICLE_OWNERSHIP.OWN, [
      { type: VEHICLE_COST_TYPES.REPAIR, amountCents: 10_000 },
    ]);
    assert.equal(missing.acquisitionMissing, true);
    assert.equal(missing.acquisitionCents, null);
    assert.equal(missing.costsComplete, false);

    const zero = buildCostBreakdown(VEHICLE_OWNERSHIP.OWN, [
      { type: VEHICLE_COST_TYPES.ACQUISITION, amountCents: 0 },
    ]);
    assert.equal(zero.acquisitionMissing, false);
    assert.equal(zero.acquisitionCents, 0);
    assert.equal(zero.knownCostCents, 0);
    assert.equal(zero.costsComplete, true);
  });

  it('consignado não oferece análise de margem completa', () => {
    const breakdown = buildCostBreakdown(VEHICLE_OWNERSHIP.CONSIGNED, [
      { type: VEHICLE_COST_TYPES.ACQUISITION, amountCents: 1_000_000 },
    ]);
    assert.equal(breakdown.marginAnalysisAvailable, false);
    assert.equal(breakdown.costsComplete, true);
  });

  it('calcula preço pela margem sobre venda (exemplo 15%)', () => {
    // 75000 / 0.85 = 88235.294... → ceil em centavos
    const price = calculatePriceFromMarginCents(7_500_000, 1500);
    assert.equal(price, 8_823_530);
  });

  it('margem 0% retorna o custo', () => {
    assert.equal(calculatePriceFromMarginCents(7_500_000, 0), 7_500_000);
  });

  it('rejeita margem inválida (>= 100%)', () => {
    assert.equal(isValidMarginBps(10_000), false);
    assert.equal(calculatePriceFromMarginCents(7_500_000, 10_000), null);
    assert.equal(normalizeMarginBps(10_000), 1500);
  });

  it('estima margem no preço anunciado', () => {
    const bps = estimateMarginBpsOnPrice(8_823_530, 7_500_000);
    assert.ok(bps != null && bps >= 1490 && bps <= 1510);
  });

  it('compara com FIPE', () => {
    const below = diffVsFipe(9_500_000, 10_000_000);
    assert.ok(below);
    assert.equal(below.absoluteCents, -500_000);
    assert.ok(below.label.includes('abaixo'));

    const near = diffVsFipe(10_100_000, 10_000_000);
    assert.ok(near);
    assert.equal(near.label, 'Próximo da referência FIPE');
  });

  it('monta explicação com fórmula transparente', () => {
    const explanation = buildPricingExplanation({
      fipePriceCents: 10_000_000,
      fipeReferenceLabel: 'abril/2026',
      knownCostCents: 7_500_000,
      desiredMarginBps: 1500,
      priceFromMarginCents: 8_823_530,
      marginAnalysisAvailable: true,
    });

    assert.ok(explanation.formula.includes('15'));
    assert.ok(explanation.limitations.length >= 2);
  });
});
