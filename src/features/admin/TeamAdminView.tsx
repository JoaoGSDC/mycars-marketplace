'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge, Button, Field, useToast } from '@components/ui';
import { PLATFORM_ROLES } from '@app-types/platform';
import type { UserRow } from '@lib/db';
import { adminSetPlatformRoleAction } from '@server/admin/admin-actions';

import { AdminChrome } from './AdminChrome';
import styles from './admin.module.css';

export type TeamAdminViewProps = {
  userName: string;
  admins: UserRow[];
};

export function TeamAdminView({ userName, admins }: TeamAdminViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [userId, setUserId] = useState('');
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);

  async function promote() {
    setPending(true);
    const result = await adminSetPlatformRoleAction({
      userId: userId.trim(),
      platformRole: PLATFORM_ROLES.ADMIN,
      reason,
    });
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Falha', description: result.message, variant: 'error' });
      return;
    }

    toast({ title: 'Acesso concedido', variant: 'success' });
    setUserId('');
    setReason('');
    router.refresh();
  }

  async function revoke(targetId: string) {
    setPending(true);
    const result = await adminSetPlatformRoleAction({
      userId: targetId,
      platformRole: PLATFORM_ROLES.USER,
      reason: reason || 'Revogação administrativa',
    });
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Falha', description: result.message, variant: 'error' });
      return;
    }

    toast({ title: 'Acesso removido', variant: 'success' });
    router.refresh();
  }

  return (
    <AdminChrome userName={userName} title="Equipe">
      <div className={styles.admin}>
        <header className={styles.admin__header}>
          <div>
            <h1 className={styles.admin__title}>Usários internos</h1>
            <p className={styles.admin__subtitle}>
              Papel de plataforma separado do papel de loja. Toda alteração é auditada.
            </p>
          </div>
        </header>

        <div className={styles.admin__table}>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Papel</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td>{admin.name}</td>
                  <td>{admin.email}</td>
                  <td>
                    <Badge variant="soft">{admin.platformRole}</Badge>
                  </td>
                  <td>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending}
                      onClick={() => revoke(admin.id)}
                    >
                      Revogar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className={styles.admin__panel}>
          <h2 className="text-sm font-semibold">Conceder acesso admin</h2>
          <Field
            label="ID do usuário"
            name="userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="UUID do usuário já cadastrado"
          />
          <Field
            label="Justificativa"
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            type="button"
            disabled={pending || userId.trim().length < 8 || reason.trim().length < 5}
            onClick={promote}
          >
            Promover a admin
          </Button>
        </section>
      </div>
    </AdminChrome>
  );
}
