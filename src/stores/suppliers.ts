import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type {
  Supplier,
  SupplierInsert,
  SupplierUpdate,
} from '@/types/database.types'

export type StoreResult<T = void> =
  | ({ ok: true } & (T extends void ? object : { data: T }))
  | { ok: false; message: string }

function mapError(error: { message?: string } | null, fallback: string): string {
  return error?.message?.trim() || fallback
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export const useSuppliersStore = defineStore('suppliers', () => {
  const suppliers = ref<Supplier[]>([])
  const isLoading = ref(false)
  const isSaving = ref(false)

  const totalDebt = computed(() =>
    roundMoney(
      suppliers.value.reduce((sum, entry) => sum + Number(entry.balance_due), 0),
    ),
  )

  function upsertSupplier(supplier: Supplier): void {
    const index = suppliers.value.findIndex((entry) => entry.id === supplier.id)
    if (index === -1) {
      suppliers.value.push(supplier)
      suppliers.value.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
      return
    }
    suppliers.value[index] = supplier
    suppliers.value.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  }

  async function fetchSuppliers(): Promise<StoreResult> {
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name')

      if (error) {
        console.error('[suppliers] fetch:', error.message)
        return { ok: false, message: mapError(error, 'تعذر تحميل الموردين.') }
      }

      suppliers.value = data ?? []
      return { ok: true }
    } catch (error) {
      console.error('[suppliers] fetch unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء تحميل الموردين.' }
    } finally {
      isLoading.value = false
    }
  }

  async function createSupplier(
    payload: SupplierInsert,
  ): Promise<StoreResult<Supplier>> {
    isSaving.value = true
    try {
      const name = payload.name.trim()
      if (!name) {
        return { ok: false, message: 'اسم المورد مطلوب.' }
      }

      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          name,
          phone: payload.phone?.trim() || null,
          balance_due: payload.balance_due ?? 0,
        })
        .select('*')
        .single()

      if (error || !data) {
        console.error('[suppliers] create:', error?.message)
        return { ok: false, message: mapError(error, 'تعذر إضافة المورد.') }
      }

      upsertSupplier(data)
      return { ok: true, data }
    } catch (error) {
      console.error('[suppliers] create unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء إضافة المورد.' }
    } finally {
      isSaving.value = false
    }
  }

  async function updateSupplier(
    id: string,
    payload: SupplierUpdate,
  ): Promise<StoreResult<Supplier>> {
    isSaving.value = true
    try {
      if (payload.name !== undefined && !payload.name.trim()) {
        return { ok: false, message: 'اسم المورد مطلوب.' }
      }

      const updatePayload: SupplierUpdate = {
        ...payload,
        name: payload.name?.trim(),
        phone:
          payload.phone === undefined
            ? undefined
            : payload.phone?.trim() || null,
      }

      const { data, error } = await supabase
        .from('suppliers')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single()

      if (error || !data) {
        console.error('[suppliers] update:', error?.message)
        return { ok: false, message: mapError(error, 'تعذر تحديث المورد.') }
      }

      upsertSupplier(data)
      return { ok: true, data }
    } catch (error) {
      console.error('[suppliers] update unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء تحديث المورد.' }
    } finally {
      isSaving.value = false
    }
  }

  async function recordPayment(
    supplierId: string,
    amount: number,
  ): Promise<StoreResult<Supplier>> {
    isSaving.value = true
    try {
      const supplier = suppliers.value.find((entry) => entry.id === supplierId)
      if (!supplier) {
        return { ok: false, message: 'المورد غير موجود.' }
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        return { ok: false, message: 'مبلغ التسديد يجب أن يكون أكبر من صفر.' }
      }

      const balance = Number(supplier.balance_due)
      if (amount > balance) {
        return {
          ok: false,
          message: 'مبلغ التسديد أكبر من رصيد الدين المستحق.',
        }
      }

      const nextBalance = roundMoney(balance - amount)
      const { data, error } = await supabase
        .from('suppliers')
        .update({ balance_due: nextBalance })
        .eq('id', supplierId)
        .select('*')
        .single()

      if (error || !data) {
        console.error('[suppliers] payment:', error?.message)
        return { ok: false, message: mapError(error, 'تعذر تسجيل التسديد.') }
      }

      upsertSupplier(data)
      return { ok: true, data }
    } catch (error) {
      console.error('[suppliers] payment unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء تسجيل التسديد.' }
    } finally {
      isSaving.value = false
    }
  }

  return {
    suppliers,
    isLoading,
    isSaving,
    totalDebt,
    upsertSupplier,
    fetchSuppliers,
    createSupplier,
    updateSupplier,
    recordPayment,
  }
})
