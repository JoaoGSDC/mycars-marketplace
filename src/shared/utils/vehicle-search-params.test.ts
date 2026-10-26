import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildVehicleSearchHref,
  createEmptyVehicleSearchParams,
  parseVehicleSearchParams,
  serializeVehicleSearchParams,
} from './vehicle-search-params.ts';

describe('vehicle-search-params', () => {
  it('ignora valores inválidos no parse', () => {
    const parsed = parseVehicleSearchParams(
      'condicao=xyz&combustivel=flex&combustivel=nuclear&pagina=0&ordem=aleatorio&marca=vw'
    );

    assert.equal(parsed.condicao, undefined);
    assert.deepEqual(parsed.combustivel, ['flex']);
    assert.equal(parsed.pagina, 1);
    assert.equal(parsed.ordem, 'recentes');
    assert.deepEqual(parsed.marca, ['vw']);
  });

  it('omite defaults na serialização e ordena chaves', () => {
    const qs = serializeVehicleSearchParams({
      ordem: 'recentes',
      pagina: 1,
      marca: ['toyota', 'fiat'],
      condicao: 'usado',
    });

    assert.equal(qs, 'condicao=usado&marca=fiat&marca=toyota');
  });

  it('round-trip preserva campos relevantes', () => {
    const original = {
      ...createEmptyVehicleSearchParams(),
      q: 'civic',
      condicao: 'seminovo' as const,
      marca: ['honda'],
      modelo: ['honda:civic'],
      precoMin: 50000,
      precoMax: 120000,
      carroceria: ['sedan' as const],
      ordem: 'menor-km' as const,
      pagina: 2,
    };

    const again = parseVehicleSearchParams(serializeVehicleSearchParams(original));

    assert.equal(again.q, original.q);
    assert.equal(again.condicao, original.condicao);
    assert.deepEqual(again.marca, original.marca);
    assert.deepEqual(again.modelo, original.modelo);
    assert.equal(again.precoMin, original.precoMin);
    assert.equal(again.precoMax, original.precoMax);
    assert.deepEqual(again.carroceria, original.carroceria);
    assert.equal(again.ordem, original.ordem);
    assert.equal(again.pagina, original.pagina);
  });

  it('buildVehicleSearchHref sem params retorna path limpo', () => {
    assert.equal(buildVehicleSearchHref({}), '/veiculos');
  });
});
