import {
  ArrowRight,
  Bell,
  Calendar,
  Car,
  Fuel,
  Gauge,
  Heart,
  MapPin,
  MessageCircle,
  Palette,
  Search,
  Settings2,
  SlidersHorizontal,
  User,
  X,
  type LucideIcon,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '@utils/cn';

export type IconProps = ComponentProps<'svg'> & {
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
} as const;

/** Wrapper genérico para ícones Lucide com tamanho e stroke padronizados. */
export function Icon({ icon: LucideComponent, size = 'md', className, strokeWidth = 1.5, ...props }: IconProps) {
  return <LucideComponent className={cn(sizeClasses[size], className)} strokeWidth={strokeWidth} {...props} />;
}

export const SpecIcons = {
  Mileage: Gauge,
  Fuel,
  Transmission: Settings2,
  Year: Calendar,
  Location: MapPin,
  Body: Car,
  Color: Palette,
  Heart,
  Search,
  Sliders: SlidersHorizontal,
  ArrowRight,
  User,
  Bell,
  Message: MessageCircle,
  Close: X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  WhatsApp: MessageCircle,
} as const satisfies Record<string, LucideIcon>;

export type SpecIconName = keyof typeof SpecIcons;

export type SpecIconProps = Omit<IconProps, 'icon'> & {
  name: SpecIconName;
};

export function SpecIcon({ name, ...props }: SpecIconProps) {
  const LucideComponent = SpecIcons[name];

  return <Icon icon={LucideComponent} {...props} />;
}
