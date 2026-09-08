<script setup lang="ts">
import MoneyAmount from '@/components/ui/MoneyAmount.vue'

defineProps<{
  totalRevenue: number
  netProfit: number
  totalSupplierDebt: number
  lowStockCount: number
}>()
</script>

<template>
  <div class="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
    <article class="rounded-xl border border-slate-200/70 bg-white p-3 shadow-sm">
      <p class="text-[11px] font-medium text-slate-500">إجمالي المبيعات</p>
      <p class="mt-1 text-lg font-semibold tracking-tight text-slate-900">
        <MoneyAmount :amount="totalRevenue" />
      </p>
    </article>

    <article class="rounded-xl border border-slate-200/70 bg-white p-3 shadow-sm">
      <p class="text-[11px] font-medium text-slate-500">صافي الأرباح</p>
      <p
        class="mt-1 text-lg font-semibold tracking-tight"
        :class="netProfit >= 0 ? 'text-brand-700' : 'text-red-700'"
      >
        <MoneyAmount :amount="netProfit" />
      </p>
    </article>

    <article class="rounded-xl border border-slate-200/70 bg-white p-3 shadow-sm">
      <p class="text-[11px] font-medium text-slate-500">إجمالي الديون للموردين</p>
      <p class="mt-1 text-lg font-semibold tracking-tight text-amber-700">
        <MoneyAmount :amount="totalSupplierDebt" />
      </p>
    </article>

    <article class="rounded-xl border border-slate-200/70 bg-white p-3 shadow-sm">
      <p class="text-[11px] font-medium text-slate-500">منتجات منخفضة المخزون</p>
      <p class="mt-1 text-lg font-semibold tracking-tight text-slate-900">
        {{ lowStockCount }}
      </p>
    </article>
  </div>
</template>
