/** Arabic ledger terminology: عليه / له (not مدين / دائن). */

export const ALAYH_LABEL = 'عليه'
export const LAHU_LABEL = 'له'

/** Accounting nature used for reports / signed balances (not the user-facing type name). */
export type AccountNature = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'

/** @deprecated Use AccountNature — kept as alias for gradual migration */
export type AccountType = AccountNature

export type JournalSourceType =
  | 'sale'
  | 'purchase'
  | 'customer_payment'
  | 'supplier_payment'
  | 'expense'
  | 'payroll'
  | 'cash_transfer'
  | 'manual'
  | 'adjustment'
  | 'period_close'

export const ACCOUNT_NATURE_LABELS: Record<AccountNature, string> = {
  asset: 'أصول',
  liability: 'خصوم',
  equity: 'حقوق ملكية',
  revenue: 'إيرادات',
  expense: 'مصروفات',
}

/** @deprecated Use ACCOUNT_NATURE_LABELS */
export const ACCOUNT_TYPE_LABELS = ACCOUNT_NATURE_LABELS

export const JOURNAL_SOURCE_LABELS: Record<JournalSourceType, string> = {
  sale: 'بيع',
  purchase: 'شراء',
  customer_payment: 'تحصيل عميل',
  supplier_payment: 'سداد مورد',
  expense: 'مصروف',
  payroll: 'رواتب',
  cash_transfer: 'تحويل نقدي',
  manual: 'قيد يدوي',
  adjustment: 'تسوية',
  period_close: 'إقفال فترة',
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

/** Running balance for asset/expense: عليه يزيد، له ينقص. Liability/equity/revenue opposite. */
export function signedMovement(
  accountNature: AccountNature,
  alayh: number,
  lahu: number,
): number {
  const net = roundMoney(alayh - lahu)
  if (accountNature === 'asset' || accountNature === 'expense') {
    return net
  }
  return roundMoney(-net)
}
