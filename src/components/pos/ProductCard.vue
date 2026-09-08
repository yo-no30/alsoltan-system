<script setup lang="ts">
import { ImageOff } from '@lucide/vue'
import type { Product } from '@/types/database.types'

defineProps<{
  product: Product
}>()

const emit = defineEmits<{
  add: []
}>()

function formatPrice(value: number): string {
  return value.toLocaleString('ar-YE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
</script>

<template>
  <button
    type="button"
    class="flex min-h-[8.5rem] flex-col overflow-hidden rounded-lg border border-slate-200/70 bg-white text-start shadow-sm transition hover:border-brand-200 hover:bg-brand-50/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
    :disabled="product.stock_quantity <= 0"
    @click="emit('add')"
  >
    <div class="relative aspect-[4/3] w-full bg-slate-100">
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
        <ImageOff class="h-7 w-7" :stroke-width="1.5" />
      </div>
    </div>

    <div class="flex flex-1 flex-col justify-between gap-1.5 p-2.5">
      <div>
        <p class="line-clamp-2 text-xs font-semibold text-slate-900">
          {{ product.name }}
        </p>
        <p class="mt-1 text-sm font-bold text-brand-700">
          {{ formatPrice(product.price) }}
          <span class="text-[11px] font-medium text-slate-500">ر.ي</span>
        </p>
      </div>
      <span
        class="inline-flex w-fit rounded px-1.5 py-0.5 text-[11px] font-medium"
        :class="
          product.stock_quantity <= product.min_stock_alert
            ? 'bg-amber-50 text-amber-700'
            : 'bg-slate-100 text-slate-600'
        "
      >
        المخزون: {{ product.stock_quantity }}
      </span>
    </div>
  </button>
</template>
