<script setup lang="ts">
import { computed } from 'vue'
import ProductCard from '@/components/pos/ProductCard.vue'
import type { Product } from '@/types/database.types'

const props = defineProps<{
  products: Product[]
  isLoading?: boolean
  /** When invoice/cart is open, show 5 columns; when closed, show 6. */
  invoiceOpen?: boolean
}>()

const emit = defineEmits<{
  add: [product: Product]
}>()

const gridClass = computed(() =>
  props.invoiceOpen
    ? 'grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-5'
    : 'grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6',
)
</script>

<template>
  <div>
    <div v-if="isLoading" :class="gridClass">
      <div
        v-for="n in 12"
        :key="n"
        class="aspect-[3/4] animate-pulse rounded-md border border-slate-200 bg-slate-100"
      />
    </div>

    <div
      v-else-if="products.length === 0"
      class="flex h-28 items-center justify-center rounded-md border border-dashed border-slate-200 bg-white text-[11px] text-slate-500"
    >
      لا توجد منتجات مطابقة
    </div>

    <div v-else :class="gridClass">
      <ProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
        @add="emit('add', product)"
      />
    </div>
  </div>
</template>
