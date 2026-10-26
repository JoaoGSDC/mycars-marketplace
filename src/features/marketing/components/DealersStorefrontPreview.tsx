import { dealersLandingContent } from '../dealers.landing.content';
import styles from '../dealers-landing.module.css';

/** Preview ilustrativo da vitrine — estrutura alinhada ao storefront, sem dados reais. */
export function DealersStorefrontPreview() {
  const copy = dealersLandingContent.storefront;

  return (
    <div className={styles.storefrontPreview} aria-label="Prévia ilustrativa da vitrine da loja">
      <div className={styles.storefrontPreview__browser}>
        <div className={styles.storefrontPreview__bar} aria-hidden>
          <span />
          <span />
          <span />
          <p className={styles.storefrontPreview__url}>{copy.exampleHost}</p>
        </div>
        <div className={styles.storefrontPreview__body}>
          <header className={styles.storefrontPreview__header}>
            <span className={styles.storefrontPreview__logo}>Sua Loja</span>
            <span className={styles.storefrontPreview__nav}>Estoque · Sobre · Contato</span>
          </header>
          <div className={styles.storefrontPreview__hero}>
            <p className={styles.storefrontPreview__heroTitle}>Veículos da loja</p>
            <p className={styles.storefrontPreview__heroSub}>Vitrine própria · também no marketplace</p>
          </div>
          <div className={styles.storefrontPreview__cards} aria-hidden>
            <div className={styles.storefrontPreview__card} />
            <div className={styles.storefrontPreview__card} />
            <div className={styles.storefrontPreview__card} />
          </div>
        </div>
      </div>
    </div>
  );
}
