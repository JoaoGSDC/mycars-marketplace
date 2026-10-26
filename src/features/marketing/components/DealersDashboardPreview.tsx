import {
  CalendarCheck,
  Car,
  Handshake,
  LayoutDashboard,
  Megaphone,
  Wallet,
} from 'lucide-react';

import { Logo } from '@components/layout';

import { dealersLandingContent } from '../dealers.landing.content';
import styles from '../dealers-landing.module.css';

const NAV: Array<{
  label: string;
  icon: typeof LayoutDashboard;
  active?: boolean;
}> = [
  { label: 'Visão geral', icon: LayoutDashboard, active: true },
  { label: 'Estoque', icon: Car },
  { label: 'Anúncios', icon: Megaphone },
  { label: 'Oportunidades', icon: Handshake },
  { label: 'Reservas', icon: CalendarCheck },
  { label: 'Vendas', icon: Wallet },
];

/** Preview ilustrativo do painel — não é o DashboardShell autenticado. */
export function DealersDashboardPreview() {
  const copy = dealersLandingContent.demo;

  return (
    <div className={styles.dashboardPreview} aria-label={copy.caption}>
      <p className={styles.dashboardPreview__badge}>{copy.caption}</p>
      <div className={styles.dashboardPreview__chrome}>
        <aside className={styles.dashboardPreview__sidebar} aria-hidden>
          <div className={styles.dashboardPreview__brand}>
            <Logo size="sm" />
          </div>
          <ul className={styles.dashboardPreview__nav}>
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.label}
                  className={
                    item.active
                      ? styles['dashboardPreview__navItem--active']
                      : styles.dashboardPreview__navItem
                  }
                >
                  <Icon className="size-4 shrink-0" strokeWidth={1.5} />
                  <span>{item.label}</span>
                </li>
              );
            })}
          </ul>
        </aside>
        <div className={styles.dashboardPreview__main}>
          <header className={styles.dashboardPreview__topbar}>
            <div>
              <p className={styles.dashboardPreview__store}>Demo Autocenter</p>
              <p className={styles.dashboardPreview__meta}>São Paulo/SP · Visão geral</p>
            </div>
          </header>
          <div className={styles.dashboardPreview__grid}>
            {copy.modules.map((mod) => (
              <article key={mod.label} className={styles.dashboardPreview__card}>
                <p className={styles.dashboardPreview__cardLabel}>{mod.label}</p>
                <p className={styles.dashboardPreview__cardHint}>{mod.hint}</p>
                <div className={styles.dashboardPreview__bars} aria-hidden>
                  <span />
                  <span />
                  <span />
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
