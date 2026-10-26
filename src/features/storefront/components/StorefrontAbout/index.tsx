import { Clock3, MapPin, Phone } from 'lucide-react';

import type { PublicStorefront } from '@app-types/vehicle';
import { Heading } from '@components/ui';
import { buildWhatsAppHref } from '@utils/whatsapp';
import { cn } from '@utils/cn';

import { formatStorefrontAddress } from '../../lib/storefront-brand';
import { storefrontContent } from '../../storefront.content';
import styles from './styles.module.css';

export type StorefrontAboutProps = {
  storefront: PublicStorefront;
  className?: string;
};

export function StorefrontAbout({ storefront, className }: StorefrontAboutProps) {
  const copy = storefrontContent;
  const address = formatStorefrontAddress(storefront);
  const whatsappHref = buildWhatsAppHref(
    storefront.whatsappNumber,
    `Olá! Vi a vitrine da ${storefront.name} e gostaria de mais informações.`
  );
  const hasContact =
    Boolean(storefront.contactPhone) ||
    Boolean(storefront.contactEmail) ||
    Boolean(storefront.whatsappNumber) ||
    Boolean(storefront.socialInstagram) ||
    Boolean(storefront.socialFacebook);
  const hasHours = storefront.businessHours.length > 0;

  if (!storefront.about && !address && !hasHours && !hasContact) {
    return null;
  }

  return (
    <section
      id="sobre"
      className={cn(styles.storefrontAbout, className)}
      aria-labelledby="storefront-about-title"
    >
      <div className={styles.storefrontAbout__inner}>
        <Heading as="h2" id="storefront-about-title" className={styles.storefrontAbout__title}>
          {copy.aboutSectionTitle}
        </Heading>

        {storefront.about ? <p className={styles.storefrontAbout__body}>{storefront.about}</p> : null}

        <div className={styles.storefrontAbout__facts}>
          {address ? (
            <div className={styles.storefrontAbout__fact}>
              <MapPin className={styles.storefrontAbout__icon} strokeWidth={1.5} aria-hidden />
              <div>
                <p className={styles.storefrontAbout__label}>{copy.addressTitle}</p>
                <p className={styles.storefrontAbout__value}>{address}</p>
              </div>
            </div>
          ) : null}

          {hasHours ? (
            <div className={styles.storefrontAbout__fact}>
              <Clock3 className={styles.storefrontAbout__icon} strokeWidth={1.5} aria-hidden />
              <div>
                <p className={styles.storefrontAbout__label}>{copy.hoursTitle}</p>
                <ul className={styles.storefrontAbout__hours}>
                  {storefront.businessHours.map((row, index) => (
                    <li key={index}>
                      {row.label ?? row.day ?? '—'}
                      {row.open && row.close ? `: ${row.open}–${row.close}` : null}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {hasContact ? (
            <div id="contato" className={styles.storefrontAbout__fact}>
              <Phone className={styles.storefrontAbout__icon} strokeWidth={1.5} aria-hidden />
              <div>
                <p className={styles.storefrontAbout__label}>{copy.contactTitle}</p>
                <div className={styles.storefrontAbout__contact}>
                  {storefront.contactPhone ? (
                    <a href={`tel:${storefront.contactPhone.replace(/\D/g, '')}`}>{storefront.contactPhone}</a>
                  ) : null}
                  {whatsappHref ? (
                    <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                      WhatsApp
                    </a>
                  ) : null}
                  {storefront.contactEmail ? (
                    <a href={`mailto:${storefront.contactEmail}`}>{storefront.contactEmail}</a>
                  ) : null}
                  {storefront.socialInstagram ? (
                    <a href={storefront.socialInstagram} target="_blank" rel="noopener noreferrer">
                      Instagram
                    </a>
                  ) : null}
                  {storefront.socialFacebook ? (
                    <a href={storefront.socialFacebook} target="_blank" rel="noopener noreferrer">
                      Facebook
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
