'use client';

import { CategoryCarousel } from '@components/marketplace';
import { SectionHeader } from '@components/ui';

import styles from './styles.module.css';

export type HomeCategoriesItem = {
  id: string;
  label: string;
  availableCount: number;
  href: string;
  imageUrl?: string;
};

export type HomeCategoriesProps = {
  eyebrow: string;
  title: string;
  description: string;
  items: HomeCategoriesItem[];
};

export function HomeCategories({ eyebrow, title, description, items }: HomeCategoriesProps) {
  return (
    <section className={styles.homeCategories} aria-labelledby="home-categories-title">
      <CategoryCarousel
        items={items}
        showBuiltInHeader={false}
        ariaLabel={title}
        renderHeader={(controls) => (
          <SectionHeader
            eyebrow={eyebrow}
            title={title}
            description={description}
            actions={controls}
            className={styles.homeCategories__header}
          />
        )}
      />
      <span id="home-categories-title" className="sr-only">
        {title}
      </span>
    </section>
  );
}
