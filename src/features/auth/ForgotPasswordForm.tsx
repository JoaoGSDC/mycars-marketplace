'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { Button, Field, useToast } from '@components/ui';
import { authClient } from '@lib/auth-client';

import { AuthShell } from './AuthShell';
import styles from './styles.module.css';

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const { error: resetError } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    setPending(false);

    if (resetError) {
      setError(resetError.message ?? 'Não foi possível enviar o e-mail');
      toast({ title: 'Erro', description: resetError.message, variant: 'error' });
      return;
    }

    setSent(true);
    toast({
      title: 'Verifique seu e-mail',
      description: 'Se a conta existir, enviamos o link de recuperação.',
      variant: 'success',
    });
  }

  return (
    <AuthShell
      title="Recuperar acesso"
      subtitle="Enviaremos um link para redefinir sua senha"
      footer={
        <Link href="/entrar" className={styles.authShell__link}>
          Voltar ao login
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-text-muted">
          Se existir uma conta com este e-mail, o link de recuperação foi enviado. Em
          desenvolvimento, o link aparece no log do servidor.
        </p>
      ) : (
        <form className={styles.authShell__form} onSubmit={onSubmit}>
          {error ? <p className={styles.authShell__error}>{error}</p> : null}
          <Field
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className={styles.authShell__actions}>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? 'Enviando…' : 'Enviar link'}
            </Button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
