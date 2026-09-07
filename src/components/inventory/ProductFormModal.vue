<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import type { Category, Product } from '@/types/database.types'

const props = defineProps<{
  open: boolean
  product: Product | null
  categories: Category[]
  isSaving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [
    payload: {
      name: string
      category_id: string | null
      price: number
      cost_price: number
      stock_quantity: number
      min_stock_alert: number
      is_active: boolean
    },
  ]
}>()

const form = reactive({
  name: '',
  category_id: '',
  price: '0',
  cost_price: '0',
  stock_quantity: '0',
  min_stock_alert: '5',
  is_active: true,
})

const errors = reactive({
  name: '',
  price: '',
  cost_price: '',
  stock_quantity: '',
  min_stock_alert: '',
})

const title = computed(() =>
  props.product ? 'تعديل منتج' : 'إضافة منتج',
)

function resetForm(): void {
  form.name = props.product?.name ?? ''
  form.category_id = props.product?.category_id ?? ''
  form.price = String(props.product?.price ?? 0)
  form.cost_price = String(props.product?.cost_price ?? 0)
  form.stock_quantity = String(props.product?.stock_quantity ?? 0)
  form.min_stock_alert = String(props.product?.min_stock_alert ?? 5)
  form.is_active = props.product?.is_active ?? true
  errors.name = ''
  errors.price = ''
  errors.cost_price = ''
  errors.stock_quantity = ''
  errors.min_stock_alert = ''
}

watch(
  () => [props.open, props.product] as const,
  ([isOpen]) => {
    if (isOpen) resetForm()
  },
)

function parseNonNegative(value: string, label: string): number | null {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }
  void label
  return parsed
}

function onSubmit(): void {
  errors.name = form.name.trim() ? '' : 'اسم المنتج مطلوب'
  const price = parseNonNegative(form.price, 'price')
  const cost = parseNonNegative(form.cost_price, 'cost')
  const stock = parseNonNegative(form.stock_quantity, 'stock')
  const minAlert = parseNonNegative(form.min_stock_alert, 'min')

  errors.price = price === null ? 'سعر غير صالح' : ''
  errors.cost_price = cost === null ? 'تكلفة غير صالحة' : ''
  errors.stock_quantity = stock === null ? 'كمية غير صالحة' : ''
  errors.min_stock_alert = minAlert === null ? 'حد تنبيه غير صالح' : ''

  if (
    errors.name ||
    errors.price ||
    errors.cost_price ||
    errors.stock_quantity ||
    errors.min_stock_alert ||
    price === null ||
    cost === null ||
    stock === null ||
    minAlert === null
  ) {
    return
  }

  emit('save', {
    name: form.name.trim(),
    category_id: form.category_id || null,
    price,
    cost_price: cost,
    stock_quantity: Math.floor(stock),
    min_stock_alert: Math.floor(minAlert),
    is_active: form.is_active,
  })
}

const inputClass =
  'w-full rounded-xl border border-slate-200/70 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25'
</script>

<template>
  <AppModal :open="open" :title="title" size="lg" @close="emit('close')">
    <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="onSubmit">
      <div class="sm:col-span-2">
        <label class="mb-1.5 block text-sm font-medium text-slate-700">اسم المنتج</label>
        <input v-model="form.name" type="text" :class="inputClass" />
        <p v-if="errors.name" class="mt-1 text-xs text-red-600">{{ errors.name }}</p>
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">القسم</label>
        <select v-model="form.category_id" :class="inputClass">
          <option value="">بدون قسم</option>
          <option
            v-for="category in categories"
            :key="category.id"
            :value="category.id"
          >
            {{ category.name }}
          </option>
        </select>
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">سعر البيع</label>
        <input v-model="form.price" type="number" min="0" step="0.01" :class="inputClass" />
        <p v-if="errors.price" class="mt-1 text-xs text-red-600">{{ errors.price }}</p>
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">سعر التكلفة</label>
        <input v-model="form.cost_price" type="number" min="0" step="0.01" :class="inputClass" />
        <p v-if="errors.cost_price" class="mt-1 text-xs text-red-600">{{ errors.cost_price }}</p>
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">كمية المخزون</label>
        <input v-model="form.stock_quantity" type="number" min="0" step="1" :class="inputClass" />
        <p v-if="errors.stock_quantity" class="mt-1 text-xs text-red-600">
          {{ errors.stock_quantity }}
        </p>
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">حد التنبيه</label>
        <input v-model="form.min_stock_alert" type="number" min="0" step="1" :class="inputClass" />
        <p v-if="errors.min_stock_alert" class="mt-1 text-xs text-red-600">
          {{ errors.min_stock_alert }}
        </p>
      </div>

      <label class="inline-flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
        <input v-model="form.is_active" type="checkbox" class="rounded text-brand-500" />
        منتج نشط
      </label>
    </form>

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
        {{ isSaving ? 'جاري الحفظ...' : 'حفظ' }}
      </button>
    </template>
  </AppModal>
</template>
