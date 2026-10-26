'use client';

import type { ReactNode } from 'react';

import { Button } from '@components/ui/Button';
import { Drawer, DrawerBody, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@components/ui/Drawer';
import { SpecIcon } from '@components/ui/Icon';
import { cn } from '@utils/cn';

import styles from './styles.module.css';

export type FilterSidebarProps = {
  children: ReactNode;
  onClearAll?: () => void;
  clearAllLabel?: string;
  mobileTriggerLabel?: string;
  className?: string;
  drawerClassName?: string;
};

function FilterSidebarContent({
  children,
  onClearAll,
  clearAllLabel = 'Limpar tudo',
}: Pick<FilterSidebarProps, 'children' | 'onClearAll' | 'clearAllLabel'>) {
  return (
    <>
      <div className={styles.filterSidebar__stack}>{children}</div>
      {onClearAll ? (
        <Button variant="outline" className={styles.filterSidebar__clearAll} onClick={onClearAll}>
          {clearAllLabel}
        </Button>
      ) : null}
    </>
  );
}

export function FilterSidebar({
  children,
  onClearAll,
  clearAllLabel,
  mobileTriggerLabel = 'Filtros',
  className,
  drawerClassName,
}: FilterSidebarProps) {
  return (
    <>
      <aside className={cn(styles.filterSidebar, styles['filterSidebar--desktop'], className)}>
        <FilterSidebarContent onClearAll={onClearAll} clearAllLabel={clearAllLabel}>
          {children}
        </FilterSidebarContent>
      </aside>

      <div className={cn(styles.filterSidebar, styles['filterSidebar--mobile'], drawerClassName)}>
        <Drawer>
          <DrawerTrigger className={styles.filterSidebar__mobileTrigger}>
            <SpecIcon name="Sliders" size="sm" aria-hidden />
            {mobileTriggerLabel}
          </DrawerTrigger>
          <DrawerContent side="left" className={styles.filterSidebar__drawer}>
            <DrawerHeader>
              <DrawerTitle>Filtros</DrawerTitle>
            </DrawerHeader>
            <DrawerBody>
              <FilterSidebarContent onClearAll={onClearAll} clearAllLabel={clearAllLabel}>
                {children}
              </FilterSidebarContent>
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}
