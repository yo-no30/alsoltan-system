import Dexie, { type EntityTable } from 'dexie'
import type { SalePaymentType } from '@/types/database.types'

export interface PendingSaleItem {
  productId: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface PendingSaleRecord {
  localId: string
  createdAt: string
  invoiceNumber: string
  cashierId: string
  cashierName: string
  paymentType: SalePaymentType
  customerId: string | null
  customerName: string | null
  discount: number
  subtotal: number
  totalAmount: number
  items: PendingSaleItem[]
  status: 'pending'
}

class AlsoltanOfflineDb extends Dexie {
  pending_sales!: EntityTable<PendingSaleRecord, 'localId'>

  constructor() {
    super('alsoltan-pos')
    this.version(1).stores({
      pending_sales: 'localId, createdAt, invoiceNumber, status',
    })
    this.version(2)
      .stores({
        pending_sales: 'localId, createdAt, invoiceNumber, status',
      })
      .upgrade((tx) =>
        tx
          .table('pending_sales')
          .toCollection()
          .modify((sale) => {
            const row = sale as PendingSaleRecord & { paymentType: string }
            if (row.customerId === undefined) {
              row.customerId = null
            }
            if (row.customerName === undefined) {
              row.customerName = null
            }
            if (row.paymentType === 'card') {
              row.paymentType = 'cash'
            }
          }),
      )
  }
}

export const offlineDb = new AlsoltanOfflineDb()
