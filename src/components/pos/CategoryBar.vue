<script setup lang="ts">
import type { Category } from '@/types/database.types'

defineProps<{
  categories: Category[]
  selectedCategoryId: string | null
}>()

const emit = defineEmits<{
  select: [categoryId: string | null]
}>()
</script>

<template>
  <div
    class="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
  >
    <button
      type="button"
      class="shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition active:scale-[0.98]"
      :class="
        selectedCategoryId === null
          ? 'border-brand-200 bg-brand-50 text-brand-700'
          : 'border-slate-200/70 bg-white text-slate-600 hover:bg-slate-50'
      "
      @click="emit('select', null)"
    >
      الكل
    </button>
    <button
      v-for="category in categories"
      :key="category.id"
      type="button"
      class="shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition active:scale-[0.98]"
      :class="
        selectedCategoryId === category.id
          ? 'border-brand-200 bg-brand-50 text-brand-700'
          : 'border-slate-200/70 bg-white text-slate-600 hover:bg-slate-50'
      "
      @click="emit('select', category.id)"
    >
      {{ category.name }}
    </button>
  </div>
</template>
