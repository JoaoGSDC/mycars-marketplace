/**
 * Fotos públicas (Unsplash) para fixtures — só para demo visual.
 * Trocar por URLs reais do storage quando houver upload.
 */

const q = 'auto=format&fit=crop&w=1200&q=80';

/** Pool rotativo de carros (hatch, sedan, SUV, picape, etc.). */
export const VEHICLE_IMAGE_POOL = [
  `https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?${q}`,
  `https://images.unsplash.com/photo-1503376780353-7e6692767b70?${q}`,
  `https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?${q}`,
  `https://images.unsplash.com/photo-1552519507-da3b142c6e3d?${q}`,
  `https://images.unsplash.com/photo-1583121274602-3e2820c69888?${q}`,
  `https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?${q}`,
  `https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?${q}`,
  `https://images.unsplash.com/photo-1617814076367-b759c7d7e738?${q}`,
  `https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?${q}`,
  `https://images.unsplash.com/photo-1511919884226-fd3cad34687c?${q}`,
  `https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?${q}`,
  `https://images.unsplash.com/photo-1494976388531-d1058494cdd8?${q}`,
  `https://images.unsplash.com/photo-1486006920555-c77dcf18193c?${q}`,
  `https://images.unsplash.com/photo-1580273916550-e323be2ae537?${q}`,
  `https://images.unsplash.com/photo-1464219789935-c2d9d9aba644?${q}`,
  `https://images.unsplash.com/photo-1609521263047-f8f205293f24?${q}`,
  `https://images.unsplash.com/photo-1617531653332-bd46c24f2068?${q}`,
  `https://images.unsplash.com/photo-1621135802920-133df287f89c?${q}`,
  `https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?${q}`,
  `https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?${q}`,
  `https://images.unsplash.com/photo-1558618666-fcd25c85cd64?${q}`,
  `https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?${q}`,
  `https://images.unsplash.com/photo-1563720223185-11003d516935?${q}`,
  `https://images.unsplash.com/photo-1489824904134-891ab64532f1?${q}`,
] as const;

export const HERO_IMAGE_URL = `https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2400&q=80`;

export const BODY_TYPE_IMAGES: Record<string, string> = {
  hatch: `https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?${q}`,
  sedan: `https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?${q}`,
  suv: `https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?${q}`,
  pickup: `https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?${q}`,
  utility: `https://images.unsplash.com/photo-1464219789935-c2d9d9aba644?${q}`,
};

export const STORE_COVER_POOL = [
  `https://images.unsplash.com/photo-1486006920555-c77dcf18193c?${q}`,
  `https://images.unsplash.com/photo-1494976388531-d1058494cdd8?${q}`,
  `https://images.unsplash.com/photo-1489824904134-891ab64532f1?${q}`,
  `https://images.unsplash.com/photo-1503376780353-7e6692767b70?${q}`,
  `https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?${q}`,
  `https://images.unsplash.com/photo-1552519507-da3b142c6e3d?${q}`,
  `https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?${q}`,
  `https://images.unsplash.com/photo-1617814076367-b759c7d7e738?${q}`,
  `https://images.unsplash.com/photo-1583121274602-3e2820c69888?${q}`,
  `https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?${q}`,
] as const;

export function vehicleImageAt(index: number): string {
  return VEHICLE_IMAGE_POOL[index % VEHICLE_IMAGE_POOL.length];
}

export function storeCoverAt(index: number): string {
  return STORE_COVER_POOL[index % STORE_COVER_POOL.length];
}
