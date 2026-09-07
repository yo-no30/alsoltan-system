import { nextTick, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useCustomersStore } from '@/stores/customers'
import { useInventoryStore } from '@/stores/inventory'
import { useOfflineQueueStore, type QueuedSale } from '@/stores/offlineQueue'
import { useToast } from '@/stores/toast'
import {
  allocateLocalInvoiceNumber,
  rememberInvoiceNumber,
} from '@/utils/invoiceNumber'
import type { SalePaymentType, SaleStatus } from '@/types/database.types'

export interface ReceiptLine {
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface ReceiptData {
  invoiceNumber: string
  cashierName: string
  customerName: string | null
  createdAt: string
  paymentType: SalePaymentType
  discount: number
  subtotal: number
  totalAmount: number
  items: ReceiptLine[]
  offline: boolean
}

interface CompleteSaleRpcResult {
  sale_id: string
  invoice_number: string
}

const isCompleting = ref(false)
const lastReceipt = ref<ReceiptData | null>(null)
let isFlushing = false

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function parseCompleteSaleResult(data: unknown): CompleteSaleRpcResult | null {
  if (!data || typeof data !== 'object') return null
  const row = data as Record<string, unknown>
  const saleId = row.sale_id
  const invoiceNumber = row.invoice_number
  if (typeof saleId !== 'string' || typeof invoiceNumber !== 'string') {
    return null
  }
  return { sale_id: saleId, invoice_number: invoiceNumber }
}

export function useSales() {
  const auth = useAuthStore()
  const cart = useCartStore()
  const customers = useCustomersStore()
  const inventory = useInventoryStore()
  const offlineQueue = useOfflineQueueStore()
  const toast = useToast()

  function buildReceipt(
    invoiceNumber: string,
    paymentType: SalePaymentType,
    customerName: string | null,
    offline: boolean,
    createdAt = new Date().toISOString(),
  ): ReceiptData {
    return {
      invoiceNumber,
      cashierName: auth.fullName || 'كاشير',
      customerName,
      createdAt,
      paymentType,
      discount: cart.appliedDiscount,
      subtotal: cart.subtotal,
      totalAmount: cart.totalAmount,
      items: cart.lines.map((line) => ({
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        totalPrice: roundMoney(line.unitPrice * line.quantity),
      })),
      offline,
    }
  }

  function applyLocalStockDecrement(
    items: { productId: string; quantity: number }[],
  ): void {
    for (const item of items) {
      const product = inventory.products.find((entry) => entry.id === item.productId)
      if (!product) continue
      inventory.upsertProduct({
        ...product,
        stock_quantity: Math.max(0, product.stock_quantity - item.quantity),
      })
    }
  }

  function applyLocalCustomerDebt(
    customerId: string | null,
    paymentType: SalePaymentType,
    amount: number,
  ): void {
    if (paymentType !== 'credit' || !customerId || amount <= 0) return
    const customer = customers.getById(customerId)
    if (!customer) return
    customers.upsertCustomer({
      ...customer,
      balance_due: roundMoney(Number(customer.balance_due) + amount),
    })
  }

  async function printReceipt(receipt: ReceiptData): Promise<void> {
    lastReceipt.value = receipt
    document.body.classList.remove('printing-report')
    document.body.classList.add('printing-thermal')
    await nextTick()
    window.print()
    window.setTimeout(() => {
      document.body.classList.remove('printing-thermal')
    }, 300)
  }

  async function callCompleteSaleRpc(params: {
    invoiceNumber: string
    paymentType: SalePaymentType
    status: SaleStatus
    cashierId: string
    customerId: string | null
    items: { product_id: string; quantity: number; unit_price: number }[]
    discount: number
  }): Promise<
    | { ok: true; saleId: string; invoiceNumber: string }
    | { ok: false; message: string }
  > {
    try {
      const { data, error } = await supabase.rpc('complete_sale', {
        p_invoice_number: params.invoiceNumber,
        p_payment_type: params.paymentType,
        p_status: params.status,
        p_cashier_id: params.cashierId,
        p_items: params.items,
        p_discount: params.discount,
        p_customer_id: params.customerId,
      })

      if (error) {
        console.error('[useSales] complete_sale RPC failed:', error.message)
        return {
          ok: false,
          message: error.message || 'تعذر إتمام البيع على الخادم.',
        }
      }

      const parsed = parseCompleteSaleResult(data)
      if (!parsed) {
        return { ok: false, message: 'استجابة غير صالحة من الخادم.' }
      }

      rememberInvoiceNumber(parsed.invoice_number)
      return {
        ok: true,
        saleId: parsed.sale_id,
        invoiceNumber: parsed.invoice_number,
      }
    } catch (error) {
      console.error('[useSales] complete_sale unexpected error:', error)
      return { ok: false, message: 'حدث خطأ غير متوقع أثناء إتمام البيع.' }
    }
  }

  async function completeSale(options: {
    paymentType: SalePaymentType
    customerId?: string | null
  }): Promise<{ ok: true; offline: boolean } | { ok: false; message: string }> {
    if (isCompleting.value) {
      return { ok: false, message: 'جاري معالجة عملية بيع أخرى.' }
    }

    if (cart.lines.length === 0) {
      return { ok: false, message: 'السلة فارغة.' }
    }

    if (!auth.user?.id || !auth.profile) {
      return { ok: false, message: 'يجب تسجيل الدخول لإتمام البيع.' }
    }

    const customerId = options.customerId ?? null

    if (options.paymentType === 'credit' && !customerId) {
      return { ok: false, message: 'يجب اختيار عميل للبيع الآجل.' }
    }

    let customerName: string | null = null
    if (customerId) {
      const customer = customers.getById(customerId)
      if (!customer) {
        return { ok: false, message: 'العميل غير موجود.' }
      }
      customerName = customer.name
    }

    for (const line of cart.lines) {
      const product = inventory.products.find((entry) => entry.id === line.productId)
      if (!product) {
        return { ok: false, message: `المنتج غير موجود: ${line.name}` }
      }
      if (product.stock_quantity < line.quantity) {
        return {
          ok: false,
          message: `المخزون غير كافٍ للمنتج: ${line.name}`,
        }
      }
    }

    isCompleting.value = true

    try {
      const itemsPayload = cart.lines.map((line) => ({
        product_id: line.productId,
        quantity: line.quantity,
        unit_price: line.unitPrice,
      }))
      const stockItems = cart.lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
      }))
      const saleTotal = cart.totalAmount
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

      if (!isOnline) {
        const invoiceNumber = allocateLocalInvoiceNumber()
        const receipt = buildReceipt(
          invoiceNumber,
          options.paymentType,
          customerName,
          true,
        )

        await offlineQueue.enqueueSale({
          invoiceNumber,
          cashierId: auth.user.id,
          cashierName: auth.fullName || 'كاشير',
          paymentType: options.paymentType,
          customerId,
          customerName,
          discount: cart.appliedDiscount,
          subtotal: cart.subtotal,
          totalAmount: saleTotal,
          items: cart.lines.map((line) => ({
            productId: line.productId,
            name: line.name,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            totalPrice: roundMoney(line.unitPrice * line.quantity),
          })),
        })

        applyLocalStockDecrement(stockItems)
        applyLocalCustomerDebt(customerId, options.paymentType, saleTotal)
        cart.clearCart()
        toast.warning('تم حفظ الفاتورة محلياً (أوفلاين)')
        await printReceipt(receipt)
        return { ok: true, offline: true }
      }

      const rpcResult = await callCompleteSaleRpc({
        invoiceNumber: '',
        paymentType: options.paymentType,
        status: 'completed',
        cashierId: auth.user.id,
        customerId,
        items: itemsPayload,
        discount: cart.appliedDiscount,
      })

      if (!rpcResult.ok) {
        return rpcResult
      }

      const receipt = buildReceipt(
        rpcResult.invoiceNumber,
        options.paymentType,
        customerName,
        false,
      )
      applyLocalStockDecrement(stockItems)
      applyLocalCustomerDebt(customerId, options.paymentType, saleTotal)
      cart.clearCart()
      toast.success(`تم إتمام البيع — فاتورة رقم ${rpcResult.invoiceNumber}`)
      await printReceipt(receipt)
      return { ok: true, offline: false }
    } catch (error) {
      console.error('[useSales] completeSale unexpected error:', error)
      return { ok: false, message: 'حدث خطأ غير متوقع أثناء إتمام البيع.' }
    } finally {
      isCompleting.value = false
    }
  }

  async function syncQueuedSale(
    sale: QueuedSale,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    const result = await callCompleteSaleRpc({
      invoiceNumber: sale.invoiceNumber,
      paymentType: sale.paymentType,
      status: 'synced_offline',
      cashierId: sale.cashierId,
      customerId: sale.customerId ?? null,
      items: sale.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
      discount: sale.discount,
    })

    if (!result.ok) {
      return result
    }

    await offlineQueue.dequeueSale(sale.localId)
    return { ok: true }
  }

  async function flushOfflineQueue(): Promise<number> {
    if (isFlushing || offlineQueue.isSyncing) {
      return 0
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 0
    }

    if (!offlineQueue.isLoaded) {
      await offlineQueue.loadQueue()
    }

    if (!offlineQueue.hasPending) {
      return 0
    }

    isFlushing = true
    offlineQueue.isSyncing = true
    let synced = 0

    try {
      while (offlineQueue.hasPending) {
        const next = offlineQueue.peekNext()
        if (!next) break

        const result = await syncQueuedSale(next)
        if (!result.ok) {
          console.error('[useSales] flush stopped:', result.message)
          toast.error(`فشلت مزامنة فاتورة ${next.invoiceNumber}`)
          break
        }

        synced += 1
      }

      if (synced > 0) {
        toast.success(
          synced === 1
            ? 'تمت مزامنة فاتورة واحدةحدة'
            : `تمت مزامنة ${synced} فواتير`,
        )
      }
    } catch (error) {
      console.error('[useSales] flushOfflineQueue unexpected error:', error)
      toast.error('تعذر مزامنة الفواتير المحفوظة.')
    } finally {
      isFlushing = false
      offlineQueue.isSyncing = false
    }

    return synced
  }

  return {
    isCompleting,
    lastReceipt,
    completeSale,
    flushOfflineQueue,
    printReceipt,
  }
}
