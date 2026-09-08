<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Plus, RefreshCw } from '@lucide/vue'
import SuppliersTable from '@/components/suppliers/SuppliersTable.vue'
import SupplierFormModal from '@/components/suppliers/SupplierFormModal.vue'
import SupplierPaymentModal from '@/components/suppliers/SupplierPaymentModal.vue'
import MoneyAmount from '@/components/ui/MoneyAmount.vue'
import { useSuppliersStore } from '@/stores/suppliers'
import { useToast } from '@/stores/toast'
import type { Supplier } from '@/types/database.types'

const suppliersStore = useSuppliersStore()
const toast = useToast()

const formOpen = ref(false)
const paymentOpen = ref(false)
const editing = ref<Supplier | null>(null)
const paying = ref<Supplier | null>(null)

async function load(): Promise<void> {
  const result = await suppliersStore.fetchSuppliers()
  if (!result.ok) toast.error(result.message)
}

function openCreate(): void {
  editing.value = null
  formOpen.value = true
}

function openEdit(supplier: Supplier): void {
  editing.value = supplier
  formOpen.value = true
}

function openPay(supplier: Supplier): void {
  paying.value = supplier
  paymentOpen.value = true
}

async function onSave(payload: {
  name: string
  phone: string | null
}): Promise<void> {
  const result = editing.value
    ? await suppliersStore.updateSupplier(editing.value.id, payload)
    : await suppliersStore.createSupplier(payload)

  if (!result.ok) {
    toast.error(result.message)
    return
  }

  toast.success(editing.value ? 'تم تحديث المورد' : 'تم إضافة المورد')
  formOpen.value = false
}

async function onPay(amount: number): Promise<void> {
  if (!paying.value) return
  const result = await suppliersStore.recordPayment(paying.value.id, amount)
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
          الموردين
        </h1>
        <p class="mt-1 text-sm text-slate-500">
          دليل الموردين وتتبع الديون المستحقة
          <span
            v-if="suppliersStore.totalDebt > 0"
            class="ms-2 font-medium text-amber-700"
          >
            (إجمالي الديون: <MoneyAmount :amount="suppliersStore.totalDebt" />)
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
          إضافة مورد
        </button>
      </div>
    </header>

    <div
      v-if="suppliersStore.isLoading"
      class="rounded-2xl border border-slate-200/70 bg-white p-10 text-center text-sm text-slate-400 shadow-sm"
    >
      جاري تحميل الموردين...
    </div>
    <SuppliersTable
      v-else
      :suppliers="suppliersStore.suppliers"
      :is-busy="suppliersStore.isSaving"
      @edit="openEdit"
      @pay="openPay"
    />

    <SupplierFormModal
      :open="formOpen"
      :supplier="editing"
      :is-saving="suppliersStore.isSaving"
      @close="formOpen = false"
      @save="onSave"
    />

    <SupplierPaymentModal
      :open="paymentOpen"
      :supplier="paying"
      :is-saving="suppliersStore.isSaving"
      @close="paymentOpen = false"
      @save="onPay"
    />
  </div>
</template>
