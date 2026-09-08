<script setup lang="ts">
import { Search } from '@lucide/vue'

defineProps<{
  search: string
  lowStockOnly: boolean
  lowStockCount: number
}>()

const emit = defineEmits<{
  'update:search': [value: string]
  'update:lowStockOnly': [value: boolean]
}>()

const fieldClass =
  'h-10 w-full rounded-lg border border-slate-200/70 bg-white px-3 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25'
</script>

<template>
  <div
    class="flex shrink-0 flex-col gap-2.5 rounded-xl border border-slate-200/70 bg-white/90 p-2.5 shadow-sm sm:flex-row sm:items-center sm:gap-3"
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

    <label
      class="inline-flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200/70 bg-slate-50/80 px-3 text-sm text-slate-600 transition hover:bg-slate-100/80"
      :class="lowStockOnly ? 'border-amber-200 bg-amber-50 text-amber-900' : ''"
    >
      <input
        type="checkbox"
        class="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500/30"
        :checked="lowStockOnly"
        @change="
          emit(
            'update:lowStockOnly',
            ($event.target as HTMLInputElement).checked,
          )
        "
      />
      مخزون منخفض فقط
      <span
        class="inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
        :class="
          lowStockCount > 0
            ? 'bg-amber-500 text-white'
            : 'bg-slate-200 text-slate-500'
        "
      >
        {{ lowStockCount }}
      </span>
    </label>
  </div>
</template>
