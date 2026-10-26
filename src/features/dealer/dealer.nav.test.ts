import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { STORE_ROLES } from '@app-types/membership';

import { filterDealerNav, isDealerNavActive } from './dealer.nav';

describe('dealer.nav', () => {
  it('filtra equipe e configurações para vendedor', () => {
    const items = filterDealerNav(STORE_ROLES.SELLER, '[]');
    const hrefs = items.map((i) => i.href);

    assert.ok(hrefs.includes('/painel/estoque'));
    assert.equal(hrefs.includes('/painel/anuncios'), false);
    assert.ok(hrefs.includes('/painel/clientes'));
    assert.ok(hrefs.includes('/painel/oportunidades'));
    assert.ok(hrefs.includes('/painel/reservas'));
    assert.ok(hrefs.includes('/painel/vendas'));
    assert.equal(hrefs.includes('/painel/equipe'), false);
    assert.equal(hrefs.includes('/painel/configuracoes'), false);
    assert.equal(hrefs.includes('/painel/vitrine'), false);
  });

  it('owner vê todos os itens principais', () => {
    const items = filterDealerNav(STORE_ROLES.OWNER, '[]');
    const hrefs = items.map((i) => i.href);

    assert.ok(hrefs.includes('/painel/equipe'));
    assert.ok(hrefs.includes('/painel/configuracoes'));
    assert.ok(hrefs.includes('/painel/vitrine'));
  });

  it('marca ativo corretamente na visão geral', () => {
    assert.equal(isDealerNavActive('/painel', '/painel'), true);
    assert.equal(isDealerNavActive('/painel/estoque', '/painel'), false);
    assert.equal(isDealerNavActive('/painel/estoque', '/painel/estoque'), true);
  });
});
