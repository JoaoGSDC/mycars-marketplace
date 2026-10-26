import { cn } from '@utils/cn';

export type ProgressBarsProps = {
  count: number;
  activeIndex: number;
  className?: string;
};

export function ProgressBars({ count, activeIndex, className }: ProgressBarsProps) {
  return (
    <div className={cn('flex gap-1.5', className)} role="group" aria-label="Progresso">
      {Array.from({ length: count }, (_, index) => {
        const isActive = index === activeIndex;

        return (
          <span
            key={index}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-200',
              isActive ? 'bg-accent-button' : 'bg-border'
            )}
            aria-current={isActive ? 'step' : undefined}
          />
        );
      })}
    </div>
  );
}
