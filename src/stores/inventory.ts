import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type {
  Category,
  CategoryInsert,
  CategoryUpdate,
  Product,
  ProductInsert,
  ProductUpdate,
} from '@/types/database.types'

export type StoreResult<T = void> =
  | ({ ok: true } & (T extends void ? object : { data: T }))
  | { ok: false; message: string }

function mapError(error: { message?: string } | null, fallback: string): string {
  return error?.message?.trim() || fallback
}

export const useInventoryStore = defineStore('inventory', () => {
  const products = ref<Product[]>([])
  const categories = ref<Category[]>([])
  const isLoading = ref(false)
  const isSaving = ref(false)

  const activeProducts = computed(() =>
    products.value.filter((product) => product.is_active),
  )

  const lowStockProducts = computed(() =>
    products.value.filter(
      (product) => product.stock_quantity <= product.min_stock_alert,
    ),
  )

  function setProducts(next: Product[]): void {
    products.value = next
  }

  function setCategories(next: Category[]): void {
    categories.value = next
  }

  function upsertProduct(product: Product): void {
    const index = products.value.findIndex((entry) => entry.id === product.id)
    if (index === -1) {
      products.value.push(product)
      return
    }
    products.value[index] = product
  }

  function upsertCategory(category: Category): void {
    const index = categories.value.findIndex((entry) => entry.id === category.id)
    if (index === -1) {
      categories.value.push(category)
      categories.value.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
      return
    }
    categories.value[index] = category
    categories.value.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  }

  function removeProduct(productId: string): void {
    products.value = products.value.filter((product) => product.id !== productId)
  }

  function clearInventory(): void {
    products.value = []
    categories.value = []
  }

  function categoryName(categoryId: string | null): string {
    if (!categoryId) return '—'
    return categories.value.find((entry) => entry.id === categoryId)?.name ?? '—'
  }

  async function fetchCatalog(): Promise<StoreResult> {
    isLoading.value = true
    try {
      const [categoriesResult, productsResult] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('products').select('*').order('name'),
      ])

      if (categoriesResult.error) {
        console.error('[inventory] categories:', categoriesResult.error.message)
        return {
          ok: false,
          message: mapError(categoriesResult.error, 'تعذر تحميل الأقسام.'),
        }
      }

      if (productsResult.error) {
        console.error('[inventory] products:', productsResult.error.message)
        return {
          ok: false,
          message: mapError(productsResult.error, 'تعذر تحميل المنتجات.'),
        }
      }

      setCategories(categoriesResult.data ?? [])
      setProducts(productsResult.data ?? [])
      return { ok: true }
    } catch (error) {
      console.error('[inventory] fetchCatalog unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء تحميل المخزون.' }
    } finally {
      isLoading.value = false
    }
  }

  async function createCategory(
    payload: CategoryInsert,
  ): Promise<StoreResult<Category>> {
    isSaving.value = true
    try {
      const name = payload.name.trim()
      if (!name) {
        return { ok: false, message: 'اسم القسم مطلوب.' }
      }

      const { data, error } = await supabase
        .from('categories')
        .insert({ name })
        .select('*')
        .single()

      if (error || !data) {
        console.error('[inventory] createCategory:', error?.message)
        return {
          ok: false,
          message: mapError(error, 'تعذر إضافة القسم.'),
        }
      }

      upsertCategory(data)
      return { ok: true, data }
    } catch (error) {
      console.error('[inventory] createCategory unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء إضافة القسم.' }
    } finally {
      isSaving.value = false
    }
  }

  async function updateCategory(
    id: string,
    payload: CategoryUpdate,
  ): Promise<StoreResult<Category>> {
    isSaving.value = true
    try {
      const name = payload.name?.trim()
      if (!name) {
        return { ok: false, message: 'اسم القسم مطلوب.' }
      }

      const { data, error } = await supabase
        .from('categories')
        .update({ name })
        .eq('id', id)
        .select('*')
        .single()

      if (error || !data) {
        console.error('[inventory] updateCategory:', error?.message)
        return {
          ok: false,
          message: mapError(error, 'تعذر تحديث القسم.'),
        }
      }

      upsertCategory(data)
      return { ok: true, data }
    } catch (error) {
      console.error('[inventory] updateCategory unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء تحديث القسم.' }
    } finally {
      isSaving.value = false
    }
  }

  async function createProduct(
    payload: ProductInsert,
  ): Promise<StoreResult<Product>> {
    isSaving.value = true
    try {
      const name = payload.name.trim()
      if (!name) {
        return { ok: false, message: 'اسم المنتج مطلوب.' }
      }
      if (payload.price < 0 || payload.cost_price < 0) {
        return { ok: false, message: 'الأسعار يجب أن تكون صفر أو أكثر.' }
      }

      const insertPayload: ProductInsert = {
        name,
        price: payload.price,
        cost_price: payload.cost_price,
        category_id: payload.category_id ?? null,
        stock_quantity: payload.stock_quantity ?? 0,
        min_stock_alert: payload.min_stock_alert ?? 5,
        is_active: payload.is_active ?? true,
      }

      if ((insertPayload.stock_quantity ?? 0) < 0 || (insertPayload.min_stock_alert ?? 0) < 0) {
        return { ok: false, message: 'كميات المخزون يجب أن تكون صفر أو أكثر.' }
      }

      const { data, error } = await supabase
        .from('products')
        .insert(insertPayload)
        .select('*')
        .single()

      if (error || !data) {
        console.error('[inventory] createProduct:', error?.message)
        return {
          ok: false,
          message: mapError(error, 'تعذر إضافة المنتج.'),
        }
      }

      upsertProduct(data)
      return { ok: true, data }
    } catch (error) {
      console.error('[inventory] createProduct unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء إضافة المنتج.' }
    } finally {
      isSaving.value = false
    }
  }

  async function updateProduct(
    id: string,
    payload: ProductUpdate,
  ): Promise<StoreResult<Product>> {
    isSaving.value = true
    try {
      if (payload.name !== undefined && !payload.name.trim()) {
        return { ok: false, message: 'اسم المنتج مطلوب.' }
      }
      if (
        (payload.price !== undefined && payload.price < 0) ||
        (payload.cost_price !== undefined && payload.cost_price < 0) ||
        (payload.stock_quantity !== undefined && payload.stock_quantity < 0) ||
        (payload.min_stock_alert !== undefined && payload.min_stock_alert < 0)
      ) {
        return { ok: false, message: 'القيم الرقمية يجب أن تكون صفر أو أكثر.' }
      }

      const updatePayload: ProductUpdate = {
        ...payload,
        name: payload.name?.trim(),
      }

      const { data, error } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single()

      if (error || !data) {
        console.error('[inventory] updateProduct:', error?.message)
        return {
          ok: false,
          message: mapError(error, 'تعذر تحديث المنتج.'),
        }
      }

      upsertProduct(data)
      return { ok: true, data }
    } catch (error) {
      console.error('[inventory] updateProduct unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء تحديث المنتج.' }
    } finally {
      isSaving.value = false
    }
  }

  async function toggleProductActive(
    id: string,
  ): Promise<StoreResult<Product>> {
    const product = products.value.find((entry) => entry.id === id)
    if (!product) {
      return { ok: false, message: 'المنتج غير موجود.' }
    }
    return updateProduct(id, { is_active: !product.is_active })
  }

  async function adjustStock(
    productId: string,
    newQuantity: number,
  ): Promise<StoreResult<Product>> {
    if (!Number.isFinite(newQuantity) || newQuantity < 0) {
      return { ok: false, message: 'كمية المخزون غير صالحة.' }
    }
    return updateProduct(productId, {
      stock_quantity: Math.floor(newQuantity),
    })
  }

  return {
    products,
    categories,
    isLoading,
    isSaving,
    activeProducts,
    lowStockProducts,
    setProducts,
    setCategories,
    upsertProduct,
    upsertCategory,
    removeProduct,
    clearInventory,
    categoryName,
    fetchCatalog,
    createCategory,
    updateCategory,
    createProduct,
    updateProduct,
    toggleProductActive,
    adjustStock,
  }
})
