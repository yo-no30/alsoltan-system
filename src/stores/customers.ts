import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type {
  Customer,
  CustomerInsert,
  CustomerUpdate,
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

export const useCustomersStore = defineStore('customers', () => {
  const customers = ref<Customer[]>([])
  const isLoading = ref(false)
  const isSaving = ref(false)

  const totalReceivables = computed(() =>
    roundMoney(
      customers.value.reduce((sum, entry) => sum + Number(entry.balance_due), 0),
    ),
  )

  function upsertCustomer(customer: Customer): void {
    const index = customers.value.findIndex((entry) => entry.id === customer.id)
    if (index === -1) {
      customers.value.push(customer)
      customers.value.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
      return
    }
    customers.value[index] = customer
    customers.value.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  }

  function getById(id: string): Customer | undefined {
    return customers.value.find((entry) => entry.id === id)
  }

  async function fetchCustomers(): Promise<StoreResult> {
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name')

      if (error) {
        console.error('[customers] fetch:', error.message)
        return { ok: false, message: mapError(error, 'تعذر تحميل العملاء.') }
      }

      customers.value = data ?? []
      return { ok: true }
    } catch (error) {
      console.error('[customers] fetch unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء تحميل العملاء.' }
    } finally {
      isLoading.value = false
    }
  }

  async function createCustomer(
    payload: CustomerInsert,
  ): Promise<StoreResult<Customer>> {
    isSaving.value = true
    try {
      const name = payload.name.trim()
      if (!name) {
        return { ok: false, message: 'اسم العميل مطلوب.' }
      }

      const { data, error } = await supabase
        .from('customers')
        .insert({
          name,
          phone: payload.phone?.trim() || null,
          notes: payload.notes?.trim() || null,
          balance_due: payload.balance_due ?? 0,
        })
        .select('*')
        .single()

      if (error || !data) {
        console.error('[customers] create:', error?.message)
        return { ok: false, message: mapError(error, 'تعذر إضافة العميل.') }
      }

      upsertCustomer(data)
      return { ok: true, data }
    } catch (error) {
      console.error('[customers] create unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء إضافة العميل.' }
    } finally {
      isSaving.value = false
    }
  }

  async function updateCustomer(
    id: string,
    payload: CustomerUpdate,
  ): Promise<StoreResult<Customer>> {
    isSaving.value = true
    try {
      if (payload.name !== undefined && !payload.name.trim()) {
        return { ok: false, message: 'اسم العميل مطلوب.' }
      }

      const updatePayload: CustomerUpdate = {
        ...payload,
        name: payload.name?.trim(),
        phone:
          payload.phone === undefined
            ? undefined
            : payload.phone?.trim() || null,
        notes:
          payload.notes === undefined
            ? undefined
            : payload.notes?.trim() || null,
      }

      const { data, error } = await supabase
        .from('customers')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single()

      if (error || !data) {
        console.error('[customers] update:', error?.message)
        return { ok: false, message: mapError(error, 'تعذر تحديث العميل.') }
      }

      upsertCustomer(data)
      return { ok: true, data }
    } catch (error) {
      console.error('[customers] update unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء تحديث العميل.' }
    } finally {
      isSaving.value = false
    }
  }

  async function recordPayment(
    customerId: string,
    amount: number,
  ): Promise<StoreResult<Customer>> {
    isSaving.value = true
    try {
      const customer = customers.value.find((entry) => entry.id === customerId)
      if (!customer) {
        return { ok: false, message: 'العميل غير موجود.' }
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        return { ok: false, message: 'مبلغ التسديد يجب أن يكون أكبر من صفر.' }
      }

      const balance = Number(customer.balance_due)
      if (amount > balance) {
        return {
          ok: false,
          message: 'مبلغ التسديد أكبر من رصيد الدين المستحق.',
        }
      }

      const nextBalance = roundMoney(balance - amount)
      const { data, error } = await supabase
        .from('customers')
        .update({ balance_due: nextBalance })
        .eq('id', customerId)
        .select('*')
        .single()

      if (error || !data) {
        console.error('[customers] payment:', error?.message)
        return { ok: false, message: mapError(error, 'تعذر تسجيل التسديد.') }
      }

      upsertCustomer(data)
      return { ok: true, data }
    } catch (error) {
      console.error('[customers] payment unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء تسجيل التسديد.' }
    } finally {
      isSaving.value = false
    }
  }

  return {
    customers,
    isLoading,
    isSaving,
    totalReceivables,
    upsertCustomer,
    getById,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    recordPayment,
  }
})
