import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildStorefrontOrigin, resolveHostSubdomain } from './tenant-host.ts';

describe('tenant-host', () => {
  it('reconhece apex e subdomínio em produção', () => {
    assert.deepEqual(resolveHostSubdomain('mycars.com.br', 'mycars.com.br'), { kind: 'apex' });
    assert.deepEqual(resolveHostSubdomain('loja-a.mycars.com.br', 'mycars.com.br'), {
      kind: 'storefront',
      subdomain: 'loja-a',
    });
  });

  it('funciona com localhost e porta', () => {
    assert.deepEqual(resolveHostSubdomain('localhost:3000', 'localhost:3000'), { kind: 'apex' });
    assert.deepEqual(resolveHostSubdomain('demo.localhost:3000', 'localhost:3000'), {
      kind: 'storefront',
      subdomain: 'demo',
    });
  });

  it('bloqueia reservados e hosts desconhecidos', () => {
    assert.deepEqual(resolveHostSubdomain('www.mycars.com.br', 'mycars.com.br'), {
      kind: 'reserved',
      subdomain: 'www',
    });
    assert.deepEqual(resolveHostSubdomain('app.vercel.app', 'mycars.com.br'), {
      kind: 'unknown_host',
    });
    assert.deepEqual(resolveHostSubdomain('a.b.mycars.com.br', 'mycars.com.br'), {
      kind: 'invalid',
    });
  });

  it('monta origem da vitrine', () => {
    assert.equal(
      buildStorefrontOrigin('acme', 'mycars.com.br'),
      'https://acme.mycars.com.br'
    );
    assert.equal(
      buildStorefrontOrigin('acme', 'localhost:3000'),
      'http://acme.localhost:3000'
    );
  });
});
