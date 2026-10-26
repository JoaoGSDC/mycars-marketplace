'use client';

import { ArrowRight } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { IconButton } from '@components/ui';
import { cn } from '@utils/cn';

import styles from './styles.module.css';

export type NewsletterFormProps = {
  className?: string;
  placeholder?: string;
  submitLabel?: string;
  onSubmit?: (email: string) => void;
};

export function NewsletterForm({
  className,
  placeholder = 'Digite seu e-mail',
  submitLabel = 'Inscrever-se na newsletter',
  onSubmit,
}: NewsletterFormProps) {
  const [email, setEmail] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();

    if (!trimmed) {
      return;
    }

    onSubmit?.(trimmed);
    setEmail('');
  }

  return (
    <form className={cn(styles.newsletterForm, className)} onSubmit={handleSubmit} noValidate>
      <label className={styles['newsletterForm__field']}>
        <span className={styles['newsletterForm__srOnly']}>E-mail</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          placeholder={placeholder}
          className={styles['newsletterForm__input']}
        />
      </label>
      <IconButton
        type="submit"
        variant="square-accent"
        size="md"
        className={styles['newsletterForm__submit']}
        aria-label={submitLabel}
        icon={<ArrowRight className="size-5" strokeWidth={1.5} aria-hidden />}
      />
    </form>
  );
}
