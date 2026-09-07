<script setup lang="ts">
import { toDateInputValue, type DatePreset } from '@/utils/dateRange'

defineProps<{
  preset: DatePreset
  customStart: string
  customEnd: string
}>()

const emit = defineEmits<{
  'update:preset': [value: DatePreset]
  'update:customStart': [value: string]
  'update:customEnd': [value: string]
}>()

const presets: { id: DatePreset; label: string }[] = [
  { id: 'today', label: 'اليوم' },
  { id: 'week', label: 'الأسبوع الحالي' },
  { id: 'month', label: 'الشهر الحالي' },
  { id: 'custom', label: 'فترة مخصصة' },
]

const todayValue = toDateInputValue(new Date())
</script>

<template>
  <div class="space-y-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
    <p class="text-sm font-medium text-slate-700">الفترة الزمنية</p>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="item in presets"
        :key="item.id"
        type="button"
        class="rounded-xl border px-3.5 py-2 text-sm font-medium transition"
        :class="
          preset === item.id
            ? 'border-brand-200 bg-brand-50 text-brand-700'
            : 'border-slate-200/70 bg-white text-slate-600 hover:bg-slate-50'
        "
        @click="emit('update:preset', item.id)"
      >
        {{ item.label }}
      </button>
    </div>

    <div
      v-if="preset === 'custom'"
      class="grid gap-3 sm:grid-cols-2"
    >
      <div>
        <label class="mb-1 block text-xs text-slate-500">من تاريخ</label>
        <input
          type="date"
          class="w-full rounded-xl border border-slate-200/70 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          :value="customStart || todayValue"
          @change="
            emit(
              'update:customStart',
              ($event.target as HTMLInputElement).value,
            )
          "
        />
      </div>
      <div>
        <label class="mb-1 block text-xs text-slate-500">إلى تاريخ</label>
        <input
          type="date"
          class="w-full rounded-xl border border-slate-200/70 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          :value="customEnd || todayValue"
          @change="
            emit('update:customEnd', ($event.target as HTMLInputElement).value)
          "
        />
      </div>
    </div>
  </div>
</template>
