<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import {
  combineStock,
  formatStockLabel,
  splitStock,
} from '@/utils/stockUnits'
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

const cartons = ref('0')
const pieces = ref('0')
const error = ref('')

const piecesPerCarton = computed(() =>
  Math.max(1, props.product?.pieces_per_carton ?? 1),
)

const preview = computed(() => {
  const c = Number.parseInt(cartons.value, 10)
  const p = Number.parseInt(pieces.value, 10)
  if (!Number.isFinite(c) || c < 0 || !Number.isFinite(p) || p < 0) {
    return null
  }
  const total = combineStock(c, p, piecesPerCarton.value)
  return {
    total,
    label: formatStockLabel(total, piecesPerCarton.value),
  }
})

watch(
  () => [props.open, props.product] as const,
  ([isOpen]) => {
    if (isOpen && props.product) {
      const breakdown = splitStock(
        props.product.stock_quantity,
        props.product.pieces_per_carton,
      )
      cartons.value = String(breakdown.cartons)
      pieces.value = String(breakdown.pieces)
      error.value = ''
    }
  },
)

function onSubmit(): void {
  const c = Number.parseInt(cartons.value, 10)
  const p = Number.parseInt(pieces.value, 10)
  if (!Number.isFinite(c) || c < 0 || !Number.isFinite(p) || p < 0) {
    error.value = 'أدخل كراتين وقطعاً صحيحة (≥ 0)'
    return
  }
  error.value = ''
  emit('save', combineStock(c, p, piecesPerCarton.value))
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
      <p class="text-xs text-slate-500">
        الكرتون الواحد =
        <span class="font-medium text-slate-700">{{ piecesPerCarton }} قطعة</span>
      </p>

      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">
            عدد الكراتين
          </label>
          <input
            v-model="cartons"
            type="number"
            min="0"
            step="1"
            class="w-full rounded-xl border border-slate-200/70 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">
            قطع إضافية
          </label>
          <input
            v-model="pieces"
            type="number"
            min="0"
            step="1"
            class="w-full rounded-xl border border-slate-200/70 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          />
        </div>
      </div>

      <p v-if="preview" class="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
        الإجمالي:
        <span class="font-semibold">{{ preview.label }}</span>
        <span class="text-slate-500">({{ preview.total }} قطعة)</span>
      </p>
      <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
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
