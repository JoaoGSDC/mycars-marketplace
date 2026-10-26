import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatCnpj, isValidCnpj, stripCnpj } from './cnpj';

describe('cnpj', () => {
  it('valida CNPJ com dígitos verificadores', () => {
    assert.equal(isValidCnpj('11.444.777/0001-61'), true);
    assert.equal(isValidCnpj('11444777000161'), true);
  });

  it('rejeita CNPJ inválido e sequências', () => {
    assert.equal(isValidCnpj('11.444.777/0001-62'), false);
    assert.equal(isValidCnpj('00.000.000/0000-00'), false);
    assert.equal(isValidCnpj('123'), false);
  });

  it('formata e limpa máscara', () => {
    assert.equal(stripCnpj('11.444.777/0001-61'), '11444777000161');
    assert.equal(formatCnpj('11444777000161'), '11.444.777/0001-61');
  });
});
