<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import MoneyAmount from '@/components/ui/MoneyAmount.vue'
import type { Supplier } from '@/types/database.types'

const props = defineProps<{
  open: boolean
  supplier: Supplier | null
  isSaving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [amount: number]
}>()

const amount = ref('')
const error = ref('')

const balance = computed(() => Number(props.supplier?.balance_due ?? 0))

watch(
  () => [props.open, props.supplier] as const,
  ([isOpen]) => {
    if (isOpen) {
      amount.value = ''
      error.value = ''
    }
  },
)

function onSubmit(): void {
  const parsed = Number.parseFloat(amount.value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    error.value = 'أدخل مبلغاً أكبر من صفر'
    return
  }
  if (parsed > balance.value) {
    error.value = 'المبلغ أكبر من الدين المستحق'
    return
  }
  error.value = ''
  emit('save', Math.round(parsed * 100) / 100)
}
</script>

<template>
  <AppModal :open="open" title="تسديد دين مورد" @close="emit('close')">
    <div class="space-y-4">
      <p class="text-sm text-slate-600">
        المورد:
        <span class="font-semibold text-slate-900">{{ supplier?.name }}</span>
      </p>
      <p class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        الدين الحالي: <MoneyAmount :amount="balance" />
      </p>
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">
          مبلغ التسديد
        </label>
        <input
          v-model="amount"
          type="number"
          min="0.01"
          step="0.01"
          class="w-full rounded-xl border border-slate-200/70 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        />
        <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        class="rounded-xl border border-slate-200/70 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        @click="emit('close')"
      >
        إلغاء
      </button>
      <button
        type="button"
        class="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        :disabled="isSaving"
        @click="onSubmit"
      >
        {{ isSaving ? 'جاري التسديد...' : 'تأكيد التسديد' }}
      </button>
    </template>
  </AppModal>
</template>
