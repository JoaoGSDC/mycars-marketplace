'use client';

import { useEffect, useState, type FormEvent } from 'react';

import { Button, Field } from '@components/ui';
import { createListingLeadAction } from '@server/leads/lead-actions';
import { cn } from '@utils/cn';

import { detailContent } from '../../marketplace.detail.content';
import styles from '../../detail.styles.module.css';

export type VehicleInterestFormProps = {
  listingSlug: string;
  vehicleTitle: string;
  disabled?: boolean;
};

export function VehicleInterestForm({
  listingSlug,
  vehicleTitle,
  disabled = false,
}: VehicleInterestFormProps) {
  const copy = detailContent;
  const [openedAt] = useState(() => Date.now());
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [company, setCompany] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setMessage(copy.formDefaultMessage(vehicleTitle));
  }, [copy, vehicleTitle]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    if (disabled || pending || success) {
      return;
    }

    setError(null);
    setPending(true);

    const result = await createListingLeadAction({
      listingSlug,
      name,
      phone,
      email: email || undefined,
      message,
      source: 'detail_form',
      originPath: typeof window !== 'undefined' ? window.location.pathname : `/veiculos/${listingSlug}`,
      company,
      formOpenedAt: openedAt,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className={styles.detail__success} role="status">
        <p className="font-medium">{copy.formSuccessTitle}</p>
        <p>{copy.formSuccessDescription}</p>
      </div>
    );
  }

  return (
    <form className={styles.detail__form} onSubmit={onSubmit} noValidate>
      <label className={styles.detail__honeypot} aria-hidden>
        Empresa
        <input
          tabIndex={-1}
          autoComplete="off"
          name="company"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
        />
      </label>

      <Field
        label={copy.formName}
        name="name"
        autoComplete="name"
        inputMode="text"
        required
        value={name}
        disabled={disabled || pending}
        onChange={(event) => setName(event.target.value)}
        inputClassName={styles.detail__formInput}
      />
      <Field
        label={copy.formPhone}
        name="phone"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        required
        value={phone}
        disabled={disabled || pending}
        onChange={(event) => setPhone(event.target.value)}
        inputClassName={styles.detail__formInput}
      />
      <Field
        label={copy.formEmail}
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        disabled={disabled || pending}
        onChange={(event) => setEmail(event.target.value)}
        inputClassName={styles.detail__formInput}
      />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text" htmlFor="interest-message">
          {copy.formMessage}
        </label>
        <textarea
          id="interest-message"
          name="message"
          required
          rows={4}
          value={message}
          disabled={disabled || pending}
          onChange={(event) => setMessage(event.target.value)}
          className={cn(
            'w-full rounded-md border border-border bg-surface-sunken px-3 py-2.5 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong disabled:opacity-50',
            styles.detail__formInput
          )}
        />
      </div>

      {error ? <p className={styles.detail__error}>{error}</p> : null}

      <div className={styles.detail__formActions}>
        <Button type="submit" disabled={disabled || pending} className="w-full">
          {pending ? 'Enviando…' : copy.formSubmit}
        </Button>
      </div>
    </form>
  );
}
