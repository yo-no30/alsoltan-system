<script setup lang="ts">
import { formatStockLabel } from '@/utils/stockUnits'
import type { Product } from '@/types/database.types'

defineProps<{
  products: Product[]
  categoryName: (categoryId: string | null) => string
  isBusy?: boolean
}>()

const emit = defineEmits<{
  edit: [product: Product]
  adjustStock: [product: Product]
  toggleActive: [product: Product]
}>()

function formatMoney(value: number): string {
  return Number(value).toLocaleString('ar-SA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function isLowStock(product: Product): boolean {
  return product.stock_quantity <= product.min_stock_alert
}

function stockLabel(product: Product): string {
  return formatStockLabel(product.stock_quantity, product.pieces_per_carton)
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
    <div class="min-h-0 flex-1 overflow-auto">
      <table class="w-full min-w-[56rem] border-collapse text-sm">
        <thead class="sticky top-0 z-10 bg-slate-50 text-xs text-slate-500">
          <tr class="border-b border-slate-200">
            <th class="w-12 px-3 py-2.5 text-start font-medium" />
            <th class="px-3 py-2.5 text-start font-medium">المنتج</th>
            <th class="px-3 py-2.5 text-start font-medium">القسم</th>
            <th class="px-3 py-2.5 text-end font-medium">سعر البيع</th>
            <th class="px-3 py-2.5 text-end font-medium">التكلفة</th>
            <th class="px-3 py-2.5 text-start font-medium">المخزون</th>
            <th class="px-3 py-2.5 text-center font-medium">ق/ك</th>
            <th class="px-3 py-2.5 text-center font-medium">التنبيه</th>
            <th class="px-3 py-2.5 text-center font-medium">الحالة</th>
            <th class="px-3 py-2.5 text-end font-medium">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="products.length === 0">
            <td colspan="10" class="px-4 py-16 text-center text-slate-400">
              لا توجد منتجات مطابقة للبحث أو التصفية
            </td>
          </tr>
          <tr
            v-for="product in products"
            :key="product.id"
            class="border-b border-slate-100 transition hover:bg-slate-50/80 last:border-0"
          >
            <td class="px-3 py-2.5 align-middle">
              <div
                class="flex h-10 w-10 overflow-hidden rounded-md border border-slate-200 bg-slate-50"
              >
                <img
                  v-if="product.image_url"
                  :src="product.image_url"
                  :alt="product.name"
                  class="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            </td>
            <td class="px-3 py-2.5 align-middle">
              <div class="min-w-0">
                <p class="truncate font-medium text-slate-900">{{ product.name }}</p>
                <p
                  v-if="isLowStock(product)"
                  class="mt-0.5 text-xs font-medium text-amber-700"
                >
                  مخزون منخفض
                </p>
              </div>
            </td>
            <td class="px-3 py-2.5 align-middle text-slate-600">
              {{ categoryName(product.category_id) || '—' }}
            </td>
            <td class="px-3 py-2.5 align-middle text-end tabular-nums text-slate-900">
              {{ formatMoney(product.price) }}
            </td>
            <td class="px-3 py-2.5 align-middle text-end tabular-nums text-slate-600">
              {{ formatMoney(product.cost_price) }}
            </td>
            <td class="px-3 py-2.5 align-middle">
              <p class="font-medium text-slate-900">{{ stockLabel(product) }}</p>
              <p class="text-xs tabular-nums text-slate-400">
                {{ product.stock_quantity }} قطعة
              </p>
            </td>
            <td class="px-3 py-2.5 align-middle text-center tabular-nums text-slate-600">
              {{ product.pieces_per_carton }}
            </td>
            <td class="px-3 py-2.5 align-middle text-center tabular-nums text-slate-600">
              {{ product.min_stock_alert }}
            </td>
            <td class="px-3 py-2.5 align-middle text-center">
              <button
                type="button"
                class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium transition disabled:opacity-60"
                :class="
                  product.is_active
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                "
                :disabled="isBusy"
                :title="product.is_active ? 'إيقاف المنتج' : 'تفعيل المنتج'"
                @click="emit('toggleActive', product)"
              >
                {{ product.is_active ? 'نشط' : 'موقوف' }}
              </button>
            </td>
            <td class="px-3 py-2.5 align-middle">
              <div class="flex items-center justify-end gap-3">
                <button
                  type="button"
                  class="text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline disabled:opacity-60"
                  :disabled="isBusy"
                  @click="emit('edit', product)"
                >
                  تعديل
                </button>
                <button
                  type="button"
                  class="text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline disabled:opacity-60"
                  :disabled="isBusy"
                  @click="emit('adjustStock', product)"
                >
                  مخزون
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
