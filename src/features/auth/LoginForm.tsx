'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button, Field, useToast } from '@components/ui';
import { authClient } from '@lib/auth-client';

import { AuthShell } from './AuthShell';
import styles from './styles.module.css';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });

    setPending(false);

    if (signInError) {
      setError(signInError.message ?? 'Não foi possível entrar');
      toast({ title: 'Falha no login', description: signInError.message, variant: 'error' });
      return;
    }

    toast({ title: 'Sessão iniciada', variant: 'success' });
    const next = searchParams.get('next') || '/painel';
    router.push(next);
    router.refresh();
  }

  return (
    <AuthShell
      title="Entrar"
      subtitle="Acesse o painel da sua loja"
      footer={
        <>
          Não tem conta?{' '}
          <Link href="/cadastro" className={styles.authShell__link}>
            Criar conta
          </Link>
        </>
      }
    >
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
        <Field
          label="Senha"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="text-right text-sm">
          <Link href="/recuperar-senha" className={styles.authShell__link}>
            Esqueci a senha
          </Link>
        </div>
        <div className={styles.authShell__actions}>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Entrando…' : 'Entrar'}
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
