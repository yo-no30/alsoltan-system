<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Plus, RefreshCw, Search, X } from '@lucide/vue'
import { useAccountingStore } from '@/stores/accounting'
import { useOperatingExpensesStore } from '@/stores/operatingExpenses'
import { useToast } from '@/stores/toast'
import MoneyAmount from '@/components/ui/MoneyAmount.vue'
import { toDateInputValue } from '@/utils/dateRange'

type PayFromFilter = '' | 'cash' | 'bank'

const accounting = useAccountingStore()
const expensesStore = useOperatingExpensesStore()
const toast = useToast()

const now = new Date()
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

const filters = reactive({
  dateFrom: toDateInputValue(monthStart),
  dateTo: toDateInputValue(now),
  accountId: '',
  payFrom: '' as PayFromFilter,
  memo: '',
})

const memoSearchOpen = ref(false)
const memoInputRef = ref<HTMLInputElement | null>(null)
const formOpen = ref(false)
const form = reactive({
  expenseDate: toDateInputValue(now),
  accountId: '',
  amount: '',
  payFrom: 'cash' as 'cash' | 'bank',
  memo: '',
})

const expenseAccounts = computed(() =>
  accounting.postableAccounts.filter(
    (account) =>
      account.is_active &&
      account.account_type?.name.trim() === 'مصروفات',
  ),
)

const compactField =
  'h-8 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 outline-none focus:border-brand-400'
const compactLabel = 'shrink-0 text-xs font-medium text-slate-500'
const headerFilter =
  'h-7 rounded-md border border-slate-200/80 bg-white px-1.5 text-xs font-normal text-slate-700 shadow-sm outline-none focus:border-brand-400'

let fetchTimer: ReturnType<typeof setTimeout> | null = null
let skipNextWatch = true

async function loadAccounts(): Promise<void> {
  const result = await accounting.fetchAccounts()
  if (!result.ok) toast.error(result.message)
  if (!form.accountId && expenseAccounts.value[0]) {
    form.accountId = expenseAccounts.value[0].id
  }
}

async function loadExpenses(): Promise<void> {
  const result = await expensesStore.fetchExpenses({
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    accountId: filters.accountId || undefined,
    payFrom: filters.payFrom,
    memo: filters.memo,
  })
  if (!result.ok) toast.error(result.message)
}

function scheduleLoadExpenses(delayMs = 0): void {
  if (fetchTimer) clearTimeout(fetchTimer)
  fetchTimer = setTimeout(() => {
    void loadExpenses()
  }, delayMs)
}

watch(
  filters,
  () => {
    if (skipNextWatch) {
      skipNextWatch = false
      return
    }
    const delay = filters.memo.trim() ? 280 : 0
    scheduleLoadExpenses(delay)
  },
  { deep: true },
)

async function refreshAll(): Promise<void> {
  await loadAccounts()
  await loadExpenses()
}

async function openMemoSearch(): Promise<void> {
  memoSearchOpen.value = true
  await Promise.resolve()
  memoInputRef.value?.focus()
}

function closeMemoSearch(): void {
  memoSearchOpen.value = false
}

function clearMemo(): void {
  filters.memo = ''
  if (!filters.memo) closeMemoSearch()
}

function openForm(): void {
  form.expenseDate = toDateInputValue(new Date())
  form.amount = ''
  form.memo = ''
  form.payFrom = 'cash'
  if (!form.accountId && expenseAccounts.value[0]) {
    form.accountId = expenseAccounts.value[0].id
  }
  formOpen.value = true
}

function closeForm(): void {
  formOpen.value = false
}

async function onSave(): Promise<void> {
  const result = await expensesStore.recordExpense({
    expenseDate: form.expenseDate,
    accountId: form.accountId,
    amount: Number(form.amount),
    payFrom: form.payFrom,
    memo: form.memo.trim(),
  })
  if (!result.ok) {
    toast.error(result.message)
    return
  }
  toast.success('تم تسجيل المصروف التشغيلي')
  closeForm()
  await loadExpenses()
}

function payFromLabel(payFrom: string): string {
  return payFrom === 'bank' ? 'البنك' : 'الصندوق'
}

onMounted(() => {
  void refreshAll()
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div
      class="flex min-h-0 flex-1 flex-col gap-3 rounded-xl border border-slate-200/70 bg-white/80 p-3 shadow-sm backdrop-blur-md"
    >
      <section class="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <label class="flex items-center gap-1.5">
            <span :class="compactLabel">من</span>
            <input
              v-model="filters.dateFrom"
              type="date"
              :class="[compactField, 'w-[8.5rem]']"
            />
          </label>
          <label class="flex items-center gap-1.5">
            <span :class="compactLabel">إلى</span>
            <input
              v-model="filters.dateTo"
              type="date"
              :class="[compactField, 'w-[8.5rem]']"
            />
          </label>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
            title="تحديث"
            aria-label="تحديث"
            @click="refreshAll"
          >
            <RefreshCw class="h-5 w-5" :stroke-width="1.75" />
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            @click="openForm"
          >
            <Plus class="h-5 w-5" :stroke-width="2" />
            قيد مصروف
          </button>
        </div>
      </section>

      <section
        v-if="formOpen"
        class="shrink-0 border-t border-slate-200/70 pt-3"
      >
        <h2 class="text-base font-semibold text-slate-900">قيد مصروف تشغيلي</h2>
        <div class="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <label class="text-sm text-slate-600">
            التاريخ
            <input
              v-model="form.expenseDate"
              type="date"
              class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-base"
            />
          </label>
          <label class="text-sm text-slate-600 lg:col-span-2">
            حساب المصروف
            <select
              v-model="form.accountId"
              class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-base"
            >
              <option
                v-for="account in expenseAccounts"
                :key="account.id"
                :value="account.id"
              >
                {{ account.code }} — {{ account.name }}
              </option>
            </select>
          </label>
          <label class="text-sm text-slate-600">
            المبلغ
            <input
              v-model="form.amount"
              type="number"
              min="0"
              step="0.01"
              class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-base tabular-nums"
            />
          </label>
          <label class="text-sm text-slate-600">
            الدفع من
            <select
              v-model="form.payFrom"
              class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-base"
            >
              <option value="cash">الصندوق</option>
              <option value="bank">البنك</option>
            </select>
          </label>
          <label class="text-sm text-slate-600 sm:col-span-2 lg:col-span-5">
            البيان
            <input
              v-model="form.memo"
              type="text"
              class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-base"
              placeholder="مثال: إيجار المحل — مارس"
            />
          </label>
        </div>
        <div class="mt-3 flex gap-2">
          <button
            type="button"
            class="rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            :disabled="expensesStore.isSaving || !form.amount"
            @click="onSave"
          >
            {{ expensesStore.isSaving ? 'جاري الحفظ...' : 'حفظ القيد' }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-600 hover:bg-slate-50"
            @click="closeForm"
          >
            إلغاء
          </button>
        </div>
      </section>

      <section
        class="min-h-0 flex-1 overflow-hidden border-t border-slate-200/70 pt-3"
      >
        <div
          v-if="expensesStore.isLoading"
          class="flex h-40 items-center justify-center text-base text-slate-400"
        >
          جاري التحميل...
        </div>
        <div v-else class="h-full overflow-auto">
          <table class="min-w-full border-collapse text-base">
            <thead
              class="sticky top-0 z-10 bg-brand-50 text-sm text-brand-800 backdrop-blur-sm"
            >
              <tr class="border-b border-brand-200/70">
                <th
                  class="border-s border-brand-200/60 px-3 py-3 text-right font-semibold tracking-wide"
                >
                  التاريخ
                </th>
                <th class="px-3 py-3 text-right font-semibold tracking-wide">
                  <div class="inline-flex max-w-full items-center gap-1.5">
                    <span>الحساب</span>
                    <select
                      v-model="filters.accountId"
                      :class="[headerFilter, 'max-w-[10.5rem]']"
                      title="فلترة الحساب"
                      aria-label="فلترة الحساب"
                      @click.stop
                    >
                      <option value="">الكل</option>
                      <option
                        v-for="account in expenseAccounts"
                        :key="account.id"
                        :value="account.id"
                      >
                        {{ account.code }} — {{ account.name }}
                      </option>
                    </select>
                  </div>
                </th>
                <th class="px-3 py-3 text-right font-semibold tracking-wide">
                  <div class="inline-flex max-w-full items-center gap-1.5">
                    <span>الدفع من</span>
                    <select
                      v-model="filters.payFrom"
                      :class="headerFilter"
                      title="فلترة الدفع من"
                      aria-label="فلترة الدفع من"
                      @click.stop
                    >
                      <option value="">الكل</option>
                      <option value="cash">الصندوق</option>
                      <option value="bank">البنك</option>
                    </select>
                  </div>
                </th>
                <th class="px-3 py-3 text-right font-semibold tracking-wide">
                  <div class="inline-flex max-w-full items-center gap-1.5">
                    <span>البيان</span>
                    <button
                      v-if="!memoSearchOpen && !filters.memo"
                      type="button"
                      class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-brand-200 bg-white text-brand-600 shadow-sm hover:bg-brand-50 hover:text-brand-800"
                      title="بحث في البيان"
                      aria-label="بحث في البيان"
                      @click.stop="openMemoSearch"
                    >
                      <Search class="h-4 w-4" :stroke-width="2" />
                    </button>
                    <div
                      v-else
                      class="relative inline-flex items-center"
                      @click.stop
                    >
                      <Search
                        class="pointer-events-none absolute start-2 h-3.5 w-3.5 text-brand-400"
                        :stroke-width="2"
                      />
                      <input
                        ref="memoInputRef"
                        v-model="filters.memo"
                        type="search"
                        class="h-7 w-40 rounded-md border border-brand-200 bg-white pe-7 ps-7 text-xs font-normal text-slate-700 shadow-sm outline-none focus:border-brand-500"
                        placeholder="بحث..."
                        @keydown.escape="closeMemoSearch"
                        @blur="
                          () => {
                            if (!filters.memo.trim()) closeMemoSearch()
                          }
                        "
                      />
                      <button
                        v-if="filters.memo"
                        type="button"
                        class="absolute end-0.5 inline-flex h-5 w-5 items-center justify-center rounded text-brand-400 hover:text-brand-700"
                        title="مسح البحث"
                        aria-label="مسح البحث"
                        @mousedown.prevent="clearMemo"
                      >
                        <X class="h-3.5 w-3.5" :stroke-width="2" />
                      </button>
                    </div>
                  </div>
                </th>
                <th
                  class="border-e border-brand-200/60 px-3 py-3 text-left font-semibold tracking-wide"
                >
                  المبلغ
                </th>
              </tr>
            </thead>
            <tbody class="bg-white">
              <tr
                v-for="row in expensesStore.expenses"
                :key="row.id"
                class="border-b border-brand-100/80 transition-colors hover:bg-brand-50/40"
              >
                <td
                  class="border-s border-brand-200/50 px-3 py-2.5 tabular-nums text-slate-500"
                >
                  {{ row.expense_date }}
                </td>
                <td class="px-3 py-2.5 font-medium text-slate-800">
                  {{ row.account?.name ?? '—' }}
                </td>
                <td class="px-3 py-2.5">
                  <span
                    class="inline-flex rounded-md px-2 py-0.5 text-sm"
                    :class="
                      row.pay_from === 'bank'
                        ? 'bg-brand-100 text-brand-900'
                        : 'bg-brand-50 text-brand-700'
                    "
                  >
                    {{ payFromLabel(row.pay_from) }}
                  </span>
                </td>
                <td class="px-3 py-2.5 text-slate-600">
                  {{ row.memo || '—' }}
                </td>
                <td
                  class="border-e border-brand-200/50 px-3 py-2.5 text-left font-semibold text-brand-800"
                >
                  <MoneyAmount :amount="Number(row.amount)" />
                </td>
              </tr>
              <tr v-if="expensesStore.expenses.length === 0">
                <td
                  colspan="5"
                  class="border-x border-b border-brand-200/60 px-3 py-14 text-center text-sm text-slate-400"
                >
                  لا مصاريف تشغيلية ضمن الفلتر الحالي
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>
