import { supabase } from '@/lib/supabase'
import { useInventoryStore } from '@/stores/inventory'

export function useProducts() {
  const inventory = useInventoryStore()

  async function loadCatalog(): Promise<{ ok: true } | { ok: false; message: string }> {
    inventory.isLoading = true

    try {
      const [categoriesResult, productsResult] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('name'),
      ])

      if (categoriesResult.error) {
        console.error('[useProducts] categories:', categoriesResult.error.message)
        return { ok: false, message: 'تعذر تحميل التصنيفات.' }
      }

      if (productsResult.error) {
        console.error('[useProducts] products:', productsResult.error.message)
        return { ok: false, message: 'تعذر تحميل المنتجات.' }
      }

      inventory.setCategories(categoriesResult.data ?? [])
      inventory.setProducts(productsResult.data ?? [])
      return { ok: true }
    } catch (error) {
      console.error('[useProducts] unexpected error:', error)
      return { ok: false, message: 'حدث خطأ أثناء تحميل بيانات نقطة البيع.' }
    } finally {
      inventory.isLoading = false
    }
  }

  return {
    loadCatalog,
  }
}
