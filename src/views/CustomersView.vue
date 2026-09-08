<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Plus, RefreshCw } from '@lucide/vue'
import CustomersTable from '@/components/customers/CustomersTable.vue'
import CustomerFormModal from '@/components/customers/CustomerFormModal.vue'
import CustomerPaymentModal from '@/components/customers/CustomerPaymentModal.vue'
import MoneyAmount from '@/components/ui/MoneyAmount.vue'
import { useCustomersStore } from '@/stores/customers'
import { useToast } from '@/stores/toast'
import type { Customer } from '@/types/database.types'

const customersStore = useCustomersStore()
const toast = useToast()

const formOpen = ref(false)
const paymentOpen = ref(false)
const editing = ref<Customer | null>(null)
const paying = ref<Customer | null>(null)

async function load(): Promise<void> {
  const result = await customersStore.fetchCustomers()
  if (!result.ok) toast.error(result.message)
}

function openCreate(): void {
  editing.value = null
  formOpen.value = true
}

function openEdit(customer: Customer): void {
  editing.value = customer
  formOpen.value = true
}

function openPay(customer: Customer): void {
  paying.value = customer
  paymentOpen.value = true
}

async function onSave(payload: {
  name: string
  phone: string | null
  notes: string | null
}): Promise<void> {
  const result = editing.value
    ? await customersStore.updateCustomer(editing.value.id, payload)
    : await customersStore.createCustomer(payload)

  if (!result.ok) {
    toast.error(result.message)
    return
  }

  toast.success(editing.value ? 'تم تحديث العميل' : 'تم إضافة العميل')
  formOpen.value = false
}

async function onPay(amount: number): Promise<void> {
  if (!paying.value) return
  const result = await customersStore.recordPayment(paying.value.id, amount)
  if (!result.ok) {
    toast.error(result.message)
    return
  }
  toast.success('تم تسجيل التسديد')
  paymentOpen.value = false
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-3">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-slate-900">
          العملاء
        </h1>
        <p class="mt-1 text-sm text-slate-500">
          بيانات العملاء وتتبع المبيعات الآجلة
          <span
            v-if="customersStore.totalReceivables > 0"
            class="ms-2 font-medium text-amber-700"
          >
            (إجمالي الذمم:
            <MoneyAmount :amount="customersStore.totalReceivables" />)
          </span>
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/70 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          @click="load"
        >
          <RefreshCw class="h-4 w-4" :stroke-width="1.75" />
          تحديث
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
          @click="openCreate"
        >
          <Plus class="h-4 w-4" :stroke-width="2" />
          إضافة عميل
        </button>
      </div>
    </header>

    <div
      v-if="customersStore.isLoading"
      class="rounded-2xl border border-slate-200/70 bg-white p-10 text-center text-sm text-slate-400 shadow-sm"
    >
      جاري تحميل العملاء...
    </div>
    <CustomersTable
      v-else
      :customers="customersStore.customers"
      :is-busy="customersStore.isSaving"
      @edit="openEdit"
      @pay="openPay"
    />

    <CustomerFormModal
      :open="formOpen"
      :customer="editing"
      :is-saving="customersStore.isSaving"
      @close="formOpen = false"
      @save="onSave"
    />

    <CustomerPaymentModal
      :open="paymentOpen"
      :customer="paying"
      :is-saving="customersStore.isSaving"
      @close="paymentOpen = false"
      @save="onPay"
    />
  </div>
</template>
