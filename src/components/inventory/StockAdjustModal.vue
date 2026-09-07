<script setup lang="ts">
import { ref, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import type { Product } from '@/types/database.types'

const props = defineProps<{
  open: boolean
  product: Product | null
  isSaving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [quantity: number]
}>()

const quantity = ref('0')
const error = ref('')

watch(
  () => [props.open, props.product] as const,
  ([isOpen]) => {
    if (isOpen && props.product) {
      quantity.value = String(props.product.stock_quantity)
      error.value = ''
    }
  },
)

function onSubmit(): void {
  const parsed = Number.parseInt(quantity.value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    error.value = 'أدخل كمية صحيحة (≥ 0)'
    return
  }
  error.value = ''
  emit('save', parsed)
}
</script>

<template>
  <AppModal
    :open="open"
    title="تعديل مخزون سريع"
    @close="emit('close')"
  >
    <div class="space-y-3">
      <p class="text-sm text-slate-600">
        المنتج:
        <span class="font-semibold text-slate-900">{{ product?.name }}</span>
      </p>
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">
          الكمية الجديدة
        </label>
        <input
          v-model="quantity"
          type="number"
          min="0"
          step="1"
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
        {{ isSaving ? 'جاري الحفظ...' : 'حفظ الكمية' }}
      </button>
    </template>
  </AppModal>
</template>
