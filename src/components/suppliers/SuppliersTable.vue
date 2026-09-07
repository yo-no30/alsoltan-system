<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import type { Supplier } from '@/types/database.types'

defineProps<{
  suppliers: Supplier[]
  isBusy?: boolean
}>()

const emit = defineEmits<{
  edit: [supplier: Supplier]
  pay: [supplier: Supplier]
}>()

function formatMoney(value: number): string {
  return Number(value).toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ar-SA')
  } catch {
    return iso
  }
}
</script>

<template>
  <div class="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-sm">
    <table class="min-w-[40rem] text-sm">
      <thead class="border-b border-slate-200/70 bg-slate-50/80 text-slate-600">
        <tr>
          <th class="px-3 py-2 text-start font-medium">المورد</th>
          <th class="px-3 py-2 text-start font-medium">الجوال</th>
          <th class="px-3 py-2 text-start font-medium">الدين المستحق</th>
          <th class="px-3 py-2 text-start font-medium">تاريخ الإضافة</th>
          <th class="px-3 py-2 text-start font-medium">إجراءات</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="suppliers.length === 0">
          <td colspan="5" class="px-4 py-10 text-center text-slate-400">
            لا يوجد موردون بعد
          </td>
        </tr>
        <tr
          v-for="supplier in suppliers"
          :key="supplier.id"
          class="border-b border-slate-100 last:border-0"
        >
          <td class="px-3 py-2 font-medium text-slate-900">{{ supplier.name }}</td>
          <td class="px-3 py-2 text-slate-600" dir="ltr">
            {{ supplier.phone || '—' }}
          </td>
          <td class="px-3 py-2">
            <div class="flex items-center gap-2">
              <span
                class="font-semibold"
                :class="
                  Number(supplier.balance_due) > 0
                    ? 'text-amber-700'
                    : 'text-slate-900'
                "
              >
                {{ formatMoney(supplier.balance_due) }} ر.ي
              </span>
              <AppBadge
                v-if="Number(supplier.balance_due) > 0"
                variant="warning"
              >
                عليه دين
              </AppBadge>
            </div>
          </td>
          <td class="px-3 py-2 text-slate-600">
            {{ formatDate(supplier.created_at) }}
          </td>
          <td class="px-3 py-2">
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-lg border border-slate-200/70 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                :disabled="isBusy"
                @click="emit('edit', supplier)"
              >
                تعديل
              </button>
              <button
                type="button"
                class="rounded-lg border border-brand-100 bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60"
                :disabled="isBusy || Number(supplier.balance_due) <= 0"
                @click="emit('pay', supplier)"
              >
                تسديد
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
