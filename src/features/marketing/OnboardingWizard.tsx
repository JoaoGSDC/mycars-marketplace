'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';

import { Button, Field, ProgressBars, useToast } from '@components/ui';
import { formatCnpj, stripCnpj } from '@utils/cnpj';
import { submitStoreApplicationAction } from '@server/onboarding/onboarding-actions';
import type { StoreApplicationInput } from '@server/onboarding/onboarding.validators';

import styles from './onboarding.module.css';

const STEPS = ['Empresa', 'Endereço', 'Responsável', 'Vitrine', 'Revisão'] as const;

const INITIAL: StoreApplicationInput = {
  legalName: '',
  tradeName: '',
  publicName: '',
  document: '',
  street: '',
  addressNumber: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  phone: '',
  whatsapp: '',
  email: '',
  responsibleName: '',
  responsibleEmail: '',
  responsiblePhone: '',
  institutionalInfo: '',
  slug: '',
  subdomain: '',
};

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export type OnboardingWizardProps = {
  userName: string;
  userEmail: string;
};

export function OnboardingWizard({ userName, userEmail }: OnboardingWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<StoreApplicationInput>({
    ...INITIAL,
    responsibleName: userName,
    responsibleEmail: userEmail,
    email: userEmail,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const progressIndex = step;

  function patch<K extends keyof StoreApplicationInput>(key: K, value: StoreApplicationInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const reviewRows = useMemo(
    () => [
      ['Razão social', form.legalName],
      ['Nome fantasia', form.tradeName],
      ['CNPJ', formatCnpj(form.document)],
      ['Cidade/UF', `${form.city}/${form.state}`],
      ['E-mail comercial', form.email],
      ['Responsável', form.responsibleName],
      ['Subdomínio', form.subdomain],
      ['Slug', form.slug],
    ],
    [form]
  );

  function validateStep(): string | null {
    if (step === 0) {
      if (form.legalName.length < 3) return 'Informe a razão social';
      if (form.tradeName.length < 2) return 'Informe o nome fantasia';
      if (form.publicName.length < 2) return 'Informe o nome público';
      if (stripCnpj(form.document).length !== 14) return 'CNPJ incompleto';
      if (form.phone.length < 10) return 'Telefone obrigatório';
      if (form.whatsapp.length < 10) return 'WhatsApp obrigatório';
      if (!form.email.includes('@')) return 'E-mail comercial inválido';
    }

    if (step === 1) {
      if (form.street.length < 2) return 'Endereço obrigatório';
      if (!form.addressNumber) return 'Número obrigatório';
      if (form.neighborhood.length < 2) return 'Bairro obrigatório';
      if (form.city.length < 2) return 'Cidade obrigatória';
      if (form.state.length !== 2) return 'UF inválida';
      if (stripCnpj(form.zipCode).length < 8) return 'CEP inválido';
    }

    if (step === 2) {
      if (form.responsibleName.length < 2) return 'Nome do responsável obrigatório';
      if (!form.responsibleEmail.includes('@')) return 'E-mail do responsável inválido';
      if (form.responsiblePhone.length < 10) return 'Telefone do responsável obrigatório';
      if (form.institutionalInfo.length < 20) return 'Texto institucional muito curto';
    }

    if (step === 3) {
      if (form.slug.length < 2) return 'Slug obrigatório';
      if (form.subdomain.length < 2) return 'Subdomínio obrigatório';
    }

    return null;
  }

  function next() {
    const message = validateStep();

    if (message) {
      setError(message);
      return;
    }

    setError(null);

    if (step === 0 && !form.slug) {
      const base = slugify(form.tradeName || form.publicName);
      setForm((prev) => ({
        ...prev,
        slug: base,
        subdomain: base.slice(0, 32),
        publicName: prev.publicName || prev.tradeName,
      }));
    }

    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result = await submitStoreApplicationAction({
      ...form,
      document: stripCnpj(form.document),
      zipCode: stripCnpj(form.zipCode),
      state: form.state.toUpperCase(),
    });

    setPending(false);

    if (result && result.ok === false) {
      setError(result.message);
      toast({ title: 'Não foi possível enviar', description: result.message, variant: 'error' });
    }
  }

  return (
    <div className={styles.onboarding}>
      <div className={styles.onboarding__card}>
        <p className={styles.onboarding__eyebrow}>Cadastro de lojista</p>
        <h1 className={styles.onboarding__title}>Solicitação de acesso</h1>
        <p className={styles.onboarding__subtitle}>
          Etapa {step + 1} de {STEPS.length}: {STEPS[step]}
        </p>
        <ProgressBars count={STEPS.length} activeIndex={progressIndex} className="mb-6" />

        <form className={styles.onboarding__form} onSubmit={onSubmit}>
          {error ? <p className={styles.onboarding__error}>{error}</p> : null}

          {step === 0 ? (
            <>
              <Field
                label="Razão social"
                name="legalName"
                required
                value={form.legalName}
                onChange={(e) => patch('legalName', e.target.value)}
              />
              <Field
                label="Nome fantasia"
                name="tradeName"
                required
                value={form.tradeName}
                onChange={(e) => patch('tradeName', e.target.value)}
              />
              <Field
                label="Nome público"
                name="publicName"
                required
                value={form.publicName}
                onChange={(e) => patch('publicName', e.target.value)}
              />
              <Field
                label="CNPJ"
                name="document"
                required
                value={formatCnpj(form.document)}
                onChange={(e) => patch('document', stripCnpj(e.target.value))}
              />
              <Field
                label="E-mail comercial"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => patch('email', e.target.value)}
              />
              <Field
                label="Telefone"
                name="phone"
                required
                value={form.phone}
                onChange={(e) => patch('phone', e.target.value)}
              />
              <Field
                label="WhatsApp"
                name="whatsapp"
                required
                value={form.whatsapp}
                onChange={(e) => patch('whatsapp', e.target.value)}
              />
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Field
                label="Endereço"
                name="street"
                required
                value={form.street}
                onChange={(e) => patch('street', e.target.value)}
              />
              <div className={styles.onboarding__row}>
                <Field
                  label="Número"
                  name="addressNumber"
                  required
                  value={form.addressNumber}
                  onChange={(e) => patch('addressNumber', e.target.value)}
                />
                <Field
                  label="Complemento"
                  name="complement"
                  value={form.complement ?? ''}
                  onChange={(e) => patch('complement', e.target.value)}
                />
              </div>
              <Field
                label="Bairro"
                name="neighborhood"
                required
                value={form.neighborhood ?? ''}
                onChange={(e) => patch('neighborhood', e.target.value)}
              />
              <div className={styles.onboarding__row}>
                <Field
                  label="Cidade"
                  name="city"
                  required
                  value={form.city}
                  onChange={(e) => patch('city', e.target.value)}
                />
                <Field
                  label="UF"
                  name="state"
                  required
                  maxLength={2}
                  value={form.state}
                  onChange={(e) => patch('state', e.target.value.toUpperCase())}
                />
              </div>
              <Field
                label="CEP"
                name="zipCode"
                required
                value={form.zipCode}
                onChange={(e) => patch('zipCode', e.target.value)}
              />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Field
                label="Nome do responsável"
                name="responsibleName"
                required
                value={form.responsibleName ?? ''}
                onChange={(e) => patch('responsibleName', e.target.value)}
              />
              <Field
                label="E-mail do responsável"
                name="responsibleEmail"
                type="email"
                required
                value={form.responsibleEmail ?? ''}
                onChange={(e) => patch('responsibleEmail', e.target.value)}
              />
              <Field
                label="Telefone do responsável"
                name="responsiblePhone"
                required
                value={form.responsiblePhone ?? ''}
                onChange={(e) => patch('responsiblePhone', e.target.value)}
              />
              <label className={styles.onboarding__textareaLabel} htmlFor="institutionalInfo">
                Informações institucionais
              </label>
              <textarea
                id="institutionalInfo"
                className={styles.onboarding__textarea}
                required
                minLength={20}
                rows={5}
                value={form.institutionalInfo ?? ''}
                onChange={(e) => patch('institutionalInfo', e.target.value)}
              />
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Field
                label="Slug da loja"
                name="slug"
                required
                value={form.slug}
                onChange={(e) => patch('slug', slugify(e.target.value))}
              />
              <Field
                label="Subdomínio da vitrine"
                name="subdomain"
                required
                value={form.subdomain ?? ''}
                onChange={(e) => patch('subdomain', slugify(e.target.value).slice(0, 32))}
              />
              <p className={styles.onboarding__hint}>
                Ex.: {form.subdomain || 'sua-loja'}.mycars.example — precisa ser único.
              </p>
            </>
          ) : null}

          {step === 4 ? (
            <dl className={styles.onboarding__review}>
              {reviewRows.map(([label, value]) => (
                <div key={label} className={styles.onboarding__reviewRow}>
                  <dt>{label}</dt>
                  <dd>{value || '—'}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className={styles.onboarding__actions}>
            {step > 0 ? (
              <Button type="button" variant="outline" onClick={back}>
                Voltar
              </Button>
            ) : (
              <Button type="button" variant="ghost" asChild>
                <Link href="/para-lojistas">Cancelar</Link>
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={next}>
                Continuar
              </Button>
            ) : (
              <Button type="submit" disabled={pending}>
                {pending ? 'Enviando…' : 'Enviar solicitação'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
