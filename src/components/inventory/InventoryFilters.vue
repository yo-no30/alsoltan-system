<script setup lang="ts">
import { Search } from '@lucide/vue'
import type { Category } from '@/types/database.types'

defineProps<{
  search: string
  categoryId: string | null
  lowStockOnly: boolean
  categories: Category[]
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:categoryId': [value: string | null]
  'update:lowStockOnly': [value: boolean]
}>()

const fieldClass =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none'
</script>

<template>
  <div
    class="flex shrink-0 flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2.5 sm:flex-row sm:items-center"
  >
    <div class="relative min-w-0 flex-1 sm:max-w-sm">
      <Search
        class="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        :stroke-width="1.75"
      />
      <input
        :value="search"
        type="search"
        class="ps-9"
        :class="fieldClass"
        placeholder="بحث عن منتج..."
        @input="emit('update:search', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <select
      :value="categoryId ?? ''"
      class="sm:w-48"
      :class="fieldClass"
      @change="
        emit(
          'update:categoryId',
          ($event.target as HTMLSelectElement).value || null,
        )
      "
    >
      <option value="">كل الأقسام</option>
      <option v-for="category in categories" :key="category.id" :value="category.id">
        {{ category.name }}
      </option>
    </select>

    <label
      class="inline-flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap px-1 text-sm text-slate-600"
    >
      <input
        type="checkbox"
        class="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
        :checked="lowStockOnly"
        @change="
          emit(
            'update:lowStockOnly',
            ($event.target as HTMLInputElement).checked,
          )
        "
      />
      مخزون منخفض فقط
    </label>
  </div>
</template>
