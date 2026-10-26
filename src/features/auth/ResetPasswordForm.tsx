'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button, Field, useToast } from '@components/ui';
import { authClient } from '@lib/auth-client';

import { AuthShell } from './AuthShell';
import styles from './styles.module.css';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const token = searchParams.get('token') ?? '';

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('As senhas não coincidem');
      return;
    }

    if (!token) {
      setError('Token de recuperação ausente ou inválido');
      return;
    }

    setPending(true);

    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    setPending(false);

    if (resetError) {
      setError(resetError.message ?? 'Não foi possível redefinir a senha');
      toast({ title: 'Erro', description: resetError.message, variant: 'error' });
      return;
    }

    toast({ title: 'Senha atualizada', variant: 'success' });
    router.push('/entrar');
  }

  return (
    <AuthShell
      title="Nova senha"
      subtitle="Escolha uma senha forte para sua conta"
      footer={
        <Link href="/entrar" className={styles.authShell__link}>
          Voltar ao login
        </Link>
      }
    >
      <form className={styles.authShell__form} onSubmit={onSubmit}>
        {error ? <p className={styles.authShell__error}>{error}</p> : null}
        <Field
          label="Nova senha"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Field
          label="Confirmar senha"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <div className={styles.authShell__actions}>
          <Button type="submit" disabled={pending || !token} className="w-full">
            {pending ? 'Salvando…' : 'Salvar senha'}
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
