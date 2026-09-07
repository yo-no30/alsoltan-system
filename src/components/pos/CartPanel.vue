<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { LoaderCircle, Minus, Plus, Trash2 } from '@lucide/vue'
import { useCartStore } from '@/stores/cart'
import { useCustomersStore } from '@/stores/customers'
import type { SalePaymentType } from '@/types/database.types'

const props = defineProps<{
  isSubmitting?: boolean
}>()

const emit = defineEmits<{
  checkout: [payload: { paymentType: SalePaymentType; customerId: string | null }]
  focusSearch: []
}>()

const cart = useCartStore()
const customersStore = useCustomersStore()

const paymentType = ref<SalePaymentType>('cash')
const customerId = ref('')
const customerSearch = ref('')

const filteredCustomers = computed(() => {
  const query = customerSearch.value.trim().toLowerCase()
  if (!query) return customersStore.customers
  return customersStore.customers.filter((customer) => {
    const name = customer.name.toLowerCase()
    const phone = customer.phone?.toLowerCase() ?? ''
    return name.includes(query) || phone.includes(query)
  })
})

const selectedCustomer = computed(() =>
  customerId.value
    ? customersStore.customers.find((entry) => entry.id === customerId.value) ?? null
    : null,
)

const discountInput = computed({
  get: () =>
    cart.appliedDiscount === 0 ? '' : String(cart.appliedDiscount),
  set: (value: string) => {
    const parsed = Number.parseFloat(value)
    cart.setDiscount(Number.isFinite(parsed) ? parsed : 0)
  },
})

function formatMoney(value: number): string {
  return value.toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function onCheckout(): void {
  if (props.isSubmitting || cart.lines.length === 0) return

  if (paymentType.value === 'credit' && !customerId.value) {
    return
  }

  emit('checkout', {
    paymentType: paymentType.value,
    customerId: customerId.value || null,
  })
}

function onDiscountBlur(): void {
  emit('focusSearch')
}

onMounted(() => {
  void customersStore.fetchCustomers()
})
</script>

<template>
  <aside
    class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/70 bg-white/90 shadow-sm backdrop-blur-md"
  >
    <header class="border-b border-slate-200/70 px-3 py-2">
      <h2 class="text-sm font-semibold text-slate-900">سلة البيع</h2>
      <p class="text-[11px] text-slate-500">{{ cart.itemCount }} عنصر</p>
    </header>

    <div class="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
      <div
        v-if="cart.lines.length === 0"
        class="flex h-28 items-center justify-center text-xs text-slate-400"
      >
        أضف منتجات من القائمة
      </div>

      <div
        v-for="line in cart.lines"
        :key="line.productId"
        class="rounded-lg border border-slate-200/70 bg-slate-50/80 p-2"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="truncate text-xs font-semibold text-slate-900">
              {{ line.name }}
            </p>
            <p class="mt-0.5 text-[11px] text-slate-500">
              {{ formatMoney(line.unitPrice) }} ر.ي
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-red-600"
            :aria-label="'حذف'"
            @click="cart.removeItem(line.productId); emit('focusSearch')"
          >
            <Trash2 class="h-3.5 w-3.5" :stroke-width="1.75" />
          </button>
        </div>

        <div class="mt-2 flex items-center justify-between">
          <div class="inline-flex items-center gap-0.5 rounded-md border border-slate-200/70 bg-white p-0.5">
            <button
              type="button"
              class="flex h-7 w-7 items-center justify-center rounded text-slate-700 transition hover:bg-slate-50 active:scale-95"
              @click="cart.decrement(line.productId); emit('focusSearch')"
            >
              <Minus class="h-3.5 w-3.5" :stroke-width="2" />
            </button>
            <span class="min-w-6 text-center text-xs font-semibold text-slate-900">
              {{ line.quantity }}
            </span>
            <button
              type="button"
              class="flex h-7 w-7 items-center justify-center rounded text-slate-700 transition hover:bg-slate-50 active:scale-95"
              @click="cart.increment(line.productId); emit('focusSearch')"
            >
              <Plus class="h-3.5 w-3.5" :stroke-width="2" />
            </button>
          </div>
          <p class="text-xs font-bold text-slate-900">
            {{ formatMoney(cart.lineTotal(line.productId)) }} ر.ي
          </p>
        </div>
      </div>
    </div>

    <footer class="space-y-2 border-t border-slate-200/70 p-3">
      <div class="flex items-center justify-between text-xs text-slate-600">
        <span>المجموع الفرعي</span>
        <span class="font-medium text-slate-900">{{ formatMoney(cart.subtotal) }} ر.ي</span>
      </div>

      <div>
        <label for="pos-discount" class="mb-1 block text-[11px] font-medium text-slate-600">
          الخصم
        </label>
        <input
          id="pos-discount"
          v-model="discountInput"
          type="number"
          min="0"
          step="0.01"
          inputmode="decimal"
          class="w-full rounded-lg border border-slate-200/70 bg-white px-2.5 py-1.5 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          placeholder="0.00"
          @blur="onDiscountBlur"
        />
      </div>

      <div class="flex items-center justify-between text-sm font-bold text-slate-900">
        <span>الإجمالي</span>
        <span class="text-brand-700">{{ formatMoney(cart.totalAmount) }} ر.ي</span>
      </div>

      <div class="grid grid-cols-2 gap-1 rounded-lg border border-slate-200/70 bg-slate-50 p-0.5">
        <button
          type="button"
          class="rounded-md px-2 py-1.5 text-xs font-semibold transition"
          :class="
            paymentType === 'cash'
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          "
          @click="paymentType = 'cash'"
        >
          نقداً
        </button>
        <button
          type="button"
          class="rounded-md px-2 py-1.5 text-xs font-semibold transition"
          :class="
            paymentType === 'credit'
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          "
          @click="paymentType = 'credit'"
        >
          آجل
        </button>
      </div>

      <div class="space-y-1.5">
        <label class="block text-[11px] font-medium text-slate-600">
          العميل
          <span v-if="paymentType === 'credit'" class="text-red-500">*</span>
          <span v-else class="font-normal text-slate-400">(اختياري)</span>
        </label>
        <input
          v-model="customerSearch"
          type="search"
          class="w-full rounded-lg border border-slate-200/70 bg-white px-2.5 py-1.5 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          placeholder="بحث عن عميل..."
        />
        <select
          v-model="customerId"
          class="w-full rounded-lg border border-slate-200/70 bg-white px-2.5 py-1.5 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        >
          <option value="">{{ paymentType === 'credit' ? 'اختر عميلاً' : 'بدون عميل' }}</option>
          <option
            v-for="customer in filteredCustomers"
            :key="customer.id"
            :value="customer.id"
          >
            {{ customer.name }}{{ customer.phone ? ` — ${customer.phone}` : '' }}
          </option>
        </select>
        <p
          v-if="selectedCustomer && Number(selectedCustomer.balance_due) > 0"
          class="text-[11px] text-amber-700"
        >
          ذمة سابقة: {{ formatMoney(selectedCustomer.balance_due) }} ر.ي
        </p>
        <p
          v-if="customersStore.customers.length === 0 && !customersStore.isLoading"
          class="text-[11px] text-slate-500"
        >
          لا يوجد عملاء. أضفهم من صفحة العملاء.
        </p>
      </div>

      <button
        type="button"
        class="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="
          isSubmitting ||
          cart.lines.length === 0 ||
          (paymentType === 'credit' && !customerId)
        "
        @click="onCheckout"
      >
        <LoaderCircle
          v-if="isSubmitting"
          class="h-3.5 w-3.5 animate-spin"
          :stroke-width="2"
        />
        إتمام البيع وطباعة الفاتورة
      </button>
    </footer>
  </aside>
</template>
