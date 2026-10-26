export type SiteFooterLink = {
  href: string;
  label: string;
};

export type SiteFooterColumn = {
  title: string;
  links: SiteFooterLink[];
};

export type SiteFooterVariant = 'default' | 'compact';

export type SiteFooterProps = {
  variant?: SiteFooterVariant;
  description?: string;
  linkColumns?: SiteFooterColumn[];
  legalLinks?: SiteFooterLink[];
  copyright?: string;
  /** Quando false, omite o bloco de newsletter (útil se a página já tiver um). */
  showNewsletter?: boolean;
  newsletterTitle?: string;
  newsletterDescription?: string;
  onNewsletterSubmit?: (email: string) => void;
  className?: string;
};
