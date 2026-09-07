import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useInventoryStore } from '@/stores/inventory'
import { useSuppliersStore } from '@/stores/suppliers'
import type { Purchase, PurchasePaymentType } from '@/types/database.types'

export interface PurchaseListItem extends Purchase {
  supplier_name: string | null
}

export interface PurchaseLineInput {
  product_id: string
  quantity: number
  cost_price: number
}

export interface CreatePurchaseInput {
  supplier_id: string
  invoice_number: string
  payment_type: PurchasePaymentType
  paid_amount: number
  items: PurchaseLineInput[]
}

export type StoreResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; message: string }

function mapError(error: { message?: string } | null, fallback: string): string {
  return error?.message?.trim() || fallback
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function calcPurchaseTotal(items: PurchaseLineInput[]): number {
  return roundMoney(
    items.reduce(
      (sum, item) => sum + Number(item.cost_price) * Number(item.quantity),
      0,
    ),
  )
}

interface PurchaseRow extends Purchase {
  suppliers: { name: string } | null
}

export const usePurchasesStore = defineStore('purchases', () => {
  const purchases = ref<PurchaseListItem[]>([])
  const isLoading = ref(false)
  const isSaving = ref(false)

  async function fetchPurchases(): Promise<StoreResult> {
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*, suppliers(name)')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[purchases] fetch:', error.message)
        return { ok: false, message: mapError(error, 'تعذر تحميل فواتير الشراء.') }
      }

      const rows = (data ?? []) as unknown as PurchaseRow[]
      purchases.value = rows.map((row) => ({
        id: row.id,
        supplier_id: row.supplier_id,
        invoice_number: row.invoice_number,
        total_amount: row.total_amount,
        paid_amount: row.paid_amount,
        payment_type: row.payment_type,
        created_at: row.created_at,
        supplier_name: row.suppliers?.name ?? null,
      }))

      return { ok: true }
    } catch (error) {
      console.error('[purchases] fetch unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء تحميل المشتريات.' }
    } finally {
      isLoading.value = false
    }
  }

  async function createPurchase(
    input: CreatePurchaseInput,
  ): Promise<StoreResult<{ purchaseId: string }>> {
    isSaving.value = true
    try {
      const invoice = input.invoice_number.trim()
      if (!invoice) {
        return { ok: false, message: 'رقم فاتورة الشراء مطلوب.' }
      }
      if (!input.supplier_id) {
        return { ok: false, message: 'اختر المورد.' }
      }
      if (!input.items.length) {
        return { ok: false, message: 'أضف عنصراً واحداً على الأقل.' }
      }

      for (const item of input.items) {
        if (!item.product_id || item.quantity <= 0 || item.cost_price < 0) {
          return { ok: false, message: 'تحقق من كميات وأسعار بنود الفاتورة.' }
        }
      }

      const total = calcPurchaseTotal(input.items)
      let paid = roundMoney(input.paid_amount)
      if (input.payment_type === 'cash') {
        paid = total
      }
      if (paid < 0 || paid > total) {
        return { ok: false, message: 'المبلغ المدفوع غير صالح.' }
      }

      const { data, error } = await supabase.rpc('complete_purchase', {
        p_supplier_id: input.supplier_id,
        p_invoice_number: invoice,
        p_payment_type: input.payment_type,
        p_paid_amount: paid,
        p_items: input.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          cost_price: item.cost_price,
        })),
      })

      if (error || !data) {
        console.error('[purchases] create RPC:', error?.message)
        return {
          ok: false,
          message: mapError(error, 'تعذر حفظ فاتورة الشراء.'),
        }
      }

      const inventory = useInventoryStore()
      const suppliers = useSuppliersStore()
      await Promise.all([
        inventory.fetchCatalog(),
        suppliers.fetchSuppliers(),
        fetchPurchases(),
      ])

      return { ok: true, data: { purchaseId: data } }
    } catch (error) {
      console.error('[purchases] create unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء حفظ فاتورة الشراء.' }
    } finally {
      isSaving.value = false
    }
  }

  return {
    purchases,
    isLoading,
    isSaving,
    fetchPurchases,
    createPurchase,
  }
})
