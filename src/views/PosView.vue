<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CategoryBar from '@/components/pos/CategoryBar.vue'
import ProductSearch from '@/components/pos/ProductSearch.vue'
import ProductGrid from '@/components/pos/ProductGrid.vue'
import CartPanel from '@/components/pos/CartPanel.vue'
import ThermalReceipt from '@/components/pos/ThermalReceipt.vue'
import { useProducts } from '@/composables/useProducts'
import { useSales } from '@/composables/useSales'
import { useOfflineSync } from '@/composables/useOfflineSync'
import { useCartStore } from '@/stores/cart'
import { useInventoryStore } from '@/stores/inventory'
import { useOfflineQueueStore } from '@/stores/offlineQueue'
import { useToast } from '@/stores/toast'
import type { Product, SalePaymentType } from '@/types/database.types'
import { formatStockLabel } from '@/utils/stockUnits'

const cart = useCartStore()
const inventory = useInventoryStore()
const offlineQueue = useOfflineQueueStore()
const toast = useToast()
const { loadCatalog } = useProducts()
const { completeSale, isCompleting, lastReceipt } = useSales()
useOfflineSync()

const selectedCategoryId = ref<string | null>(null)
const searchQuery = ref('')
const searchRef = ref<{ focusInput: () => void } | null>(null)

const filteredProducts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return inventory.activeProducts.filter((product) => {
    if (
      selectedCategoryId.value &&
      product.category_id !== selectedCategoryId.value
    ) {
      return false
    }

    if (!query) return true
    return product.name.toLowerCase().includes(query)
  })
})

function focusSearch(): void {
  searchRef.value?.focusInput()
}

function addProduct(product: Product): void {
  if (product.stock_quantity <= 0) {
    toast.warning(`نفد مخزون ${product.name}`)
    return
  }

  const existing = cart.lines.find((line) => line.productId === product.id)
  const nextQty = (existing?.quantity ?? 0) + 1
  if (nextQty > product.stock_quantity) {
    toast.warning(
      `المخزون المتاح لـ ${product.name}: ${formatStockLabel(product.stock_quantity, product.pieces_per_carton)}`,
    )
    return
  }

  cart.addItem({
    productId: product.id,
    name: product.name,
    unitPrice: Number(product.price),
  })
  focusSearch()
}

async function onCheckout(payload: {
  paymentType: SalePaymentType
  customerId: string | null
}): Promise<void> {
  const result = await completeSale({
    paymentType: payload.paymentType,
    customerId: payload.customerId,
  })
  if (!result.ok) {
    toast.error(result.message)
    return
  }
  focusSearch()
}

onMounted(async () => {
  const result = await loadCatalog()
  if (!result.ok) {
    toast.error(result.message)
  }
  focusSearch()
})
</script>

<template>
  <div class="pos-screen flex min-h-0 flex-1 flex-col gap-3 lg:flex-row" dir="rtl">
    <div
      v-if="cart.lines.length > 0"
      class="order-1 flex w-full shrink-0 flex-col lg:order-2 lg:w-[22rem] xl:w-[24rem]"
    >
      <div
        v-if="offlineQueue.queueLength > 0"
        class="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800"
      >
        فواتير بانتظار المزامنة: {{ offlineQueue.queueLength }}
      </div>
      <div class="min-h-0 flex-1 lg:min-h-0">
        <CartPanel
          class="h-auto max-h-[min(52vh,28rem)] lg:h-full lg:max-h-none"
          :is-submitting="isCompleting"
          @checkout="onCheckout"
          @focus-search="focusSearch"
        />
      </div>
    </div>

    <div
      v-else-if="offlineQueue.queueLength > 0"
      class="order-1 w-full shrink-0 lg:order-2 lg:w-[22rem] xl:w-[24rem]"
    >
      <div
        class="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800"
      >
        فواتير بانتظار المزامنة: {{ offlineQueue.queueLength }}
      </div>
    </div>

    <section
      class="order-2 flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 rounded-xl border border-slate-200/70 bg-white/80 p-3 shadow-sm backdrop-blur-md lg:order-1"
    >
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <h1 class="text-sm font-semibold text-slate-900">نقطة البيع</h1>
          <span class="text-[11px] text-slate-500">
            {{ filteredProducts.length }} منتج
          </span>
        </div>
        <ProductSearch
          ref="searchRef"
          v-model="searchQuery"
        />
        <CategoryBar
          :categories="inventory.categories"
          :selected-category-id="selectedCategoryId"
          @select="selectedCategoryId = $event"
        />
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain pe-1">
        <ProductGrid
          :products="filteredProducts"
          :is-loading="inventory.isLoading"
          :invoice-open="cart.lines.length > 0"
          @add="addProduct"
        />
      </div>
    </section>

    <ThermalReceipt :receipt="lastReceipt" />
  </div>
</template>
