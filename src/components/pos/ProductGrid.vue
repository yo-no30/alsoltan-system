<script setup lang="ts">
import ProductCard from '@/components/pos/ProductCard.vue'
import type { Product } from '@/types/database.types'

defineProps<{
  products: Product[]
  isLoading?: boolean
}>()

const emit = defineEmits<{
  add: [product: Product]
}>()
</script>

<template>
  <div>
    <div
      v-if="isLoading"
      class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
    >
      <div
        v-for="n in 8"
        :key="n"
        class="h-24 animate-pulse rounded-lg border border-slate-200/70 bg-slate-100"
      />
    </div>

    <div
      v-else-if="products.length === 0"
      class="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-xs text-slate-500"
    >
      لا توجد منتجات مطابقة
    </div>

    <div
      v-else
      class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
    >
      <ProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
        @add="emit('add', product)"
      />
    </div>
  </div>
</template>
