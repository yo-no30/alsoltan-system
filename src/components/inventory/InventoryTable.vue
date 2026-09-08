<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
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
    minimumFractionDigits: 2,
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
  <div class="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-sm">
    <table class="min-w-[64rem] text-sm">
      <thead class="border-b border-slate-200/70 bg-slate-50/80 text-slate-600">
        <tr>
          <th class="px-3 py-2 text-start font-medium">الصورة</th>
          <th class="px-3 py-2 text-start font-medium">المنتج</th>
          <th class="px-3 py-2 text-start font-medium">القسم</th>
          <th class="px-3 py-2 text-start font-medium">سعر البيع</th>
          <th class="px-3 py-2 text-start font-medium">سعر التكلفة</th>
          <th class="px-3 py-2 text-start font-medium">المخزون</th>
          <th class="px-3 py-2 text-start font-medium">قطعة/كرتون</th>
          <th class="px-3 py-2 text-start font-medium">حد التنبيه</th>
          <th class="px-3 py-2 text-start font-medium">الحالة</th>
          <th class="px-3 py-2 text-start font-medium">إجراءات</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="products.length === 0">
          <td colspan="10" class="px-4 py-10 text-center text-slate-400">
            لا توجد منتجات مطابقة
          </td>
        </tr>
        <tr
          v-for="product in products"
          :key="product.id"
          class="border-b border-slate-100 last:border-0"
        >
          <td class="px-3 py-2">
            <div
              class="flex h-11 w-11 overflow-hidden rounded-lg border border-slate-200/70 bg-slate-50"
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
          <td class="px-3 py-2 font-medium text-slate-900">
            <div class="flex flex-wrap items-center gap-2">
              <span>{{ product.name }}</span>
              <AppBadge v-if="isLowStock(product)" variant="warning">
                مخزون منخفض
              </AppBadge>
            </div>
          </td>
          <td class="px-3 py-2 text-slate-600">
            {{ categoryName(product.category_id) }}
          </td>
          <td class="px-3 py-2 text-slate-900">{{ formatMoney(product.price) }}</td>
          <td class="px-3 py-2 text-slate-900">{{ formatMoney(product.cost_price) }}</td>
          <td class="px-3 py-2">
            <div class="font-semibold text-slate-900">{{ stockLabel(product) }}</div>
            <div class="text-[11px] text-slate-500">
              {{ product.stock_quantity }} قطعة إجمالاً
            </div>
          </td>
          <td class="px-3 py-2 text-slate-600">{{ product.pieces_per_carton }}</td>
          <td class="px-3 py-2 text-slate-600">{{ product.min_stock_alert }} قطعة</td>
          <td class="px-3 py-2">
            <button
              type="button"
              class="disabled:opacity-60"
              :disabled="isBusy"
              @click="emit('toggleActive', product)"
            >
              <AppBadge :variant="product.is_active ? 'success' : 'muted'">
                {{ product.is_active ? 'نشط' : 'موقوف' }}
              </AppBadge>
            </button>
          </td>
          <td class="px-3 py-2">
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-lg border border-slate-200/70 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                :disabled="isBusy"
                @click="emit('edit', product)"
              >
                تعديل
              </button>
              <button
                type="button"
                class="rounded-lg border border-slate-200/70 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
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
</template>
