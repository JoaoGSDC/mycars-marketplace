-- Enquadramento controlado da capa (center | top | bottom).
ALTER TABLE `storefront_settings` ADD COLUMN `cover_focus` text DEFAULT 'center';
