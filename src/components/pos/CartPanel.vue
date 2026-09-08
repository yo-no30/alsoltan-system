<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { LoaderCircle, Trash2 } from '@lucide/vue'
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

function formatMoney(value: number): string {
  return value.toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function onQuantityInput(productId: string, event: Event): void {
  const input = event.target as HTMLInputElement
  const parsed = Number.parseInt(input.value, 10)
  if (!Number.isFinite(parsed)) {
    return
  }
  cart.updateQuantity(productId, parsed)
}

function onQuantityBlur(productId: string, event: Event): void {
  const input = event.target as HTMLInputElement
  const parsed = Number.parseInt(input.value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    cart.removeItem(productId)
  } else {
    cart.updateQuantity(productId, parsed)
    input.value = String(parsed)
  }
  emit('focusSearch')
}

function onPriceInput(productId: string, event: Event): void {
  const input = event.target as HTMLInputElement
  const parsed = Number.parseFloat(input.value)
  if (!Number.isFinite(parsed)) {
    return
  }
  cart.updateUnitPrice(productId, parsed)
}

function onPriceBlur(productId: string, event: Event): void {
  const input = event.target as HTMLInputElement
  const parsed = Number.parseFloat(input.value)
  const safe = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  cart.updateUnitPrice(productId, safe)
  input.value = String(safe)
  emit('focusSearch')
}

function onCheckout(): void {
  if (props.isSubmitting || cart.lines.length === 0) return

  if (paymentType.value === 'credit' && !customerId.value) {
    return
  }

  emit('checkout', {
    paymentType: paymentType.value,
    customerId:
      paymentType.value === 'credit' ? customerId.value || null : null,
  })
}

function setPaymentType(next: SalePaymentType): void {
  paymentType.value = next
  if (next === 'cash') {
    customerId.value = ''
    customerSearch.value = ''
  }
}

onMounted(() => {
  void customersStore.fetchCustomers()
})

const cellInputClass =
  'w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-center text-[11px] text-slate-800 tabular-nums focus:border-slate-400 focus:outline-none'
</script>

<template>
  <aside
    class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm"
  >
    <header class="flex items-baseline justify-between border-b border-slate-200 px-3 py-2">
      <div>
        <h2 class="text-xs font-semibold tracking-wide text-slate-900">
          فاتورة البيع
        </h2>
        <p class="mt-0.5 text-[10px] text-slate-500">مشروبات السلطان</p>
      </div>
      <p class="text-[10px] text-slate-500">
        {{ cart.itemCount }} صنف
      </p>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <table class="w-full table-fixed border-collapse text-[11px]">
        <thead class="sticky top-0 bg-slate-50 text-slate-600">
          <tr class="border-b border-slate-200">
            <th class="w-[36%] px-2 py-1.5 text-start font-medium">المنتج</th>
            <th class="w-[14%] px-1 py-1.5 text-center font-medium">الكمية</th>
            <th class="w-[20%] px-1 py-1.5 text-center font-medium">سعر القطعة</th>
            <th class="w-[20%] px-1 py-1.5 text-center font-medium">الإجمالي</th>
            <th class="w-[10%] px-1 py-1.5 text-center font-medium" />
          </tr>
        </thead>
        <tbody>
          <tr v-if="cart.lines.length === 0">
            <td colspan="5" class="px-3 py-10 text-center text-slate-400">
              لا توجد بنود — أضف منتجات من القائمة
            </td>
          </tr>
          <tr
            v-for="line in cart.lines"
            :key="line.productId"
            class="border-b border-slate-100 last:border-b-0"
          >
            <td class="px-2 py-1.5 align-middle">
              <p class="line-clamp-2 font-medium leading-snug text-slate-900">
                {{ line.name }}
              </p>
            </td>
            <td class="px-1 py-1.5 align-middle">
              <input
                type="number"
                min="1"
                step="1"
                :value="line.quantity"
                :aria-label="`كمية ${line.name}`"
                :class="cellInputClass"
                @input="onQuantityInput(line.productId, $event)"
                @blur="onQuantityBlur(line.productId, $event)"
              />
            </td>
            <td class="px-1 py-1.5 align-middle">
              <input
                type="number"
                min="0"
                step="0.01"
                :value="line.unitPrice"
                :aria-label="`سعر ${line.name}`"
                :class="cellInputClass"
                @input="onPriceInput(line.productId, $event)"
                @blur="onPriceBlur(line.productId, $event)"
              />
            </td>
            <td class="px-1 py-1.5 align-middle text-center font-semibold tabular-nums text-slate-900">
              {{ formatMoney(cart.lineTotal(line.productId)) }}
            </td>
            <td class="px-1 py-1.5 align-middle text-center">
              <button
                type="button"
                class="rounded p-1 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                :aria-label="`حذف ${line.name}`"
                @click="cart.removeItem(line.productId); emit('focusSearch')"
              >
                <Trash2 class="mx-auto h-3.5 w-3.5" :stroke-width="1.75" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="space-y-2 border-t border-slate-200 px-3 py-2.5">
      <div
        class="flex items-center justify-between text-xs font-semibold text-slate-900"
      >
        <span>الإجمالي</span>
        <span class="tabular-nums">{{ formatMoney(cart.totalAmount) }} ر.ي</span>
      </div>

      <fieldset class="space-y-1.5">
        <legend class="text-[10px] font-medium text-slate-600">طريقة الدفع</legend>
        <div class="flex items-center gap-5">
          <label class="inline-flex cursor-pointer items-center gap-2">
            <input
              v-model="paymentType"
              type="radio"
              name="pos-payment-type"
              value="cash"
              class="h-3.5 w-3.5 border-slate-300 text-slate-900 focus:ring-slate-400"
              @change="setPaymentType('cash')"
            />
            <span class="text-[11px] text-slate-800">نقداً</span>
          </label>
          <label class="inline-flex cursor-pointer items-center gap-2">
            <input
              v-model="paymentType"
              type="radio"
              name="pos-payment-type"
              value="credit"
              class="h-3.5 w-3.5 border-slate-300 text-slate-900 focus:ring-slate-400"
              @change="setPaymentType('credit')"
            />
            <span class="text-[11px] text-slate-800">آجل</span>
          </label>
        </div>
      </fieldset>

      <div v-if="paymentType === 'credit'" class="space-y-1">
        <label class="block text-[10px] font-medium text-slate-600">
          العميل <span class="text-slate-900">*</span>
        </label>
        <input
          v-model="customerSearch"
          type="search"
          class="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] focus:border-slate-400 focus:outline-none"
          placeholder="بحث عن عميل..."
        />
        <select
          v-model="customerId"
          class="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] focus:border-slate-400 focus:outline-none"
        >
          <option value="">اختر عميلاً</option>
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
          class="text-[10px] text-slate-600"
        >
          ذمة سابقة: {{ formatMoney(selectedCustomer.balance_due) }} ر.ي
        </p>
        <p
          v-if="customersStore.customers.length === 0 && !customersStore.isLoading"
          class="text-[10px] text-slate-500"
        >
          لا يوجد عملاء. أضفهم من صفحة العملاء.
        </p>
      </div>

      <button
        type="button"
        class="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
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
