<script setup lang="ts">
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
</script>

<template>
  <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
    <input
      :value="search"
      type="search"
      class="w-full rounded-xl border border-slate-200/70 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 lg:max-w-xs"
      placeholder="بحث بالاسم..."
      @input="emit('update:search', ($event.target as HTMLInputElement).value)"
    />

    <select
      :value="categoryId ?? ''"
      class="w-full rounded-xl border border-slate-200/70 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 lg:max-w-[14rem]"
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
      class="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200/70 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm"
    >
      <input
        type="checkbox"
        class="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
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
