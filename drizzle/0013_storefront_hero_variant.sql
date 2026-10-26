-- Variante controlada do hero da vitrine (integrated | split).
ALTER TABLE `storefront_settings` ADD COLUMN `hero_variant` text DEFAULT 'integrated';
