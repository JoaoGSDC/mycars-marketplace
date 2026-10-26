'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button, Field, useToast } from '@components/ui';
import { authClient } from '@lib/auth-client';

import { AuthShell } from './AuthShell';
import styles from './styles.module.css';

export function SignUpForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const { error: signUpError } = await authClient.signUp.email({
      name,
      email,
      password,
    });

    setPending(false);

    if (signUpError) {
      setError(signUpError.message ?? 'Não foi possível cadastrar');
      toast({ title: 'Falha no cadastro', description: signUpError.message, variant: 'error' });
      return;
    }

    toast({ title: 'Conta criada', variant: 'success' });
    router.push('/painel');
    router.refresh();
  }

  return (
    <AuthShell
      title="Criar conta"
      subtitle="Cadastre-se para gerenciar sua loja"
      footer={
        <>
          Já tem conta?{' '}
          <Link href="/entrar" className={styles.authShell__link}>
            Entrar
          </Link>
        </>
      }
    >
      <form className={styles.authShell__form} onSubmit={onSubmit}>
        {error ? <p className={styles.authShell__error}>{error}</p> : null}
        <Field
          label="Nome"
          name="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className={styles.authShell__actions}>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Criando…' : 'Criar conta'}
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
