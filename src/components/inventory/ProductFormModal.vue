<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ClipboardPaste, Link2, Trash2 } from '@lucide/vue'
import AppModal from '@/components/ui/AppModal.vue'
import {
  isValidImageUrl,
  validateProductImageFile,
} from '@/utils/productImage'
import {
  combineStock,
  formatStockLabel,
  splitStock,
} from '@/utils/stockUnits'
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
      pieces_per_carton: number
      is_active: boolean
      image_url: string | null
      imageFile: File | null
      clearImage: boolean
    },
  ]
}>()

const form = reactive({
  name: '',
  category_id: '',
  price: '0',
  cost_price: '0',
  pieces_per_carton: '1',
  stock_cartons: '0',
  stock_pieces: '0',
  min_stock_alert: '5',
  is_active: true,
  image_url: '',
})

const errors = reactive({
  name: '',
  price: '',
  cost_price: '',
  pieces_per_carton: '',
  stock: '',
  min_stock_alert: '',
  image: '',
})

const pastedFile = ref<File | null>(null)
const pastedFileName = ref('')
const clearImage = ref(false)

const title = computed(() =>
  props.product ? 'تعديل منتج' : 'إضافة منتج',
)

const imageStatusLabel = computed(() => {
  if (pastedFile.value) return `جاهزة للرفع: ${pastedFileName.value}`
  if (clearImage.value) return 'سيتم حذف الصورة عند الحفظ'
  if (form.image_url.trim()) return 'سيتم استخدام رابط الصورة'
  if (props.product?.image_url) return 'صورة محفوظة حالياً'
  return 'لا توجد صورة'
})

const stockPreview = computed(() => {
  const ppc = Number.parseInt(form.pieces_per_carton, 10)
  const cartons = Number.parseInt(form.stock_cartons, 10)
  const pieces = Number.parseInt(form.stock_pieces, 10)
  if (
    !Number.isFinite(ppc) ||
    ppc < 1 ||
    !Number.isFinite(cartons) ||
    cartons < 0 ||
    !Number.isFinite(pieces) ||
    pieces < 0
  ) {
    return null
  }
  const total = combineStock(cartons, pieces, ppc)
  return {
    total,
    label: formatStockLabel(total, ppc),
  }
})

function resetForm(): void {
  const breakdown = splitStock(
    props.product?.stock_quantity ?? 0,
    props.product?.pieces_per_carton ?? 1,
  )
  form.name = props.product?.name ?? ''
  form.category_id = props.product?.category_id ?? ''
  form.price = String(props.product?.price ?? 0)
  form.cost_price = String(props.product?.cost_price ?? 0)
  form.pieces_per_carton = String(breakdown.piecesPerCarton)
  form.stock_cartons = String(breakdown.cartons)
  form.stock_pieces = String(breakdown.pieces)
  form.min_stock_alert = String(props.product?.min_stock_alert ?? 5)
  form.is_active = props.product?.is_active ?? true
  form.image_url = props.product?.image_url ?? ''
  pastedFile.value = null
  pastedFileName.value = ''
  clearImage.value = false
  errors.name = ''
  errors.price = ''
  errors.cost_price = ''
  errors.pieces_per_carton = ''
  errors.stock = ''
  errors.min_stock_alert = ''
  errors.image = ''
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) resetForm()
  },
)

function onClearImage(): void {
  pastedFile.value = null
  pastedFileName.value = ''
  form.image_url = ''
  clearImage.value = true
  errors.image = ''
}

function acceptPastedFile(file: File): void {
  const validationError = validateProductImageFile(file)
  if (validationError) {
    errors.image = validationError
    return
  }
  pastedFile.value = file
  pastedFileName.value = file.name || 'صورة من الحافظة'
  form.image_url = ''
  clearImage.value = false
  errors.image = ''
}

function onPasteZone(event: ClipboardEvent): void {
  const items = event.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (!item.type.startsWith('image/')) continue
    const file = item.getAsFile()
    if (!file) continue
    event.preventDefault()
    acceptPastedFile(file)
    return
  }
}

function onImageUrlInput(): void {
  if (form.image_url.trim()) {
    pastedFile.value = null
    pastedFileName.value = ''
    clearImage.value = false
  }
  errors.image = isValidImageUrl(form.image_url)
    ? ''
    : 'رابط الصورة غير صالح'
}

function parseNonNegative(value: string): number | null {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }
  return parsed
}

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null
  }
  return parsed
}

function onSubmit(): void {
  errors.name = form.name.trim() ? '' : 'اسم المنتج مطلوب'
  const price = parseNonNegative(form.price)
  const cost = parseNonNegative(form.cost_price)
  const piecesPerCarton = parsePositiveInt(form.pieces_per_carton)
  const cartons = parseNonNegative(form.stock_cartons)
  const loosePieces = parseNonNegative(form.stock_pieces)
  const minAlert = parseNonNegative(form.min_stock_alert)

  errors.price = price === null ? 'سعر غير صالح' : ''
  errors.cost_price = cost === null ? 'تكلفة غير صالحة' : ''
  errors.pieces_per_carton =
    piecesPerCarton === null ? 'أدخل عدد القطع في الكرتون (≥ 1)' : ''
  errors.stock =
    cartons === null || loosePieces === null ? 'كمية المخزون غير صالحة' : ''
  errors.min_stock_alert = minAlert === null ? 'حد تنبيه غير صالح' : ''
  errors.image = isValidImageUrl(form.image_url) ? '' : 'رابط الصورة غير صالح'

  if (
    errors.name ||
    errors.price ||
    errors.cost_price ||
    errors.pieces_per_carton ||
    errors.stock ||
    errors.min_stock_alert ||
    errors.image ||
    price === null ||
    cost === null ||
    piecesPerCarton === null ||
    cartons === null ||
    loosePieces === null ||
    minAlert === null
  ) {
    return
  }

  const trimmedUrl = form.image_url.trim()
  const stockQuantity = combineStock(cartons, loosePieces, piecesPerCarton)

  emit('save', {
    name: form.name.trim(),
    category_id: form.category_id || null,
    price,
    cost_price: cost,
    stock_quantity: stockQuantity,
    min_stock_alert: Math.floor(minAlert),
    pieces_per_carton: piecesPerCarton,
    is_active: form.is_active,
    image_url: pastedFile.value ? null : trimmedUrl || null,
    imageFile: pastedFile.value,
    clearImage:
      clearImage.value && !pastedFile.value && !trimmedUrl,
  })
}

const inputClass =
  'w-full rounded-xl border border-slate-200/70 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25'
</script>

<template>
  <AppModal :open="open" :title="title" size="lg" @close="emit('close')">
    <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="onSubmit">
      <div class="space-y-3 sm:col-span-2">
        <label class="block text-sm font-medium text-slate-700">صورة المنتج</label>

        <div
          class="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-3"
          tabindex="0"
          @paste="onPasteZone"
        >
          <div class="flex items-start gap-2 text-sm text-slate-600">
            <ClipboardPaste class="mt-0.5 h-4 w-4 shrink-0 text-brand-600" :stroke-width="1.75" />
            <div>
              <p class="font-medium text-slate-800">الصق صورة هنا (Ctrl+V)</p>
              <p class="mt-0.5 text-xs text-slate-500">
                انسخ صورة من أي مكان ثم الصقها في هذا الصندوق — بدون فتح مستكشف الملفات
              </p>
            </div>
          </div>
        </div>

        <div>
          <label class="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Link2 class="h-3.5 w-3.5" :stroke-width="1.75" />
            أو رابط صورة مباشر
          </label>
          <input
            v-model="form.image_url"
            type="url"
            dir="ltr"
            placeholder="https://..."
            :class="inputClass"
            @input="onImageUrlInput"
          />
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-xs text-slate-500">{{ imageStatusLabel }}</p>
          <button
            v-if="pastedFile || form.image_url || props.product?.image_url"
            type="button"
            class="inline-flex items-center gap-1 rounded-lg border border-slate-200/70 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            @click="onClearImage"
          >
            <Trash2 class="h-3.5 w-3.5" :stroke-width="1.75" />
            إزالة الصورة
          </button>
        </div>
        <p v-if="errors.image" class="text-xs text-red-600">{{ errors.image }}</p>
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
        <label class="mb-1.5 block text-sm font-medium text-slate-700">
          القطعة في الكرتون
        </label>
        <input
          v-model="form.pieces_per_carton"
          type="number"
          min="1"
          step="1"
          :class="inputClass"
        />
        <p class="mt-1 text-[11px] text-slate-500">مثال: 20 قطعة داخل الكرتون الواحد</p>
        <p v-if="errors.pieces_per_carton" class="mt-1 text-xs text-red-600">
          {{ errors.pieces_per_carton }}
        </p>
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">سعر البيع (للقطعة)</label>
        <input v-model="form.price" type="number" min="0" step="0.01" :class="inputClass" />
        <p v-if="errors.price" class="mt-1 text-xs text-red-600">{{ errors.price }}</p>
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">سعر التكلفة (للقطعة)</label>
        <input v-model="form.cost_price" type="number" min="0" step="0.01" :class="inputClass" />
        <p v-if="errors.cost_price" class="mt-1 text-xs text-red-600">{{ errors.cost_price }}</p>
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">عدد الكراتين</label>
        <input
          v-model="form.stock_cartons"
          type="number"
          min="0"
          step="1"
          :class="inputClass"
        />
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">قطع إضافية</label>
        <input
          v-model="form.stock_pieces"
          type="number"
          min="0"
          step="1"
          :class="inputClass"
        />
        <p class="mt-1 text-[11px] text-slate-500">قطع خارج الكراتين الكاملة</p>
      </div>

      <div class="sm:col-span-2">
        <p v-if="stockPreview" class="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">
          المخزون الإجمالي:
          <span class="font-semibold">{{ stockPreview.label }}</span>
          <span class="text-brand-700/80">({{ stockPreview.total }} قطعة)</span>
        </p>
        <p v-if="errors.stock" class="mt-1 text-xs text-red-600">{{ errors.stock }}</p>
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">حد التنبيه (بالقطعة)</label>
        <input v-model="form.min_stock_alert" type="number" min="0" step="1" :class="inputClass" />
        <p v-if="errors.min_stock_alert" class="mt-1 text-xs text-red-600">
          {{ errors.min_stock_alert }}
        </p>
      </div>

      <label class="inline-flex items-center gap-2 text-sm text-slate-700">
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
