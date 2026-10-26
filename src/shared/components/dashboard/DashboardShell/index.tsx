'use client';

import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { IconButton } from '@components/ui';
import { Logo } from '@components/layout';
import { cn } from '@utils/cn';

import styles from './styles.module.css';

const COLLAPSE_STORAGE_KEY = 'mycars:dealer-sidebar-collapsed';

export type DashboardNavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
  /** Contagem/badge opcional (só dados reais). */
  badge?: string | number;
  /** Id do grupo (ex.: veiculos). */
  group?: string;
};

export type DashboardNavGroup = {
  id: string;
  label: string;
};

export type DashboardShellProps = {
  navItems: DashboardNavItem[];
  /** Grupos funcionais da sidebar. Itens sem group ficam no topo. */
  navGroups?: DashboardNavGroup[];
  title?: string;
  children: ReactNode;
  userName?: string;
  storeName?: string;
  storeMeta?: string;
  breadcrumb?: ReactNode;
  headerEnd?: ReactNode;
  fullViewport?: boolean;
  /** Permite recolher a sidebar no desktop. Default: false. */
  collapsible?: boolean;
  className?: string;
};

function NavList({
  items,
  collapsed,
  onNavigate,
}: {
  items: DashboardNavItem[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <ul className={styles.dashboardShell__navList}>
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={cn(
              styles.dashboardShell__navLink,
              item.active && styles['dashboardShell__navLink--active'],
              collapsed && styles['dashboardShell__navLink--collapsed']
            )}
            aria-current={item.active ? 'page' : undefined}
            onClick={onNavigate}
          >
            {item.icon ? (
              <span className={styles.dashboardShell__navIcon} aria-hidden>
                {item.icon}
              </span>
            ) : null}
            <span className={styles.dashboardShell__navLabel}>{item.label}</span>
            {item.badge != null && item.badge !== '' ? (
              <span className={styles.dashboardShell__navBadge}>{item.badge}</span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function DashboardShell({
  navItems,
  navGroups = [],
  title,
  children,
  userName,
  storeName,
  storeMeta,
  breadcrumb,
  headerEnd,
  fullViewport = false,
  collapsible = false,
  className,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!collapsible) {
      return;
    }

    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, [collapsible]);

  function closeMobile() {
    setMobileOpen(false);
  }

  function toggleMobile() {
    setMobileOpen((open) => !open);
  }

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;

      try {
        window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }

      return next;
    });
  }

  const grouped = useMemo(() => {
    if (navGroups.length === 0) {
      return [{ group: null as DashboardNavGroup | null, items: navItems }];
    }

    const byGroup = new Map<string, DashboardNavItem[]>();
    const ungrouped: DashboardNavItem[] = [];

    for (const item of navItems) {
      if (item.group) {
        const list = byGroup.get(item.group) ?? [];
        list.push(item);
        byGroup.set(item.group, list);
      } else {
        ungrouped.push(item);
      }
    }

    const sections: Array<{ group: DashboardNavGroup | null; items: DashboardNavItem[] }> = [];

    if (ungrouped.length > 0) {
      sections.push({ group: null, items: ungrouped });
    }

    for (const group of navGroups) {
      const items = byGroup.get(group.id);

      if (items && items.length > 0) {
        sections.push({ group, items });
      }
    }

    return sections;
  }, [navGroups, navItems]);

  return (
    <div
      className={cn(
        styles.dashboardShell,
        fullViewport && styles['dashboardShell--fullViewport'],
        collapsed && styles['dashboardShell--collapsed'],
        className
      )}
    >
      <aside
        className={cn(
          styles.dashboardShell__sidebar,
          mobileOpen && styles['dashboardShell__sidebar--open']
        )}
      >
        <div className={styles.dashboardShell__brand}>
          <Logo size="sm" />
          <IconButton
            variant="square-outline"
            size="sm"
            className={styles.dashboardShell__closeMobile}
            aria-label="Fechar menu"
            icon={<X className="size-4" strokeWidth={1.5} />}
            onClick={closeMobile}
          />
        </div>
        {storeName ? (
          <div className={styles.dashboardShell__store}>
            <p className={styles.dashboardShell__storeName}>{storeName}</p>
            {storeMeta ? <p className={styles.dashboardShell__storeMeta}>{storeMeta}</p> : null}
          </div>
        ) : null}
        <nav className={styles.dashboardShell__nav} aria-label="Painel">
          {grouped.map((section) => (
            <div key={section.group?.id ?? 'root'} className={styles.dashboardShell__navSection}>
              {section.group ? (
                <p className={styles.dashboardShell__navGroupLabel}>{section.group.label}</p>
              ) : null}
              <NavList items={section.items} collapsed={collapsed} onNavigate={closeMobile} />
            </div>
          ))}
        </nav>
        {collapsible ? (
          <div className={styles.dashboardShell__collapseRow}>
            <button
              type="button"
              className={styles.dashboardShell__collapseBtn}
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
              onClick={toggleCollapsed}
            >
              {collapsed ? (
                <ChevronRight className="size-4" strokeWidth={1.5} aria-hidden />
              ) : (
                <>
                  <ChevronLeft className="size-4" strokeWidth={1.5} aria-hidden />
                  <span>Recolher</span>
                </>
              )}
            </button>
          </div>
        ) : null}
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className={styles.dashboardShell__backdrop}
          aria-label="Fechar menu"
          onClick={closeMobile}
        />
      ) : null}

      <div className={styles.dashboardShell__main}>
        <header className={styles.dashboardShell__topbar}>
          <div className={styles.dashboardShell__topbarStart}>
            <IconButton
              variant="square-outline"
              size="md"
              className={styles.dashboardShell__menuButton}
              aria-label="Abrir menu"
              aria-expanded={mobileOpen}
              icon={<Menu className="size-5" strokeWidth={1.5} />}
              onClick={toggleMobile}
            />
            {title ? <p className={styles.dashboardShell__title}>{title}</p> : null}
          </div>
          <div className={styles.dashboardShell__topbarEnd}>
            {userName ? (
              <div className={styles.dashboardShell__user}>
                <span className={styles.dashboardShell__userAvatar} aria-hidden>
                  {userName.charAt(0).toUpperCase()}
                </span>
                <span className={styles.dashboardShell__userName}>{userName}</span>
              </div>
            ) : null}
            {headerEnd}
          </div>
        </header>

        <div className={styles.dashboardShell__content}>
          {breadcrumb ? <div className={styles.dashboardShell__breadcrumb}>{breadcrumb}</div> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
