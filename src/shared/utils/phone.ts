/** Normaliza telefone para comparação (apenas dígitos). */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** Exibe telefone de forma compacta (mantém o valor cadastrado se curto). */
export function formatPhoneDisplay(phone: string): string {
  const digits = normalizePhone(phone);

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return phone;
}
