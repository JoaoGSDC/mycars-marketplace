/** Remove máscara — mantém só dígitos. */
export function stripCnpj(value: string): string {
  return value.replace(/\D/g, '');
}

/** Formata 14 dígitos como 00.000.000/0000-00. */
export function formatCnpj(value: string): string {
  const digits = stripCnpj(value).slice(0, 14);

  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function calcDigit(base: number[], weights: number[]): number {
  const sum = base.reduce((acc, digit, index) => acc + digit * (weights[index] ?? 0), 0);
  const mod = sum % 11;

  return mod < 2 ? 0 : 11 - mod;
}

/** Valida CNPJ (dígitos verificadores + rejeita sequências iguais). */
export function isValidCnpj(value: string): boolean {
  const cnpj = stripCnpj(value);

  if (cnpj.length !== 14) {
    return false;
  }

  if (/^(\d)\1+$/.test(cnpj)) {
    return false;
  }

  const digits = cnpj.split('').map(Number);
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const d1 = calcDigit(digits.slice(0, 12), w1);
  const d2 = calcDigit(digits.slice(0, 13), w2);

  return digits[12] === d1 && digits[13] === d2;
}
