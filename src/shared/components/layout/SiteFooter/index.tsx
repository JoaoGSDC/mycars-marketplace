import { AtSign, Link2, Share2 } from 'lucide-react';
import Link from 'next/link';

import { brand } from '@config/brand';
import { cn } from '@utils/cn';

import { BigWordmark } from '../BigWordmark';
import { Logo } from '../Logo';
import { NewsletterForm } from '../NewsletterForm';
import { DEFAULT_FOOTER_COLUMNS, DEFAULT_LEGAL_LINKS } from './siteFooter.constants';
import type { SiteFooterProps } from './siteFooter.types';
import styles from './styles.module.css';

export type { SiteFooterColumn, SiteFooterLink, SiteFooterProps, SiteFooterVariant } from './siteFooter.types';

/** Ícones genéricos: Lucide removeu marcas comerciais (Facebook/Instagram/etc.). */
const SOCIAL_LINKS = [
  { href: 'https://facebook.com', label: 'Facebook', Icon: Share2 },
  { href: 'https://instagram.com', label: 'Instagram', Icon: AtSign },
  { href: 'https://linkedin.com', label: 'LinkedIn', Icon: Link2 },
] as const;

export function SiteFooter({
  variant = 'default',
  description = brand.tagline,
  linkColumns = DEFAULT_FOOTER_COLUMNS,
  legalLinks = DEFAULT_LEGAL_LINKS,
  copyright = `© ${new Date().getFullYear()} ${brand.name}. Todos os direitos reservados.`,
  showNewsletter = true,
  newsletterTitle = 'Fique por dentro das novidades',
  newsletterDescription = 'Receba ofertas e lançamentos de lojas parceiras.',
  onNewsletterSubmit,
  className,
}: SiteFooterProps) {
  const isCompact = variant === 'compact';

  return (
    <footer className={cn(styles.siteFooter, isCompact && styles['siteFooter--compact'], className)} data-theme="dark">
      <div
        className={cn(
          styles['siteFooter__container'],
          !showNewsletter && !isCompact && styles['siteFooter__container--flushTop']
        )}
      >
        {!isCompact && showNewsletter ? (
          <div className={styles['siteFooter__newsletterBlock']}>
            <div className={styles['siteFooter__newsletterCopy']}>
              <h2 className={styles['siteFooter__newsletterTitle']}>{newsletterTitle}</h2>
              <p className={styles['siteFooter__newsletterDescription']}>{newsletterDescription}</p>
            </div>
            <NewsletterForm className={styles['siteFooter__newsletterForm']} onSubmit={onNewsletterSubmit} />
          </div>
        ) : null}

        {!isCompact ? (
          <div
            className={cn(
              styles['siteFooter__wordmarkWrap'],
              !showNewsletter && styles['siteFooter__wordmarkWrap--divided']
            )}
          >
            <BigWordmark />
          </div>
        ) : null}

        <div className={styles['siteFooter__grid']}>
          <div className={styles['siteFooter__brand']}>
            <Logo size="lg" />
            <p className={styles['siteFooter__description']}>{description}</p>
            <ul className={styles['siteFooter__socialList']}>
              {SOCIAL_LINKS.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    className={styles['siteFooter__socialLink']}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                  >
                    <Icon className="size-4" strokeWidth={1.5} aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {!isCompact
            ? linkColumns.map((column) => (
                <div key={column.title} className={styles['siteFooter__column']}>
                  <h3 className={styles['siteFooter__columnTitle']}>{column.title}</h3>
                  <ul className={styles['siteFooter__linkList']}>
                    {column.links.map((link) => (
                      <li key={`${column.title}-${link.href}-${link.label}`}>
                        <Link href={link.href} className={styles['siteFooter__link']}>
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            : null}

          {isCompact ? (
            <div className={styles['siteFooter__compactNewsletter']}>
              <p className={styles['siteFooter__compactNewsletterLabel']}>Assine a newsletter</p>
              <NewsletterForm onSubmit={onNewsletterSubmit} />
            </div>
          ) : null}
        </div>

        <div className={styles['siteFooter__legal']}>
          <p className={styles['siteFooter__copyright']}>{copyright}</p>
          <ul className={styles['siteFooter__legalList']}>
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={styles['siteFooter__legalLink']}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
