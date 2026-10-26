import styles from './styles.module.css';

export type MarketplaceShellProps = {
  children: React.ReactNode;
};

/** Shell mínimo do ambiente marketplace (sem chrome — SiteHeader fica nas Views). */
export function MarketplaceShell({ children }: MarketplaceShellProps) {
  return <div className={styles.marketplaceShell}>{children}</div>;
}
