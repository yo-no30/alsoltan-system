<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { Plus, Trash2 } from '@lucide/vue'
import AppModal from '@/components/ui/AppModal.vue'
import MoneyAmount from '@/components/ui/MoneyAmount.vue'
import { calcPurchaseTotal, type PurchaseLineInput } from '@/stores/purchases'
import type { Product } from '@/types/database.types'
import type { PurchasePaymentType } from '@/types/database.types'
import type { Supplier } from '@/types/database.types'

interface FormLine {
  key: string
  product_id: string
  quantity: string
  cost_price: string
}

const props = defineProps<{
  open: boolean
  suppliers: Supplier[]
  products: Product[]
  isSaving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [
    payload: {
      supplier_id: string
      invoice_number: string
      payment_type: PurchasePaymentType
      paid_amount: number
      items: PurchaseLineInput[]
    },
  ]
}>()

const form = reactive({
  supplier_id: '',
  invoice_number: '',
  payment_type: 'cash' as PurchasePaymentType,
  paid_amount: '',
})

const lines = reactive<FormLine[]>([])
const error = reactive({ general: '', paid: '' })

const inputClass =
  'w-full rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25'

const parsedLines = computed<PurchaseLineInput[]>(() =>
  lines
    .map((line) => ({
      product_id: line.product_id,
      quantity: Number.parseInt(line.quantity, 10),
      cost_price: Number.parseFloat(line.cost_price),
    }))
    .filter(
      (line) =>
        line.product_id &&
        Number.isFinite(line.quantity) &&
        line.quantity > 0 &&
        Number.isFinite(line.cost_price) &&
        line.cost_price >= 0,
    ),
)

const total = computed(() => calcPurchaseTotal(parsedLines.value))

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    form.supplier_id = ''
    form.invoice_number = ''
    form.payment_type = 'cash'
    form.paid_amount = ''
    error.general = ''
    error.paid = ''
    lines.splice(0, lines.length, {
      key: crypto.randomUUID(),
      product_id: '',
      quantity: '1',
      cost_price: '0',
    })
  },
)

watch(
  () => [form.payment_type, total.value] as const,
  ([type, totalAmount]) => {
    if (type === 'cash') {
      form.paid_amount = String(totalAmount)
    }
  },
)

function addLine(): void {
  lines.push({
    key: crypto.randomUUID(),
    product_id: '',
    quantity: '1',
    cost_price: '0',
  })
}

function removeLine(key: string): void {
  if (lines.length <= 1) return
  const index = lines.findIndex((line) => line.key === key)
  if (index !== -1) lines.splice(index, 1)
}

function onProductChange(line: FormLine): void {
  const product = props.products.find((entry) => entry.id === line.product_id)
  if (product) {
    line.cost_price = String(product.cost_price)
  }
}

function onSubmit(): void {
  error.general = ''
  error.paid = ''

  if (!form.supplier_id) {
    error.general = 'اختر المورد'
    return
  }
  if (!form.invoice_number.trim()) {
    error.general = 'رقم الفاتورة مطلوب'
    return
  }
  if (parsedLines.value.length === 0) {
    error.general = 'أضف بنوداً صحيحة للفاتورة'
    return
  }

  let paid = Number.parseFloat(form.paid_amount)
  if (form.payment_type === 'cash') {
    paid = total.value
  }

  if (!Number.isFinite(paid) || paid < 0 || paid > total.value) {
    error.paid = 'المبلغ المدفوع غير صالح'
    return
  }

  emit('save', {
    supplier_id: form.supplier_id,
    invoice_number: form.invoice_number.trim(),
    payment_type: form.payment_type,
    paid_amount: Math.round(paid * 100) / 100,
    items: parsedLines.value,
  })
}
</script>

<template>
  <AppModal :open="open" title="فاتورة شراء جديدة" size="xl" @close="emit('close')">
    <div class="space-y-5">
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">المورد</label>
          <select v-model="form.supplier_id" :class="inputClass">
            <option value="">اختر المورد</option>
            <option
              v-for="supplier in suppliers"
              :key="supplier.id"
              :value="supplier.id"
            >
              {{ supplier.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">
            رقم الفاتورة
          </label>
          <input
            v-model="form.invoice_number"
            type="text"
            dir="ltr"
            :class="inputClass"
            placeholder="PO-001"
          />
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <p class="mb-1.5 text-sm font-medium text-slate-700">نوع الدفع</p>
          <div class="grid grid-cols-2 gap-1 rounded-xl border border-slate-200/70 bg-slate-50 p-1">
            <button
              type="button"
              class="rounded-lg px-3 py-2 text-sm font-semibold transition"
              :class="
                form.payment_type === 'cash'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-500'
              "
              @click="form.payment_type = 'cash'"
            >
              نقداً
            </button>
            <button
              type="button"
              class="rounded-lg px-3 py-2 text-sm font-semibold transition"
              :class="
                form.payment_type === 'credit'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-500'
              "
              @click="form.payment_type = 'credit'"
            >
              آجل
            </button>
          </div>
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700">
            المبلغ المدفوع
          </label>
          <input
            v-model="form.paid_amount"
            type="number"
            min="0"
            step="0.01"
            :disabled="form.payment_type === 'cash'"
            :class="inputClass"
          />
          <p v-if="error.paid" class="mt-1 text-xs text-red-600">{{ error.paid }}</p>
        </div>
      </div>

      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-900">بنود الفاتورة</h3>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg border border-slate-200/70 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            @click="addLine"
          >
            <Plus class="h-3.5 w-3.5" :stroke-width="2" />
            بند
          </button>
        </div>

        <div
          v-for="line in lines"
          :key="line.key"
          class="grid gap-2 rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 sm:grid-cols-[1.5fr_0.6fr_0.8fr_auto]"
        >
          <select
            v-model="line.product_id"
            :class="inputClass"
            @change="onProductChange(line)"
          >
            <option value="">اختر المنتج</option>
            <option
              v-for="product in products"
              :key="product.id"
              :value="product.id"
            >
              {{ product.name }}
            </option>
          </select>
          <input
            v-model="line.quantity"
            type="number"
            min="1"
            step="1"
            :class="inputClass"
            placeholder="الكمية"
          />
          <input
            v-model="line.cost_price"
            type="number"
            min="0"
            step="0.01"
            :class="inputClass"
            placeholder="التكلفة"
          />
          <button
            type="button"
            class="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-red-600"
            :disabled="lines.length <= 1"
            @click="removeLine(line.key)"
          >
            <Trash2 class="h-4 w-4" :stroke-width="1.75" />
          </button>
        </div>
      </div>

      <div
        class="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white px-4 py-3"
      >
        <span class="text-sm text-slate-600">إجمالي الفاتورة</span>
        <span class="text-base font-bold text-brand-700">
          <MoneyAmount :amount="total" />
        </span>
      </div>

      <p v-if="error.general" class="text-sm text-red-600">{{ error.general }}</p>
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
        {{ isSaving ? 'جاري الحفظ...' : 'حفظ الفاتورة' }}
      </button>
    </template>
  </AppModal>
</template>
