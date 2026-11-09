/** All monetary amounts are integer paisa to avoid floating-point currency errors. */
export function calculateCommission(subtotalPaisa: number, ratePercent: number) {
  if (!Number.isSafeInteger(subtotalPaisa) || subtotalPaisa < 0) throw new Error('Invalid subtotal');
  if (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100) throw new Error('Invalid commission rate');
  const commissionPaisa = Math.round(subtotalPaisa * ratePercent / 100);
  return { subtotalPaisa, commissionPaisa, sellerGrossBeforeFeesPaisa: subtotalPaisa - commissionPaisa };
}
