'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button, useToast } from '@components/ui';
import { acceptInviteAction } from '@server/auth/store-actions';

import { AuthShell } from './AuthShell';
import styles from './styles.module.css';

export function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const token = searchParams.get('token') ?? '';
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result = await acceptInviteAction(token);

    setPending(false);

    if (!result || result.ok === false) {
      const message = result?.message ?? 'Não foi possível aceitar o convite';
      setError(message);

      if (result?.code === 'UNAUTHORIZED') {
        toast({
          title: 'Faça login',
          description: 'Entre com o e-mail convidado para aceitar.',
          variant: 'error',
        });
        return;
      }

      toast({ title: 'Convite', description: message, variant: 'error' });
    }
  }

  return (
    <AuthShell
      title="Convite para loja"
      subtitle="Aceite o convite para vincular sua conta à loja"
      footer={
        <>
          Precisa entrar primeiro?{' '}
          <Link
            href={`/entrar?next=${encodeURIComponent(`/convite?token=${token}`)}`}
            className={styles.authShell__link}
          >
            Fazer login
          </Link>
        </>
      }
    >
      <form className={styles.authShell__form} onSubmit={onSubmit}>
        {error ? <p className={styles.authShell__error}>{error}</p> : null}
        {!token ? (
          <p className={styles.authShell__error}>Token de convite ausente na URL.</p>
        ) : (
          <p className="text-sm text-text-muted">
            Ao aceitar, você passará a ter acesso ao painel da loja conforme o papel
            concedido.
          </p>
        )}
        <div className={styles.authShell__actions}>
          <Button type="submit" disabled={pending || !token} className="w-full">
            {pending ? 'Aceitando…' : 'Aceitar convite'}
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
