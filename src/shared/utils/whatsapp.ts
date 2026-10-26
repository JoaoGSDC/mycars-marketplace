/** Normaliza telefone BR/internacional para wa.me (somente dígitos). */
export function normalizeWhatsAppNumber(raw: string | null | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }

  const digits = raw.replace(/\D/g, '');

  if (digits.length < 10) {
    return undefined;
  }

  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

export function buildWhatsAppHref(
  phone: string | null | undefined,
  message: string
): string | undefined {
  const number = normalizeWhatsAppNumber(phone);

  if (!number) {
    return undefined;
  }

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
