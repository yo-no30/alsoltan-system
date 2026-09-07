<script setup lang="ts">
import { Download, Printer, Share2 } from '@lucide/vue'

defineProps<{
  disabled?: boolean
  busy?: boolean
}>()

const emit = defineEmits<{
  exportSales: []
  shareSales: []
  exportInventory: []
  shareInventory: []
  print: []
}>()

const btnClass =
  'inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200/70 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 sm:w-auto sm:justify-start sm:py-2'
</script>

<template>
  <div class="grid w-full grid-cols-1 gap-2 xs:grid-cols-2 sm:flex sm:flex-wrap lg:max-w-none">
    <button
      type="button"
      :class="btnClass"
      :disabled="disabled || busy"
      @click="emit('exportSales')"
    >
      <Download class="h-4 w-4 shrink-0" :stroke-width="1.75" />
      <span class="sm:hidden">مبيعات PDF</span>
      <span class="hidden sm:inline">تصدير المبيعات PDF</span>
    </button>
    <button
      type="button"
      :class="btnClass"
      :disabled="disabled || busy"
      @click="emit('shareSales')"
    >
      <Share2 class="h-4 w-4 shrink-0" :stroke-width="1.75" />
      <span class="sm:hidden">مشاركة مبيعات</span>
      <span class="hidden sm:inline">مشاركة المبيعات</span>
    </button>
    <button
      type="button"
      :class="btnClass"
      :disabled="disabled || busy"
      @click="emit('exportInventory')"
    >
      <Download class="h-4 w-4 shrink-0" :stroke-width="1.75" />
      <span class="sm:hidden">مخزون PDF</span>
      <span class="hidden sm:inline">تصدير المخزون PDF</span>
    </button>
    <button
      type="button"
      :class="btnClass"
      :disabled="disabled || busy"
      @click="emit('shareInventory')"
    >
      <Share2 class="h-4 w-4 shrink-0" :stroke-width="1.75" />
      <span class="sm:hidden">مشاركة مخزون</span>
      <span class="hidden sm:inline">مشاركة المخزون</span>
    </button>
    <button
      type="button"
      class="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-60 xs:col-span-2 sm:col-span-1 sm:w-auto sm:py-2"
      :disabled="disabled || busy"
      @click="emit('print')"
    >
      <Printer class="h-4 w-4 shrink-0" :stroke-width="1.75" />
      طباعة الملخص
    </button>
  </div>
</template>
