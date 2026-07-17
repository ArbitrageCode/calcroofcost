// FP-safe round to the nearest whole dollar: snap to the nearest cent first
// so floating-point noise below $0.01 can't tip a rounding decision the
// wrong way, then round that cent value to the nearest dollar. Shared by
// every calculator on the site that rounds to whole dollars (as opposed to
// the anchor roof calculator's roundTo50, which rounds to the nearest $50).
export function roundToDollar(n: number): number {
  return Math.round(Math.round(n * 100) / 100);
}
