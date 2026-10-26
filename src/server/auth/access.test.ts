import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MEMBERSHIP_STATUS, STORE_ROLES } from '@app-types/membership';
import { PERMISSIONS } from '@app-types/permissions';
import { assertMembershipPermission } from '@server/auth/permissions-guard';

describe('autorização por papel', () => {
  it('owner pode gerenciar membros e custos', () => {
    const membership = {
      role: STORE_ROLES.OWNER,
      permissionsJson: '[]',
      status: MEMBERSHIP_STATUS.ACTIVE,
    };

    assert.equal(assertMembershipPermission(membership, PERMISSIONS.MEMBERS_MANAGE).ok, true);
    assert.equal(assertMembershipPermission(membership, PERMISSIONS.COSTS_WRITE).ok, true);
  });

  it('vendedor não pode ler custos privados', () => {
    const membership = {
      role: STORE_ROLES.SELLER,
      permissionsJson: '[]',
      status: MEMBERSHIP_STATUS.ACTIVE,
    };

    const result = assertMembershipPermission(membership, PERMISSIONS.COSTS_WRITE);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, 'FORBIDDEN');
    }
  });

  it('operador não pode publicar anúncios', () => {
    const membership = {
      role: STORE_ROLES.OPERATOR,
      permissionsJson: '[]',
      status: MEMBERSHIP_STATUS.ACTIVE,
    };

    const result = assertMembershipPermission(membership, PERMISSIONS.LISTINGS_PUBLISH);
    assert.equal(result.ok, false);
  });

  it('vínculo revogado bloqueia qualquer permissão', () => {
    const membership = {
      role: STORE_ROLES.OWNER,
      permissionsJson: '["*"]',
      status: MEMBERSHIP_STATUS.REVOKED,
    };

    const result = assertMembershipPermission(membership, PERMISSIONS.STORE_READ);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, 'FORBIDDEN');
    }
  });

  it('override * em permissionsJson concede acesso', () => {
    const membership = {
      role: STORE_ROLES.OPERATOR,
      permissionsJson: '["*"]',
      status: MEMBERSHIP_STATUS.ACTIVE,
    };

    assert.equal(assertMembershipPermission(membership, PERMISSIONS.COSTS_WRITE).ok, true);
  });
});
