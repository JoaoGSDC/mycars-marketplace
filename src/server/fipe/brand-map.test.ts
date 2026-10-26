import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeText, scoreNameMatch, tokenize } from './brand-map';

describe('brand-map', () => {
  it('normaliza acentos e pontuação', () => {
    assert.equal(normalizeText('VW - VolksWagen'), 'vw volkswagen');
    assert.equal(normalizeText('Citroën'), 'citroen');
  });

  it('pontua match exato e parcial', () => {
    assert.equal(scoreNameMatch('volkswagen', 'VW - VolksWagen'), 80);
    assert.ok(scoreNameMatch('fiat', 'Fiat') >= 80);
    assert.equal(scoreNameMatch('xyz', 'Fiat'), 0);
  });

  it('tokeniza ignorando partículas curtas', () => {
    assert.deepEqual(tokenize('GM - Chevrolet'), ['gm', 'chevrolet']);
  });
});
