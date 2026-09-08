<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Check, ImagePlus, Trash2, Upload } from '@lucide/vue'
import AppModal from '@/components/ui/AppModal.vue'
import { prepareProductImage } from '@/utils/productImage'
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
      imageFile: File | null
      removeImage: boolean
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
  image: '',
})

const imageFile = ref<File | null>(null)
const removeImage = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isPreparingImage = ref(false)
let prepareToken = 0

const title = computed(() =>
  props.product ? 'تعديل منتج' : 'إضافة منتج',
)

const hasPendingLocalImage = computed(() => imageFile.value !== null)

const hasExistingRemoteImage = computed(
  () =>
    !removeImage.value &&
    !hasPendingLocalImage.value &&
    Boolean(props.product?.image_url),
)

const showImageActions = computed(
  () => hasPendingLocalImage.value || hasExistingRemoteImage.value,
)

function resetForm(): void {
  prepareToken += 1
  isPreparingImage.value = false
  form.name = props.product?.name ?? ''
  form.category_id = props.product?.category_id ?? ''
  form.price = String(props.product?.price ?? 0)
  form.cost_price = String(props.product?.cost_price ?? 0)
  form.stock_quantity = String(props.product?.stock_quantity ?? 0)
  form.min_stock_alert = String(props.product?.min_stock_alert ?? 5)
  form.is_active = props.product?.is_active ?? true
  imageFile.value = null
  removeImage.value = false
  errors.name = ''
  errors.price = ''
  errors.cost_price = ''
  errors.stock_quantity = ''
  errors.min_stock_alert = ''
  errors.image = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) resetForm()
  },
)

function openFilePicker(): void {
  errors.image = ''
  window.setTimeout(() => {
    fileInputRef.value?.click()
  }, 0)
}

async function onPickImage(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  input.value = ''
  if (!file) return

  const token = ++prepareToken
  isPreparingImage.value = true
  errors.image = ''

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 80)
  })

  if (token !== prepareToken) return

  const prepared = await prepareProductImage(file)
  if (token !== prepareToken) return

  isPreparingImage.value = false

  if (!prepared.ok) {
    errors.image = prepared.message
    return
  }

  // Do not render the image inside the modal — decode/preview crashes some Windows GPUs.
  imageFile.value = prepared.file
  removeImage.value = false
}

function onRemoveImage(): void {
  prepareToken += 1
  isPreparingImage.value = false
  imageFile.value = null
  removeImage.value = true
  errors.image = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function parseNonNegative(value: string): number | null {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }
  return parsed
}

function onSubmit(): void {
  if (isPreparingImage.value) return

  errors.name = form.name.trim() ? '' : 'اسم المنتج مطلوب'
  const price = parseNonNegative(form.price)
  const cost = parseNonNegative(form.cost_price)
  const stock = parseNonNegative(form.stock_quantity)
  const minAlert = parseNonNegative(form.min_stock_alert)

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
    errors.image ||
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
    imageFile: imageFile.value,
    removeImage: removeImage.value && !imageFile.value,
  })
}

const inputClass =
  'w-full rounded-xl border border-slate-200/70 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25'
</script>

<template>
  <AppModal :open="open" :title="title" size="lg" @close="emit('close')">
    <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="onSubmit">
      <div class="sm:col-span-2">
        <label class="mb-1.5 block text-sm font-medium text-slate-700">صورة المنتج</label>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div
            class="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/70 bg-slate-50"
          >
            <div
              v-if="hasPendingLocalImage"
              class="flex flex-col items-center gap-1 px-2 text-center"
            >
              <Check class="h-6 w-6 text-brand-600" :stroke-width="1.75" />
              <span class="text-[10px] font-medium text-slate-600">تم اختيار صورة</span>
            </div>
            <div
              v-else-if="hasExistingRemoteImage"
              class="flex flex-col items-center gap-1 px-2 text-center"
            >
              <Check class="h-6 w-6 text-brand-600" :stroke-width="1.75" />
              <span class="text-[10px] font-medium text-slate-600">صورة محفوظة</span>
            </div>
            <ImagePlus
              v-else
              class="h-8 w-8 text-slate-300"
              :stroke-width="1.5"
            />
          </div>
          <div class="min-w-0 flex-1 space-y-2">
            <input
              ref="fileInputRef"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
              class="sr-only"
              tabindex="-1"
              @change="onPickImage"
            />
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              :disabled="isPreparingImage || isSaving"
              @click="openFilePicker"
            >
              <Upload class="h-4 w-4 text-brand-600" :stroke-width="1.75" />
              {{ isPreparingImage ? 'جاري تجهيز الصورة...' : 'اختيار صورة' }}
            </button>
            <p class="text-[11px] text-slate-500">
              JPG أو PNG أو WebP — بحد أقصى 2 ميجابايت
            </p>
            <button
              v-if="showImageActions"
              type="button"
              class="inline-flex items-center gap-1 rounded-lg border border-slate-200/70 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              :disabled="isPreparingImage"
              @click="onRemoveImage"
            >
              <Trash2 class="h-3.5 w-3.5" :stroke-width="1.75" />
              إزالة الصورة
            </button>
            <p v-if="errors.image" class="text-xs text-red-600">{{ errors.image }}</p>
          </div>
        </div>
      </div>

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
        :disabled="isSaving || isPreparingImage"
        @click="onSubmit"
      >
        {{ isSaving ? 'جاري الحفظ...' : 'حفظ' }}
      </button>
    </template>
  </AppModal>
</template>
