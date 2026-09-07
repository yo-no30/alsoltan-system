<script setup lang="ts">
import type { Product } from '@/types/database.types'

defineProps<{
  product: Product
}>()

const emit = defineEmits<{
  add: []
}>()

function formatPrice(value: number): string {
  return value.toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
</script>

<template>
  <button
    type="button"
    class="flex min-h-[6.25rem] flex-col justify-between rounded-lg border border-slate-200/70 bg-white p-2.5 text-start shadow-sm transition hover:border-brand-200 hover:bg-brand-50/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
    :disabled="product.stock_quantity <= 0"
    @click="emit('add')"
  >
    <div>
      <p class="line-clamp-2 text-xs font-semibold text-slate-900">
        {{ product.name }}
      </p>
      <p class="mt-1.5 text-sm font-bold text-brand-700">
        {{ formatPrice(product.price) }}
        <span class="text-[11px] font-medium text-slate-500">ر.ي</span>
      </p>
    </div>
    <span
      class="mt-2 inline-flex w-fit rounded px-1.5 py-0.5 text-[11px] font-medium"
      :class="
        product.stock_quantity <= product.min_stock_alert
          ? 'bg-amber-50 text-amber-700'
          : 'bg-slate-100 text-slate-600'
      "
    >
      المخزون: {{ product.stock_quantity }}
    </span>
  </button>
</template>
