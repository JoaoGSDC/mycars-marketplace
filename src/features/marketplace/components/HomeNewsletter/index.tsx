'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { NewsletterForm, Section } from '@components/layout';

import { subscribeNewsletter } from '../../actions/newsletter';
import { homeContent } from '../../marketplace.home.content';
import styles from './styles.module.css';

export function HomeNewsletter() {
  const copy = homeContent.newsletter;
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Section theme="dark" spacing="compact" className={styles.homeNewsletter}>
      <div className={styles.homeNewsletter__inner}>
        <h2 className={styles.homeNewsletter__title}>{copy.title}</h2>
        <NewsletterForm
          className={styles.homeNewsletter__form}
          onSubmit={(email) => {
            startTransition(async () => {
              const result = await subscribeNewsletter(
                (() => {
                  const data = new FormData();
                  data.set('email', email);

                  return data;
                })()
              );

              if (result.ok) {
                setMessage(copy.success);
              } else {
                setMessage(result.error);
              }
            });
          }}
        />
        {message ? (
          <p className={styles.homeNewsletter__message} role="status">
            {pending ? 'Enviando…' : message}
          </p>
        ) : null}
        <p className={styles.homeNewsletter__consent}>
          {copy.consent}{' '}
          <Link href={copy.privacyHref} className={styles.homeNewsletter__privacy}>
            {copy.privacyLabel}
          </Link>
          .
        </p>
      </div>
    </Section>
  );
}
