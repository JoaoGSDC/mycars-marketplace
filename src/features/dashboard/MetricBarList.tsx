import styles from './dashboard.module.css';
import { formatNumber } from './dashboard.format';

export type MetricBarItem = {
  id: string;
  label: string;
  value: number;
  displayValue?: string;
};

export type MetricBarListProps = {
  items: MetricBarItem[];
  emptyLabel: string;
  ariaLabel: string;
};

export function MetricBarList({ items, emptyLabel, ariaLabel }: MetricBarListProps) {
  const max = Math.max(0, ...items.map((item) => item.value));

  if (items.length === 0 || max === 0) {
    return <p className={styles.dashboard__empty}>{emptyLabel}</p>;
  }

  return (
    <ul className={styles.dashboard__bars} aria-label={ariaLabel}>
      {items.map((item) => {
        const pct = max > 0 ? Math.round((item.value / max) * 100) : 0;

        return (
          <li key={item.id} className={styles.dashboard__barRow}>
            <div className={styles.dashboard__barMeta}>
              <span>{item.label}</span>
              <span className="tabular-nums font-medium">
                {item.displayValue ?? formatNumber(item.value)}
              </span>
            </div>
            <div
              className={styles.dashboard__barTrack}
              role="meter"
              aria-label={item.label}
              aria-valuemin={0}
              aria-valuemax={max}
              aria-valuenow={item.value}
            >
              <div className={styles.dashboard__barFill} style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
