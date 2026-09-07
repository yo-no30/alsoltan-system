<script setup lang="ts">
import type { PaymentBreakdown, PurchaseSummary } from '@/composables/useReports'

defineProps<{
  payments: PaymentBreakdown[]
  purchases: PurchaseSummary
}>()

function formatMoney(value: number): string {
  return value.toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-2">
    <section class="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <h3 class="mb-3 text-sm font-semibold text-slate-900">
        المبيعات حسب طريقة الدفع
      </h3>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="border-b border-slate-200/70 text-slate-500">
            <tr>
              <th class="px-2 py-2 text-start font-medium">الطريقة</th>
              <th class="px-2 py-2 text-start font-medium">عدد الفواتير</th>
              <th class="px-2 py-2 text-start font-medium">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in payments"
              :key="row.type"
              class="border-b border-slate-100 last:border-0"
            >
              <td class="px-2 py-2.5 text-slate-800">{{ row.label }}</td>
              <td class="px-2 py-2.5 text-slate-600">{{ row.count }}</td>
              <td class="px-2 py-2.5 font-medium text-slate-900">
                {{ formatMoney(row.total) }} ر.ي
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <h3 class="mb-3 text-sm font-semibold text-slate-900">ملخص المشتريات</h3>
      <dl class="space-y-2.5 text-sm">
        <div class="flex items-center justify-between">
          <dt class="text-slate-500">عدد الفواتير</dt>
          <dd class="font-medium text-slate-900">{{ purchases.count }}</dd>
        </div>
        <div class="flex items-center justify-between">
          <dt class="text-slate-500">إجمالي المشتريات</dt>
          <dd class="font-medium text-slate-900">
            {{ formatMoney(purchases.totalAmount) }} ر.ي
          </dd>
        </div>
        <div class="flex items-center justify-between">
          <dt class="text-slate-500">المدفوع</dt>
          <dd class="font-medium text-emerald-700">
            {{ formatMoney(purchases.paidAmount) }} ر.ي
          </dd>
        </div>
        <div class="flex items-center justify-between">
          <dt class="text-slate-500">المتبقي / الآجل</dt>
          <dd class="font-medium text-amber-700">
            {{ formatMoney(purchases.unpaidAmount) }} ر.ي
          </dd>
        </div>
        <div class="mt-2 border-t border-slate-100 pt-2.5">
          <div class="flex items-center justify-between">
            <dt class="text-slate-500">نقداً</dt>
            <dd class="text-slate-800">{{ formatMoney(purchases.cashTotal) }} ر.ي</dd>
          </div>
          <div class="mt-2 flex items-center justify-between">
            <dt class="text-slate-500">آجل</dt>
            <dd class="text-slate-800">{{ formatMoney(purchases.creditTotal) }} ر.ي</dd>
          </div>
        </div>
      </dl>
    </section>
  </div>
</template>
