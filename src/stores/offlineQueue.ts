import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  offlineDb,
  type PendingSaleItem,
  type PendingSaleRecord,
} from '@/db/offlineDb'
import type { SalePaymentType } from '@/types/database.types'

export type QueuedSaleItem = PendingSaleItem
export type QueuedSale = PendingSaleRecord

export interface EnqueueSaleInput {
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
  createdAt?: string
}

export const useOfflineQueueStore = defineStore('offlineQueue', () => {
  const pendingSales = ref<PendingSaleRecord[]>([])
  const isLoaded = ref(false)
  const isSyncing = ref(false)

  const queueLength = computed(() => pendingSales.value.length)
  const hasPending = computed(() => pendingSales.value.length > 0)

  async function loadQueue(): Promise<void> {
    try {
      const rows = await offlineDb.pending_sales
        .orderBy('createdAt')
        .toArray()
      pendingSales.value = rows
      isLoaded.value = true
    } catch (error) {
      console.error('[offlineQueue] loadQueue failed:', error)
      pendingSales.value = []
      isLoaded.value = true
    }
  }

  async function enqueueSale(input: EnqueueSaleInput): Promise<string> {
    const localId = crypto.randomUUID()
    const record: PendingSaleRecord = {
      localId,
      createdAt: input.createdAt ?? new Date().toISOString(),
      invoiceNumber: input.invoiceNumber,
      cashierId: input.cashierId,
      cashierName: input.cashierName,
      paymentType: input.paymentType,
      customerId: input.customerId,
      customerName: input.customerName,
      discount: input.discount,
      subtotal: input.subtotal,
      totalAmount: input.totalAmount,
      items: input.items,
      status: 'pending',
    }

    try {
      await offlineDb.pending_sales.add(record)
      pendingSales.value = [...pendingSales.value, record].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      )
      return localId
    } catch (error) {
      console.error('[offlineQueue] enqueueSale failed:', error)
      throw error
    }
  }

  async function dequeueSale(localId: string): Promise<void> {
    try {
      await offlineDb.pending_sales.delete(localId)
      pendingSales.value = pendingSales.value.filter(
        (entry) => entry.localId !== localId,
      )
    } catch (error) {
      console.error('[offlineQueue] dequeueSale failed:', error)
      throw error
    }
  }

  function peekNext(): PendingSaleRecord | null {
    return pendingSales.value[0] ?? null
  }

  async function clearQueue(): Promise<void> {
    try {
      await offlineDb.pending_sales.clear()
      pendingSales.value = []
    } catch (error) {
      console.error('[offlineQueue] clearQueue failed:', error)
      throw error
    }
  }

  return {
    pendingSales,
    isLoaded,
    isSyncing,
    queueLength,
    hasPending,
    loadQueue,
    enqueueSale,
    dequeueSale,
    peekNext,
    clearQueue,
  }
})
