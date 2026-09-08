<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Plus, FolderTree, RefreshCw } from '@lucide/vue'
import InventoryFilters from '@/components/inventory/InventoryFilters.vue'
import InventoryTable from '@/components/inventory/InventoryTable.vue'
import ProductFormModal from '@/components/inventory/ProductFormModal.vue'
import CategoryFormModal from '@/components/inventory/CategoryFormModal.vue'
import { useInventoryStore } from '@/stores/inventory'
import { useToast } from '@/stores/toast'
import type { Product } from '@/types/database.types'

const inventory = useInventoryStore()
const toast = useToast()

const search = ref('')
const categoryId = ref<string | null>(null)
const lowStockOnly = ref(false)

const productModalOpen = ref(false)
const categoryModalOpen = ref(false)
const editingProduct = ref<Product | null>(null)

const filteredProducts = computed(() => {
  const query = search.value.trim().toLowerCase()
  return inventory.products.filter((product) => {
    if (categoryId.value && product.category_id !== categoryId.value) {
      return false
    }
    if (lowStockOnly.value && product.stock_quantity > product.min_stock_alert) {
      return false
    }
    if (!query) return true
    return product.name.toLowerCase().includes(query)
  })
})

const stats = computed(() => {
  const all = inventory.products
  return {
    total: all.length,
    lowStock: all.filter((p) => p.stock_quantity <= p.min_stock_alert).length,
    shown: filteredProducts.value.length,
  }
})

async function load(): Promise<void> {
  const result = await inventory.fetchCatalog()
  if (!result.ok) toast.error(result.message)
}

function openCreateProduct(): void {
  editingProduct.value = null
  productModalOpen.value = true
}

function openEditProduct(product: Product): void {
  editingProduct.value = product
  productModalOpen.value = true
}

async function onSaveProduct(payload: {
  name: string
  category_id: string | null
  price: number
  cost_price: number
  stock_quantity: number
  min_stock_alert: number
  pieces_per_carton: number
  is_active: boolean
  image_url: string | null
  imageFile: File | null
  clearImage: boolean
}): Promise<void> {
  const { imageFile, clearImage, image_url, ...productFields } = payload

  const result = editingProduct.value
    ? await inventory.updateProduct(editingProduct.value.id, {
        ...productFields,
        ...(imageFile || clearImage ? {} : { image_url }),
      })
    : await inventory.createProduct({
        ...productFields,
        image_url: imageFile ? null : image_url,
      })

  if (!result.ok) {
    toast.error(result.message)
    return
  }

  const productId = result.data.id

  if (imageFile) {
    const imageResult = await inventory.uploadProductImage(productId, imageFile)
    if (!imageResult.ok) {
      toast.error(imageResult.message)
      return
    }
  } else if (clearImage && editingProduct.value) {
    const clearResult = await inventory.clearProductImage(productId)
    if (!clearResult.ok) {
      toast.error(clearResult.message)
      return
    }
  }

  toast.success(editingProduct.value ? 'تم تحديث المنتج' : 'تم إضافة المنتج')
  productModalOpen.value = false
}

async function onCreateCategory(name: string): Promise<void> {
  const result = await inventory.createCategory({ name })
  if (!result.ok) {
    toast.error(result.message)
    return
  }
  toast.success('تم إضافة القسم')
}

async function onUpdateCategory(id: string, name: string): Promise<void> {
  const result = await inventory.updateCategory(id, { name })
  if (!result.ok) {
    toast.error(result.message)
    return
  }
  toast.success('تم تحديث القسم')
}

async function onToggleActive(product: Product): Promise<void> {
  const result = await inventory.toggleProductActive(product.id)
  if (!result.ok) {
    toast.error(result.message)
    return
  }
  toast.success(result.data.is_active ? 'تم تفعيل المنتج' : 'تم إيقاف المنتج')
}

onMounted(() => {
  void load()
})
</script>

<template>
  <section
    class="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-slate-200/70 bg-white p-3 shadow-sm sm:gap-3.5 sm:p-4"
  >
    <div class="flex shrink-0 flex-wrap items-center justify-between gap-2">
      <p class="text-xs text-slate-500">
        عرض
        <span class="font-semibold text-slate-800">{{ stats.shown }}</span>
        من
        <span class="font-semibold text-slate-800">{{ stats.total }}</span>
        منتج
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/70 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          :disabled="inventory.isLoading"
          @click="load"
        >
          <RefreshCw
            class="h-4 w-4"
            :class="inventory.isLoading ? 'animate-spin' : ''"
            :stroke-width="1.75"
          />
          تحديث
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/70 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          @click="categoryModalOpen = true"
        >
          <FolderTree class="h-4 w-4" :stroke-width="1.75" />
          الأقسام
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-brand-500/25 transition hover:bg-brand-600"
          @click="openCreateProduct"
        >
          <Plus class="h-4 w-4" :stroke-width="2" />
          منتج جديد
        </button>
      </div>
    </div>

    <InventoryFilters
      v-model:search="search"
      v-model:low-stock-only="lowStockOnly"
      :low-stock-count="stats.lowStock"
    />

    <div class="min-h-0 flex-1 overflow-hidden">
      <div
        v-if="inventory.isLoading"
        class="flex h-full min-h-48 items-center justify-center rounded-xl border border-slate-200/70 bg-white/90 text-sm text-slate-400 shadow-sm"
      >
        جاري تحميل المخزون...
      </div>
      <InventoryTable
        v-else
        v-model:category-id="categoryId"
        :products="filteredProducts"
        :categories="inventory.categories"
        :category-name="inventory.categoryName"
        :is-busy="inventory.isSaving"
        @edit="openEditProduct"
        @toggle-active="onToggleActive"
      />
    </div>

    <ProductFormModal
      :open="productModalOpen"
      :product="editingProduct"
      :categories="inventory.categories"
      :is-saving="inventory.isSaving"
      @close="productModalOpen = false"
      @save="onSaveProduct"
    />

    <CategoryFormModal
      :open="categoryModalOpen"
      :categories="inventory.categories"
      :is-saving="inventory.isSaving"
      @close="categoryModalOpen = false"
      @create="onCreateCategory"
      @update="onUpdateCategory"
    />
  </section>
</template>
