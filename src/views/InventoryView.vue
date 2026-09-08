<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Plus, FolderTree, RefreshCw } from '@lucide/vue'
import InventoryFilters from '@/components/inventory/InventoryFilters.vue'
import InventoryTable from '@/components/inventory/InventoryTable.vue'
import ProductFormModal from '@/components/inventory/ProductFormModal.vue'
import CategoryFormModal from '@/components/inventory/CategoryFormModal.vue'
import StockAdjustModal from '@/components/inventory/StockAdjustModal.vue'
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
const stockModalOpen = ref(false)
const editingProduct = ref<Product | null>(null)
const stockProduct = ref<Product | null>(null)

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

function openStock(product: Product): void {
  stockProduct.value = product
  stockModalOpen.value = true
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

async function onAdjustStock(quantity: number): Promise<void> {
  if (!stockProduct.value) return
  const result = await inventory.adjustStock(stockProduct.value.id, quantity)
  if (!result.ok) {
    toast.error(result.message)
    return
  }
  toast.success('تم تحديث المخزون')
  stockModalOpen.value = false
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
  <div class="mx-auto flex w-full max-w-7xl flex-col gap-3">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-slate-900">
          المنتجات والمخزون
        </h1>
        <p class="mt-1 text-sm text-slate-500">
          إدارة الأصناف والكميات وحدود التنبيه
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
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/70 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          @click="categoryModalOpen = true"
        >
          <FolderTree class="h-4 w-4" :stroke-width="1.75" />
          الأقسام
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
          @click="openCreateProduct"
        >
          <Plus class="h-4 w-4" :stroke-width="2" />
          إضافة منتج
        </button>
      </div>
    </header>

    <InventoryFilters
      v-model:search="search"
      v-model:category-id="categoryId"
      v-model:low-stock-only="lowStockOnly"
      :categories="inventory.categories"
    />

    <div
      v-if="inventory.isLoading"
      class="rounded-2xl border border-slate-200/70 bg-white p-10 text-center text-sm text-slate-400 shadow-sm"
    >
      جاري تحميل المخزون...
    </div>
    <InventoryTable
      v-else
      :products="filteredProducts"
      :category-name="inventory.categoryName"
      :is-busy="inventory.isSaving"
      @edit="openEditProduct"
      @adjust-stock="openStock"
      @toggle-active="onToggleActive"
    />

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

    <StockAdjustModal
      :open="stockModalOpen"
      :product="stockProduct"
      :is-saving="inventory.isSaving"
      @close="stockModalOpen = false"
      @save="onAdjustStock"
    />
  </div>
</template>
