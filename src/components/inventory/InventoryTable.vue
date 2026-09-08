<script setup lang="ts">
import { Package, Pencil } from '@lucide/vue'
import MoneyAmount from '@/components/ui/MoneyAmount.vue'
import { formatStockLabel, formatStockLabelShort } from '@/utils/stockUnits'
import type { Category, Product } from '@/types/database.types'

defineProps<{
  products: Product[]
  categories: Category[]
  categoryId: string | null
  categoryName: (categoryId: string | null) => string
  isBusy?: boolean
}>()

const emit = defineEmits<{
  'update:categoryId': [value: string | null]
  edit: [product: Product]
  toggleActive: [product: Product]
}>()

function isLowStock(product: Product): boolean {
  return product.stock_quantity <= product.min_stock_alert
}

function stockLabel(product: Product): string {
  return formatStockLabelShort(product.stock_quantity, product.pieces_per_carton)
}

function stockLabelFull(product: Product): string {
  return formatStockLabel(product.stock_quantity, product.pieces_per_carton)
}
</script>

<template>
  <div
    class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm"
  >
    <div class="min-h-0 flex-1 overflow-auto">
      <table class="w-full min-w-[56rem] border-collapse text-sm">
        <thead
          class="sticky top-0 z-10 border-b border-slate-200/70 bg-slate-50/95 text-[13px] text-slate-900 backdrop-blur-md"
        >
          <tr>
            <th class="w-12 px-3 py-3.5 text-start font-semibold" />
            <th class="px-3 py-3.5 text-start font-semibold tracking-wide">المنتج</th>
            <th class="px-3 py-3.5 text-start font-semibold tracking-wide">
              <div class="flex items-center gap-2">
                <span>القسم</span>
                <select
                  :value="categoryId ?? ''"
                  class="h-7 max-w-[9.5rem] rounded-md border border-slate-300 bg-transparent px-1.5 text-[11px] font-medium text-slate-700 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                  @change="
                    emit(
                      'update:categoryId',
                      ($event.target as HTMLSelectElement).value || null,
                    )
                  "
                >
                  <option value="">الكل</option>
                  <option
                    v-for="category in categories"
                    :key="category.id"
                    :value="category.id"
                  >
                    {{ category.name }}
                  </option>
                </select>
              </div>
            </th>
            <th class="px-3 py-3.5 text-center font-semibold tracking-wide">سعر البيع</th>
            <th class="px-3 py-3.5 text-center font-semibold tracking-wide">التكلفة</th>
            <th class="px-3 py-3.5 text-start font-semibold tracking-wide">المخزون</th>
            <th class="px-3 py-3.5 text-center font-semibold tracking-wide">ق/ك</th>
            <th class="px-3 py-3.5 text-center font-semibold tracking-wide">التنبيه</th>
            <th class="px-3 py-3.5 text-center font-semibold tracking-wide">الحالة</th>
            <th class="px-3 py-3.5 text-end font-semibold tracking-wide">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="products.length === 0">
            <td colspan="10" class="px-4 py-16 text-center">
              <div class="mx-auto flex max-w-xs flex-col items-center gap-2">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500"
                >
                  <Package class="h-6 w-6" :stroke-width="1.75" />
                </div>
                <p class="text-sm text-slate-500">
                  لا توجد منتجات مطابقة للبحث أو التصفية
                </p>
              </div>
            </td>
          </tr>
          <tr
            v-for="product in products"
            :key="product.id"
            class="border-b border-slate-100 transition hover:bg-brand-50/40 last:border-0"
          >
            <td class="px-3 py-2.5 align-middle">
              <div
                class="flex h-10 w-10 overflow-hidden rounded-lg border border-slate-200/70 bg-slate-50 shadow-sm"
              >
                <img
                  v-if="product.image_url"
                  :src="product.image_url"
                  :alt="product.name"
                  class="h-full w-full object-cover"
                  loading="lazy"
                />
                <div
                  v-else
                  class="flex h-full w-full items-center justify-center text-slate-300"
                >
                  <Package class="h-4 w-4" :stroke-width="1.5" />
                </div>
              </div>
            </td>
            <td class="px-3 py-2.5 align-middle">
              <div class="min-w-0">
                <p class="truncate font-medium text-slate-900">{{ product.name }}</p>
                <p
                  v-if="isLowStock(product)"
                  class="mt-0.5 inline-flex rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800"
                >
                  مخزون منخفض
                </p>
              </div>
            </td>
            <td class="px-3 py-2.5 align-middle text-slate-600">
              {{ categoryName(product.category_id) || '—' }}
            </td>
            <td class="px-3 py-2.5 align-middle text-center font-medium text-blue-700">
              <MoneyAmount :amount="Number(product.price)" />
            </td>
            <td class="px-3 py-2.5 align-middle text-center text-slate-600">
              <MoneyAmount :amount="Number(product.cost_price)" />
            </td>
            <td
              class="px-3 py-2.5 align-middle"
              :title="`${stockLabelFull(product)} — ${product.stock_quantity} قطعة`"
            >
              <p
                class="font-medium"
                :class="isLowStock(product) ? 'text-amber-800' : 'text-slate-900'"
              >
                {{ stockLabel(product) }}
              </p>
              <p class="text-xs tabular-nums text-slate-400">
                {{ product.stock_quantity }} ق
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
                class="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium shadow-sm transition disabled:opacity-60"
                :class="
                  product.is_active
                    ? 'border border-emerald-200/80 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border border-slate-200/70 bg-slate-100 text-slate-500 hover:bg-slate-200'
                "
                :disabled="isBusy"
                :title="product.is_active ? 'إيقاف المنتج' : 'تفعيل المنتج'"
                @click="emit('toggleActive', product)"
              >
                {{ product.is_active ? 'نشط' : 'موقوف' }}
              </button>
            </td>
            <td class="px-3 py-2.5 align-middle">
              <div class="flex items-center justify-end">
                <button
                  type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-orange-500 transition hover:bg-orange-50 hover:text-orange-600 disabled:opacity-60"
                  :disabled="isBusy"
                  title="تعديل"
                  aria-label="تعديل"
                  @click="emit('edit', product)"
                >
                  <Pencil class="h-4 w-4" :stroke-width="1.75" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
