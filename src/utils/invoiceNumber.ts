/** Local sequential invoice helper for offline sales (server is source of truth online). */

const STORAGE_KEY = 'alsoltan_last_invoice_no'

export function getLastInvoiceNumber(): number {
  const raw = localStorage.getItem(STORAGE_KEY)
  const parsed = Number.parseInt(raw ?? '0', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function rememberInvoiceNumber(invoiceNumber: string | number): void {
  const parsed =
    typeof invoiceNumber === 'number'
      ? invoiceNumber
      : Number.parseInt(String(invoiceNumber), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return
  const current = getLastInvoiceNumber()
  if (parsed > current) {
    localStorage.setItem(STORAGE_KEY, String(parsed))
  }
}

/** Allocate next local number for offline checkout / print. */
export function allocateLocalInvoiceNumber(): string {
  const next = getLastInvoiceNumber() + 1
  localStorage.setItem(STORAGE_KEY, String(next))
  return String(next)
}
