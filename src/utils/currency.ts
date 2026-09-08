/** Plain-text currency marker for CSV / PDF / titles (Unicode SAR sign). */
export const CURRENCY_LABEL = '⃁'

/** Human-readable currency name for labels and accessibility. */
export const CURRENCY_NAME = 'ريال'

export function formatMoney(value: number): string {
  return Number(value).toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Plain-text money with currency name — for CSV/PDF (SVG symbol not available). */
export function formatMoneyWithCurrency(value: number): string {
  return `${formatMoney(value)} ${CURRENCY_NAME}`
}
