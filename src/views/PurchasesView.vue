<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Plus, RefreshCw } from '@lucide/vue'
import PurchaseHistoryTable from '@/components/purchases/PurchaseHistoryTable.vue'
import PurchaseFormModal from '@/components/purchases/PurchaseFormModal.vue'
import { useInventoryStore } from '@/stores/inventory'
import { usePurchasesStore, type CreatePurchaseInput } from '@/stores/purchases'
import { useSuppliersStore } from '@/stores/suppliers'
import { useToast } from '@/stores/toast'

const purchasesStore = usePurchasesStore()
const suppliersStore = useSuppliersStore()
const inventory = useInventoryStore()
const toast = useToast()

const formOpen = ref(false)

async function load(): Promise<void> {
  const [purchasesResult, suppliersResult, catalogResult] = await Promise.all([
    purchasesStore.fetchPurchases(),
    suppliersStore.fetchSuppliers(),
    inventory.fetchCatalog(),
  ])

  if (!purchasesResult.ok) toast.error(purchasesResult.message)
  if (!suppliersResult.ok) toast.error(suppliersResult.message)
  if (!catalogResult.ok) toast.error(catalogResult.message)
}

async function onSave(payload: CreatePurchaseInput): Promise<void> {
  const result = await purchasesStore.createPurchase(payload)
  if (!result.ok) {
    toast.error(result.message)
    return
  }
  toast.success('تم حفظ فاتورة الشراء وتحديث المخزون')
  formOpen.value = false
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-7xl flex-col gap-3">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-slate-900">
          المشتريات
        </h1>
        <p class="mt-1 text-sm text-slate-500">
          فواتير الشراء النقدية والآجلة مع تحديث المخزون والديون
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
          @click="formOpen = true"
        >
          <Plus class="h-4 w-4" :stroke-width="2" />
          فاتورة شراء جديدة
        </button>
      </div>
    </header>

    <div
      v-if="purchasesStore.isLoading"
      class="rounded-2xl border border-slate-200/70 bg-white p-10 text-center text-sm text-slate-400 shadow-sm"
    >
      جاري تحميل فواتير الشراء...
    </div>
    <PurchaseHistoryTable
      v-else
      :purchases="purchasesStore.purchases"
    />

    <PurchaseFormModal
      :open="formOpen"
      :suppliers="suppliersStore.suppliers"
      :products="inventory.products"
      :is-saving="purchasesStore.isSaving"
      @close="formOpen = false"
      @save="onSave"
    />
  </div>
</template>
