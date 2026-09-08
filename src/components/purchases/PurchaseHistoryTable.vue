<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import MoneyAmount from '@/components/ui/MoneyAmount.vue'
import type { PurchaseListItem } from '@/stores/purchases'

defineProps<{
  purchases: PurchaseListItem[]
}>()

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function unpaid(purchase: PurchaseListItem): number {
  return Math.max(
    0,
    Math.round((Number(purchase.total_amount) - Number(purchase.paid_amount)) * 100) /
      100,
  )
}
</script>

<template>
  <div class="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-sm">
    <table class="min-w-[48rem] text-sm">
      <thead class="border-b border-slate-200/70 bg-slate-50/80 text-slate-600">
        <tr>
          <th class="px-3 py-2 text-start font-medium">رقم الفاتورة</th>
          <th class="px-3 py-2 text-start font-medium">المورد</th>
          <th class="px-3 py-2 text-start font-medium">الإجمالي</th>
          <th class="px-3 py-2 text-start font-medium">المدفوع</th>
          <th class="px-3 py-2 text-start font-medium">النوع</th>
          <th class="px-3 py-2 text-start font-medium">الحالة</th>
          <th class="px-3 py-2 text-start font-medium">التاريخ</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="purchases.length === 0">
          <td colspan="7" class="px-4 py-10 text-center text-slate-400">
            لا توجد فواتير شراء بعد
          </td>
        </tr>
        <tr
          v-for="purchase in purchases"
          :key="purchase.id"
          class="border-b border-slate-100 last:border-0"
        >
          <td class="px-3 py-2 font-medium text-slate-900" dir="ltr">
            {{ purchase.invoice_number }}
          </td>
          <td class="px-3 py-2 text-slate-700">
            {{ purchase.supplier_name || '—' }}
          </td>
          <td class="px-3 py-2 text-slate-900">
            <MoneyAmount :amount="Number(purchase.total_amount)" />
          </td>
          <td class="px-3 py-2 text-slate-700">
            <MoneyAmount :amount="Number(purchase.paid_amount)" />
          </td>
          <td class="px-3 py-2">
            <AppBadge :variant="purchase.payment_type === 'cash' ? 'success' : 'warning'">
              {{ purchase.payment_type === 'cash' ? 'نقداً' : 'آجل' }}
            </AppBadge>
          </td>
          <td class="px-3 py-2">
            <AppBadge v-if="unpaid(purchase) > 0" variant="warning">
              متبقي <MoneyAmount :amount="unpaid(purchase)" />
            </AppBadge>
            <AppBadge v-else variant="muted">مسدد</AppBadge>
          </td>
          <td class="px-3 py-2 text-slate-600">
            {{ formatDate(purchase.created_at) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
