'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { IconButton } from '@components/ui/IconButton';
import { cn } from '@utils/cn';

export type CarouselControlsProps = {
  onPrevious?: () => void;
  onNext?: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  className?: string;
};

export function CarouselControls({
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled,
  className,
}: CarouselControlsProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <IconButton
        variant="square-outline"
        size="md"
        aria-label="Anterior"
        disabled={previousDisabled}
        onClick={onPrevious}
        icon={<ChevronLeft className="size-5" strokeWidth={1.5} />}
      />
      <IconButton
        variant="square-accent"
        size="md"
        aria-label="Próximo"
        disabled={nextDisabled}
        onClick={onNext}
        icon={<ChevronRight className="size-5" strokeWidth={1.5} />}
      />
    </div>
  );
}
