/**
 * Safely converts a Prisma Decimal, number, string, or null/undefined to a standard JavaScript number.
 */
export function toNum(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val?.toNumber === 'function') return val.toNumber();
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}
