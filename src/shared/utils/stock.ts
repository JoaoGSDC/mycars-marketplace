/** Dias desde a entrada no estoque (calendário). */
export function daysInStock(enteredAt: string, now = Date.now()): number {
  const start = new Date(enteredAt).getTime();

  if (Number.isNaN(start)) {
    return 0;
  }

  return Math.max(0, Math.floor((now - start) / (24 * 60 * 60 * 1000)));
}
