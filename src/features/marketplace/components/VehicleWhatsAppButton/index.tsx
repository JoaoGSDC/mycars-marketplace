'use client';

import { MessageCircle } from 'lucide-react';

import { Button } from '@components/ui';
import { registerWhatsAppClickAction } from '@server/leads/lead-actions';

export type VehicleWhatsAppButtonProps = {
  href: string;
  listingSlug: string;
  label: string;
};

export function VehicleWhatsAppButton({ href, listingSlug, label }: VehicleWhatsAppButtonProps) {
  function trackClick() {
    void registerWhatsAppClickAction({
      listingSlug,
      originPath:
        typeof window !== 'undefined' ? window.location.pathname : `/veiculos/${listingSlug}`,
    });
  }

  return (
    <Button variant="whatsapp" asChild className="w-full">
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={trackClick}>
        <MessageCircle className="size-4" strokeWidth={1.5} aria-hidden />
        {label}
      </a>
    </Button>
  );
}
