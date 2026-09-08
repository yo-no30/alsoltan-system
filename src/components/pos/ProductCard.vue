<script setup lang="ts">
import { ImageOff } from '@lucide/vue'
import MoneyAmount from '@/components/ui/MoneyAmount.vue'
import { formatStockLabel } from '@/utils/stockUnits'
import type { Product } from '@/types/database.types'

defineProps<{
  product: Product
}>()

const emit = defineEmits<{
  add: []
}>()
</script>

<template>
  <button
    type="button"
    class="flex flex-col overflow-hidden rounded-md border border-slate-200 bg-white text-start transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
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
        decoding="async"
      />
      <div
        v-else
        class="flex h-full w-full items-center justify-center text-slate-300"
      >
        <ImageOff class="h-5 w-5" :stroke-width="1.5" />
      </div>
    </div>

    <div class="flex flex-1 flex-col gap-0.5 p-1.5">
      <p class="line-clamp-2 min-h-[2rem] text-[11px] font-medium leading-snug text-slate-900">
        {{ product.name }}
      </p>
      <div class="mt-auto flex items-end justify-between gap-1">
        <p class="text-xs font-semibold text-slate-900">
          <MoneyAmount :amount="Number(product.price)" />
        </p>
        <span
          class="max-w-[55%] truncate text-[9px] leading-tight text-slate-500"
          :class="
            product.stock_quantity <= product.min_stock_alert
              ? 'text-amber-700'
              : ''
          "
          :title="formatStockLabel(product.stock_quantity, product.pieces_per_carton)"
        >
          {{ formatStockLabel(product.stock_quantity, product.pieces_per_carton) }}
        </span>
      </div>
    </div>
  </button>
</template>
