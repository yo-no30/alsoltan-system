/** Yemeni Rial — display label used across the app */
export const CURRENCY_LABEL = 'ر.ي'

export function formatMoney(value: number): string {
  return Number(value).toLocaleString('ar-YE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatMoneyWithCurrency(value: number): string {
  return `${formatMoney(value)} ${CURRENCY_LABEL}`
}
