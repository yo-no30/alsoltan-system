<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Plus, RefreshCw } from '@lucide/vue'
import ManualJournalModal from '@/components/accounting/ManualJournalModal.vue'
import MoneyAmount from '@/components/ui/MoneyAmount.vue'
import RiyalSymbol from '@/components/ui/RiyalSymbol.vue'
import {
  useAccountingStore,
  type JournalLineInput,
  type LedgerRow,
  type TrialBalanceRow,
} from '@/stores/accounting'
import { usePeriodsStore } from '@/stores/periods'
import { useToast } from '@/stores/toast'
import type { Account, AccountingPeriod } from '@/types/database.types'
import {
  ALAYH_LABEL,
  LAHU_LABEL,
  ACCOUNT_NATURE_LABELS,
  JOURNAL_SOURCE_LABELS,
  type AccountNature,
  type JournalSourceType,
} from '@/utils/accountingTerms'
import { toDateInputValue } from '@/utils/dateRange'

type TabId =
  | 'accounts'
  | 'journals'
  | 'ledger'
  | 'cash'
  | 'income'
  | 'trial'
  | 'periods'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'accounts', label: 'شجرة الحسابات' },
  { id: 'journals', label: 'القيود اليومية' },
  { id: 'ledger', label: 'دفتر الأستاذ' },
  { id: 'cash', label: 'حركة الصندوق' },
  { id: 'income', label: 'قائمة الدخل' },
  { id: 'trial', label: 'ميزان المراجعة' },
  { id: 'periods', label: 'الفترات والإقفال' },
]

const accounting = useAccountingStore()
const periodsStore = usePeriodsStore()
const toast = useToast()

const activeTab = ref<TabId>('accounts')
const manualOpen = ref(false)
const accountFormOpen = ref(false)
const typeFormOpen = ref(false)

const ledgerAccountId = ref('')
const ledgerRows = ref<LedgerRow[]>([])
const cashRows = ref<LedgerRow[]>([])
const trialRows = ref<TrialBalanceRow[]>([])
const income = ref<{
  revenue: number
  expenses: number
  netIncome: number
  revenueRows: TrialBalanceRow[]
  expenseRows: TrialBalanceRow[]
} | null>(null)

const cashFrom = ref(toDateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
const cashTo = ref(toDateInputValue(new Date()))

const transferForm = reactive({
  amount: '',
  memo: '',
})

const nowDate = new Date()
const closeForm = reactive({
  year: nowDate.getFullYear(),
  month: nowDate.getMonth() + 1,
  memo: '',
})
const reopenMemoById = ref<Record<string, string>>({})

const typeForm = reactive({
  name: '',
  nature: 'expense' as AccountNature,
})

const accountForm = reactive({
  code: '',
  name: '',
  type_id: '' as string,
  is_postable: true,
})

const accountGroups = computed(() => accounting.accountsGroupedByType())

const natureOptions = computed(() =>
  (Object.keys(ACCOUNT_NATURE_LABELS) as AccountNature[]).map((nature) => ({
    value: nature,
    label: ACCOUNT_NATURE_LABELS[nature],
  })),
)

async function loadBase(): Promise<void> {
  const [accountsResult, entriesResult] = await Promise.all([
    accounting.fetchAccounts(),
    accounting.fetchEntries(150),
  ])
  if (!accountsResult.ok) toast.error(accountsResult.message)
  if (!entriesResult.ok) toast.error(entriesResult.message)

  if (!ledgerAccountId.value && accounting.postableAccounts.length > 0) {
    ledgerAccountId.value = accounting.postableAccounts[0]?.id ?? ''
  }
}

async function loadLedger(): Promise<void> {
  if (!ledgerAccountId.value) {
    ledgerRows.value = []
    return
  }
  const result = await accounting.buildAccountLedger(ledgerAccountId.value)
  if (!result.ok) {
    toast.error(result.message)
    ledgerRows.value = []
    return
  }
  ledgerRows.value = result.data
}

async function loadCash(): Promise<void> {
  const cash = accounting.cashAccount
  if (!cash) {
    cashRows.value = []
    return
  }
  const result = await accounting.buildAccountLedger(cash.id)
  if (!result.ok) {
    toast.error(result.message)
    cashRows.value = []
    return
  }
  let opening = 0
  for (const row of result.data) {
    if (cashFrom.value && row.entryDate < cashFrom.value) {
      opening = row.runningBalance
    } else {
      break
    }
  }
  const filtered = result.data.filter((row) => {
    if (cashFrom.value && row.entryDate < cashFrom.value) return false
    if (cashTo.value && row.entryDate > cashTo.value) return false
    return true
  })
  let running = opening
  cashRows.value = filtered.map((row) => {
    running = Math.round((running + row.alayh - row.lahu) * 100) / 100
    return { ...row, runningBalance: running }
  })
}

async function onTransferToBank(): Promise<void> {
  const result = await accounting.transferCashToBank({
    amount: Number(transferForm.amount),
    memo: transferForm.memo.trim(),
  })
  if (!result.ok) {
    toast.error(result.message)
    return
  }
  toast.success('تم تحويل المبلغ إلى البنك')
  transferForm.amount = ''
  transferForm.memo = ''
  await refreshActive()
}

async function loadTrial(): Promise<void> {
  const result = await accounting.buildTrialBalance()
  if (!result.ok) {
    toast.error(result.message)
    trialRows.value = []
    return
  }
  trialRows.value = result.data
}

async function loadIncome(): Promise<void> {
  const result = await accounting.buildIncomeStatement()
  if (!result.ok) {
    toast.error(result.message)
    income.value = null
    return
  }
  income.value = result.data
}

async function refreshActive(): Promise<void> {
  await loadBase()
  if (activeTab.value === 'ledger') await loadLedger()
  if (activeTab.value === 'cash') await loadCash()
  if (activeTab.value === 'trial') await loadTrial()
  if (activeTab.value === 'income') await loadIncome()
  if (activeTab.value === 'periods') {
    const result = await periodsStore.fetchPeriods()
    if (!result.ok) toast.error(result.message)
  }
}

watch(activeTab, async (tab) => {
  if (tab === 'ledger') await loadLedger()
  if (tab === 'cash') await loadCash()
  if (tab === 'trial') await loadTrial()
  if (tab === 'income') await loadIncome()
  if (tab === 'periods') {
    const result = await periodsStore.fetchPeriods()
    if (!result.ok) toast.error(result.message)
  }
})

watch(ledgerAccountId, () => {
  if (activeTab.value === 'ledger') void loadLedger()
})

watch([cashFrom, cashTo], () => {
  if (activeTab.value === 'cash') void loadCash()
})

function sourceLabel(source: JournalSourceType): string {
  return JOURNAL_SOURCE_LABELS[source] ?? source
}

function entryTotals(entry: (typeof accounting.entries)[number]): {
  alayh: number
  lahu: number
} {
  return entry.lines.reduce(
    (acc, line) => ({
      alayh: acc.alayh + Number(line.amount_alayh),
      lahu: acc.lahu + Number(line.amount_lahu),
    }),
    { alayh: 0, lahu: 0 },
  )
}

async function onToggleAccount(account: Account): Promise<void> {
  if (account.system_key) {
    toast.error('لا يمكن تعطيل الحسابات النظامية.')
    return
  }
  const result = await accounting.setAccountActive(account.id, !account.is_active)
  if (!result.ok) {
    toast.error(result.message)
    return
  }
  toast.success(result.data.is_active ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب')
}

async function onCreateAccountType(): Promise<void> {
  const result = await accounting.createAccountType({
    name: typeForm.name,
    nature: typeForm.nature,
  })
  if (!result.ok) {
    toast.error(result.message)
    return
  }
  toast.success('تم إضافة النوع')
  typeFormOpen.value = false
  typeForm.name = ''
  typeForm.nature = 'expense'
}

async function onCreateAccount(): Promise<void> {
  const result = await accounting.createAccount({
    code: accountForm.code,
    name: accountForm.name,
    type_id: accountForm.type_id,
    is_postable: accountForm.is_postable,
  })
  if (!result.ok) {
    toast.error(result.message)
    return
  }
  toast.success('تم إضافة الحساب')
  accountFormOpen.value = false
  accountForm.code = ''
  accountForm.name = ''
  accountForm.type_id = accounting.activeAccountTypes[0]?.id ?? ''
  accountForm.is_postable = true
}

function openAccountForm(): void {
  if (!accountForm.type_id && accounting.activeAccountTypes[0]) {
    accountForm.type_id = accounting.activeAccountTypes[0].id
  }
  accountFormOpen.value = !accountFormOpen.value
  if (accountFormOpen.value) typeFormOpen.value = false
}

function openTypeForm(): void {
  typeFormOpen.value = !typeFormOpen.value
  if (typeFormOpen.value) accountFormOpen.value = false
}

async function onSaveManual(payload: {
  entryDate: string
  memo: string
  lines: JournalLineInput[]
}): Promise<void> {
  if (payload.lines.length < 2) {
    toast.error('القيد يحتاج سطرين على الأقل.')
    return
  }
  if (!payload.memo.trim()) {
    toast.error('بيان القيد اليدوي إلزامي.')
    return
  }
  const result = await accounting.createManualEntry(payload)
  if (!result.ok) {
    toast.error(result.message)
    return
  }
  toast.success('تم ترحيل القيد اليدوي')
  manualOpen.value = false
  await refreshActive()
}

async function onClosePeriod(): Promise<void> {
  const result = await periodsStore.closePeriod({
    year: closeForm.year,
    month: closeForm.month,
    memo: closeForm.memo.trim(),
  })
  if (!result.ok) {
    toast.error(result.message)
    return
  }
  toast.success('تم إقفال الفترة المحاسبية')
  closeForm.memo = ''
  await accounting.fetchEntries()
}

async function onReopenPeriod(period: AccountingPeriod): Promise<void> {
  const memo = (reopenMemoById.value[period.id] ?? '').trim()
  const result = await periodsStore.reopenPeriod({
    year: period.period_year,
    month: period.period_month,
    memo,
  })
  if (!result.ok) {
    toast.error(result.message)
    return
  }
  toast.success('تم إعادة فتح الفترة')
  reopenMemoById.value[period.id] = ''
  await accounting.fetchEntries()
}

function formatPeriodDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('ar-YE')
}

const trialTotals = computed(() =>
  trialRows.value.reduce(
    (acc, row) => ({
      alayh: acc.alayh + row.totalAlayh,
      lahu: acc.lahu + row.totalLahu,
    }),
    { alayh: 0, lahu: 0 },
  ),
)

const cashNet = computed(() => {
  if (cashRows.value.length === 0) return 0
  return cashRows.value[cashRows.value.length - 1]?.runningBalance ?? 0
})

onMounted(() => {
  void refreshActive()
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3">
    <header
      class="flex shrink-0 flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="min-w-0">
        <h1 class="text-base font-semibold text-slate-900">المحاسبة</h1>
        <p class="mt-1 text-xs text-slate-500">
          قيود مزدوجة بـ{{ ALAYH_LABEL }} و{{ LAHU_LABEL }}
            ·
            <span class="inline-flex items-center gap-1">
              العملة
              <RiyalSymbol />
            </span>
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          :disabled="accounting.isLoading"
          @click="refreshActive"
        >
          <RefreshCw
            class="h-4 w-4"
            :class="accounting.isLoading ? 'animate-spin' : ''"
            :stroke-width="1.75"
          />
          تحديث
        </button>
        <button
          v-if="activeTab === 'accounts'"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          @click="openTypeForm"
        >
          <Plus class="h-4 w-4" :stroke-width="2" />
          نوع
        </button>
        <button
          v-if="activeTab === 'accounts'"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          @click="openAccountForm"
        >
          <Plus class="h-4 w-4" :stroke-width="2" />
          حساب
        </button>
        <button
          v-if="activeTab === 'journals'"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600"
          @click="manualOpen = true"
        >
          <Plus class="h-4 w-4" :stroke-width="2" />
          قيد يدوي
        </button>
      </div>
    </header>

    <nav class="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 pb-px">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        type="button"
        class="shrink-0 rounded-t-lg px-3 py-2 text-xs font-medium transition"
        :class="
          activeTab === tab.id
            ? 'border border-b-white border-slate-200 bg-white text-brand-700'
            : 'border border-transparent text-slate-500 hover:text-slate-800'
        "
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <div class="min-h-0 flex-1 overflow-auto">
      <!-- شجرة الحسابات -->
      <section v-if="activeTab === 'accounts'" class="space-y-3">
        <div
          v-if="typeFormOpen"
          class="rounded-lg border border-slate-200 bg-white p-3"
        >
          <h2 class="mb-3 text-sm font-semibold text-slate-900">إضافة نوع</h2>
          <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <label class="text-xs text-slate-600 lg:col-span-2">
              اسم النوع
              <input
                v-model="typeForm.name"
                class="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                placeholder="مثال: مصاريف تشغيل"
              />
            </label>
            <label class="text-xs text-slate-600">
              الطبيعة (للتقارير)
              <select
                v-model="typeForm.nature"
                class="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              >
                <option
                  v-for="opt in natureOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </label>
          </div>
          <div class="mt-3 flex gap-2">
            <button
              type="button"
              class="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              :disabled="accounting.isSaving || !typeForm.name.trim()"
              @click="onCreateAccountType"
            >
              حفظ النوع
            </button>
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
              @click="typeFormOpen = false"
            >
              إلغاء
            </button>
          </div>
        </div>

        <div
          v-if="accountFormOpen"
          class="rounded-lg border border-slate-200 bg-white p-3"
        >
          <h2 class="mb-3 text-sm font-semibold text-slate-900">إضافة حساب</h2>
          <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label class="text-xs text-slate-600">
              الرمز
              <input
                v-model="accountForm.code"
                class="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                placeholder="5398"
              />
            </label>
            <label class="text-xs text-slate-600 lg:col-span-2">
              الاسم
              <input
                v-model="accountForm.name"
                class="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                placeholder="مصروف كهرباء"
              />
            </label>
            <label class="text-xs text-slate-600">
              النوع
              <select
                v-model="accountForm.type_id"
                class="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              >
                <option value="" disabled>اختر النوع</option>
                <option
                  v-for="type in accounting.activeAccountTypes"
                  :key="type.id"
                  :value="type.id"
                >
                  {{ type.name }}
                </option>
              </select>
            </label>
          </div>
          <label class="mt-2 flex items-center gap-2 text-xs text-slate-600">
            <input
              v-model="accountForm.is_postable"
              type="checkbox"
              class="rounded border-slate-300"
            />
            قابل للترحيل (يظهر في القيود)
          </label>
          <div class="mt-3 flex gap-2">
            <button
              type="button"
              class="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              :disabled="accounting.isSaving"
              @click="onCreateAccount"
            >
              حفظ
            </button>
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
              @click="accountFormOpen = false"
            >
              إلغاء
            </button>
          </div>
        </div>

        <div
          v-for="group in accountGroups"
          :key="group.type.id"
          class="overflow-hidden rounded-lg border border-slate-200 bg-white"
        >
          <div
            class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-brand-50 px-3 py-2"
          >
            <p class="text-xs font-semibold text-brand-800">
              {{ group.type.name }}
            </p>
            <p class="text-[11px] text-brand-700/80">
              {{ accounting.natureLabel(group.type.nature) }}
            </p>
          </div>
          <table class="min-w-full text-sm">
            <thead class="text-xs text-slate-500">
              <tr>
                <th class="px-3 py-2 text-right font-medium">الرمز</th>
                <th class="px-3 py-2 text-right font-medium">الاسم</th>
                <th class="px-3 py-2 text-right font-medium">ترحيل</th>
                <th class="px-3 py-2 text-right font-medium">نظامي</th>
                <th class="px-3 py-2 text-right font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="account in group.accounts"
                :key="account.id"
                class="border-t border-slate-100"
                :class="account.is_active ? '' : 'opacity-50'"
              >
                <td class="px-3 py-2 font-mono text-xs tabular-nums text-slate-700">
                  {{ account.code }}
                </td>
                <td class="px-3 py-2 text-slate-900">{{ account.name }}</td>
                <td class="px-3 py-2 text-xs text-slate-500">
                  {{ account.is_postable ? 'نعم' : 'لا' }}
                </td>
                <td class="px-3 py-2 text-xs text-slate-500">
                  {{ account.system_key ? 'نعم' : '—' }}
                </td>
                <td class="px-3 py-2">
                  <button
                    v-if="!account.system_key"
                    type="button"
                    class="text-xs font-medium text-brand-700 hover:underline"
                    :disabled="accounting.isSaving"
                    @click="onToggleAccount(account)"
                  >
                    {{ account.is_active ? 'إيقاف' : 'تفعيل' }}
                  </button>
                  <span v-else class="text-xs text-slate-400">نشط</span>
                </td>
              </tr>
              <tr v-if="group.accounts.length === 0">
                <td colspan="5" class="px-3 py-4 text-center text-xs text-slate-400">
                  لا حسابات تحت هذا النوع
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- القيود -->
      <section v-else-if="activeTab === 'journals'" class="space-y-3">
        <div
          v-if="accounting.entries.length === 0"
          class="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400"
        >
          لا توجد قيود بعد. ستظهر تلقائياً بعد البيع والشراء والتحصيل والسداد.
        </div>
        <article
          v-for="entry in accounting.entries"
          :key="entry.id"
          class="overflow-hidden rounded-lg border border-slate-200 bg-white"
        >
          <header
            class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-slate-900">
                {{ entry.memo || 'بدون بيان' }}
              </p>
              <p class="mt-0.5 text-xs text-slate-500">
                {{ entry.entry_date }}
                ·
                {{ sourceLabel(entry.source_type as JournalSourceType) }}
              </p>
            </div>
            <div class="flex items-center gap-1 text-xs text-slate-600">
              {{ ALAYH_LABEL }}
              <MoneyAmount :amount="entryTotals(entry).alayh" />
              =
              {{ LAHU_LABEL }}
              <MoneyAmount :amount="entryTotals(entry).lahu" />
            </div>
          </header>
          <table class="min-w-full text-sm">
            <thead class="text-xs text-slate-500">
              <tr>
                <th class="px-3 py-1.5 text-right font-medium">الحساب</th>
                <th class="w-28 px-3 py-1.5 text-left font-medium">{{ ALAYH_LABEL }}</th>
                <th class="w-28 px-3 py-1.5 text-left font-medium">{{ LAHU_LABEL }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="line in entry.lines"
                :key="line.id"
                class="border-t border-slate-50"
              >
                <td class="px-3 py-1.5 text-slate-800">
                  <span class="font-mono text-xs text-slate-500">{{ line.account?.code }}</span>
                  {{ line.account?.name ?? '—' }}
                </td>
                <td class="px-3 py-1.5 text-left text-slate-800">
                  <MoneyAmount
                    v-if="Number(line.amount_alayh) > 0"
                    :amount="Number(line.amount_alayh)"
                  />
                  <template v-else>—</template>
                </td>
                <td class="px-3 py-1.5 text-left text-slate-800">
                  <MoneyAmount
                    v-if="Number(line.amount_lahu) > 0"
                    :amount="Number(line.amount_lahu)"
                  />
                  <template v-else>—</template>
                </td>
              </tr>
            </tbody>
          </table>
        </article>
      </section>

      <!-- دفتر الأستاذ -->
      <section v-else-if="activeTab === 'ledger'" class="space-y-3">
        <label class="block max-w-md text-xs font-medium text-slate-600">
          الحساب
          <select
            v-model="ledgerAccountId"
            class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option
              v-for="account in accounting.postableAccounts"
              :key="account.id"
              :value="account.id"
            >
              {{ account.code }} — {{ account.name }}
            </option>
          </select>
        </label>
        <div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table class="min-w-full text-sm">
            <thead class="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th class="px-3 py-2 text-right font-medium">التاريخ</th>
                <th class="px-3 py-2 text-right font-medium">البيان</th>
                <th class="px-3 py-2 text-right font-medium">المصدر</th>
                <th class="px-3 py-2 text-left font-medium">{{ ALAYH_LABEL }}</th>
                <th class="px-3 py-2 text-left font-medium">{{ LAHU_LABEL }}</th>
                <th class="px-3 py-2 text-left font-medium">الرصيد</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in ledgerRows"
                :key="`${row.entryId}-${row.entryDate}-${row.alayh}-${row.lahu}`"
                class="border-t border-slate-100"
              >
                <td class="px-3 py-2 tabular-nums text-slate-700">{{ row.entryDate }}</td>
                <td class="px-3 py-2 text-slate-800">{{ row.memo || '—' }}</td>
                <td class="px-3 py-2 text-xs text-slate-500">{{ sourceLabel(row.sourceType) }}</td>
                <td class="px-3 py-2 text-left">
                  <MoneyAmount v-if="row.alayh > 0" :amount="row.alayh" />
                  <template v-else>—</template>
                </td>
                <td class="px-3 py-2 text-left">
                  <MoneyAmount v-if="row.lahu > 0" :amount="row.lahu" />
                  <template v-else>—</template>
                </td>
                <td class="px-3 py-2 text-left font-medium text-slate-900">
                  <MoneyAmount :amount="row.runningBalance" />
                </td>
              </tr>
              <tr v-if="ledgerRows.length === 0">
                <td colspan="6" class="px-3 py-8 text-center text-xs text-slate-400">
                  لا حركة على هذا الحساب
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- حركة الصندوق -->
      <section v-else-if="activeTab === 'cash'" class="space-y-3">
        <div class="rounded-lg border border-slate-200 bg-white p-3 lg:max-w-md">
          <h2 class="text-sm font-semibold text-slate-900">تحويل صندوق → بنك</h2>
          <div class="mt-2 grid gap-2 sm:grid-cols-2">
            <label class="text-xs text-slate-600">
              المبلغ
              <input
                v-model="transferForm.amount"
                type="number"
                min="0"
                step="0.01"
                class="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm tabular-nums"
              />
            </label>
            <label class="text-xs text-slate-600">
              البيان
              <input
                v-model="transferForm.memo"
                type="text"
                class="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
            </label>
          </div>
          <button
            type="button"
            class="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            :disabled="accounting.isSaving || !transferForm.amount"
            @click="onTransferToBank"
          >
            تحويل
          </button>
        </div>

        <div class="flex flex-wrap items-end gap-3">
          <label class="text-xs font-medium text-slate-600">
            من
            <input
              v-model="cashFrom"
              type="date"
              class="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label class="text-xs font-medium text-slate-600">
            إلى
            <input
              v-model="cashTo"
              type="date"
              class="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <p class="pb-2 text-xs text-slate-500">
            رصيد الفترة (تقريبي من الحركات المعروضة):
            <span class="font-semibold text-slate-900">
              <MoneyAmount :amount="cashNet" />
            </span>
          </p>
        </div>
        <div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table class="min-w-full text-sm">
            <thead class="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th class="px-3 py-2 text-right font-medium">التاريخ</th>
                <th class="px-3 py-2 text-right font-medium">البيان</th>
                <th class="px-3 py-2 text-right font-medium">المصدر</th>
                <th class="px-3 py-2 text-left font-medium">دخل (عليه)</th>
                <th class="px-3 py-2 text-left font-medium">خرج (له)</th>
                <th class="px-3 py-2 text-left font-medium">الرصيد</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in cashRows"
                :key="`cash-${row.entryId}-${row.alayh}-${row.lahu}`"
                class="border-t border-slate-100"
              >
                <td class="px-3 py-2 tabular-nums">{{ row.entryDate }}</td>
                <td class="px-3 py-2">{{ row.memo || '—' }}</td>
                <td class="px-3 py-2 text-xs text-slate-500">{{ sourceLabel(row.sourceType) }}</td>
                <td class="px-3 py-2 text-left text-emerald-800">
                  <MoneyAmount v-if="row.alayh > 0" :amount="row.alayh" />
                  <template v-else>—</template>
                </td>
                <td class="px-3 py-2 text-left text-rose-800">
                  <MoneyAmount v-if="row.lahu > 0" :amount="row.lahu" />
                  <template v-else>—</template>
                </td>
                <td class="px-3 py-2 text-left font-medium">
                  <MoneyAmount :amount="row.runningBalance" />
                </td>
              </tr>
              <tr v-if="cashRows.length === 0">
                <td colspan="6" class="px-3 py-8 text-center text-xs text-slate-400">
                  لا حركة صندوق في الفترة المحددة
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- قائمة الدخل -->
      <section v-else-if="activeTab === 'income'" class="space-y-3">
        <div class="grid gap-2 sm:grid-cols-3">
          <div class="rounded-lg border border-slate-200 bg-white px-3 py-3">
            <p class="text-xs text-slate-500">الإيرادات</p>
            <p class="mt-1 text-lg font-semibold text-slate-900">
              <MoneyAmount :amount="income?.revenue ?? 0" />
            </p>
          </div>
          <div class="rounded-lg border border-slate-200 bg-white px-3 py-3">
            <p class="text-xs text-slate-500">المصروفات</p>
            <p class="mt-1 text-lg font-semibold text-slate-900">
              <MoneyAmount :amount="income?.expenses ?? 0" />
            </p>
          </div>
          <div class="rounded-lg border border-slate-200 bg-white px-3 py-3">
            <p class="text-xs text-slate-500">صافي الدخل</p>
            <p
              class="mt-1 text-lg font-semibold"
              :class="(income?.netIncome ?? 0) >= 0 ? 'text-emerald-800' : 'text-rose-800'"
            >
              <MoneyAmount :amount="income?.netIncome ?? 0" />
            </p>
          </div>
        </div>

        <div class="grid gap-3 lg:grid-cols-2">
          <div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div class="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold">
              تفصيل الإيرادات
            </div>
            <table class="min-w-full text-sm">
              <tbody>
                <tr
                  v-for="row in income?.revenueRows ?? []"
                  :key="row.account.id"
                  class="border-t border-slate-100"
                >
                  <td class="px-3 py-2">{{ row.account.name }}</td>
                  <td class="px-3 py-2 text-left">
                    <MoneyAmount :amount="Math.abs(row.balance)" />
                  </td>
                </tr>
                <tr v-if="!(income?.revenueRows.length)">
                  <td class="px-3 py-6 text-center text-xs text-slate-400" colspan="2">
                    لا إيرادات مسجّلة
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div class="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold">
              تفصيل المصروفات
            </div>
            <table class="min-w-full text-sm">
              <tbody>
                <tr
                  v-for="row in income?.expenseRows ?? []"
                  :key="row.account.id"
                  class="border-t border-slate-100"
                >
                  <td class="px-3 py-2">{{ row.account.name }}</td>
                  <td class="px-3 py-2 text-left">
                    <MoneyAmount :amount="Math.abs(row.balance)" />
                  </td>
                </tr>
                <tr v-if="!(income?.expenseRows.length)">
                  <td class="px-3 py-6 text-center text-xs text-slate-400" colspan="2">
                    لا مصروفات مسجّلة
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- ميزان المراجعة -->
      <section v-else-if="activeTab === 'trial'" class="space-y-3">
        <div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table class="min-w-full text-sm">
            <thead class="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th class="px-3 py-2 text-right font-medium">الرمز</th>
                <th class="px-3 py-2 text-right font-medium">الحساب</th>
                <th class="px-3 py-2 text-left font-medium">{{ ALAYH_LABEL }}</th>
                <th class="px-3 py-2 text-left font-medium">{{ LAHU_LABEL }}</th>
                <th class="px-3 py-2 text-left font-medium">الرصيد</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in trialRows"
                :key="row.account.id"
                class="border-t border-slate-100"
              >
                <td class="px-3 py-2 font-mono text-xs">{{ row.account.code }}</td>
                <td class="px-3 py-2">{{ row.account.name }}</td>
                <td class="px-3 py-2 text-left"><MoneyAmount :amount="row.totalAlayh" /></td>
                <td class="px-3 py-2 text-left"><MoneyAmount :amount="row.totalLahu" /></td>
                <td class="px-3 py-2 text-left font-medium">
                  <MoneyAmount :amount="row.balance" />
                </td>
              </tr>
              <tr v-if="trialRows.length === 0">
                <td colspan="5" class="px-3 py-8 text-center text-xs text-slate-400">
                  لا أرصدة بعد
                </td>
              </tr>
            </tbody>
            <tfoot v-if="trialRows.length > 0" class="border-t border-slate-200 bg-slate-50">
              <tr>
                <td colspan="2" class="px-3 py-2 text-xs font-semibold text-slate-700">
                  الإجمالي
                </td>
                <td class="px-3 py-2 text-left text-xs font-semibold">
                  <MoneyAmount :amount="trialTotals.alayh" />
                </td>
                <td class="px-3 py-2 text-left text-xs font-semibold">
                  <MoneyAmount :amount="trialTotals.lahu" />
                </td>
                <td class="px-3 py-2 text-left text-xs text-slate-500">
                  {{
                    trialTotals.alayh === trialTotals.lahu
                      ? 'متوازن'
                      : 'تحقق من القيود'
                  }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <!-- الفترات والإقفال -->
      <section v-else-if="activeTab === 'periods'" class="space-y-3">
        <div class="rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
          بعد إقفال الشهر لن تُقبل أي قيود بتاريخ داخل ذلك الشهر (بيع، شراء، قيد يدوي…).
          الإقفال يرحّل صافي الدخل إلى حساب «أرباح مرحلة».
        </div>

        <div class="rounded-lg border border-slate-200 bg-white p-3">
          <h2 class="text-sm font-semibold text-slate-900">إقفال فترة</h2>
          <div class="mt-2 grid max-w-2xl gap-2 sm:grid-cols-3">
            <label class="text-xs text-slate-600">
              السنة
              <input
                v-model.number="closeForm.year"
                type="number"
                class="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
            </label>
            <label class="text-xs text-slate-600">
              الشهر
              <input
                v-model.number="closeForm.month"
                type="number"
                min="1"
                max="12"
                class="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
            </label>
            <label class="text-xs text-slate-600 sm:col-span-3">
              بيان الإقفال (اختياري)
              <input
                v-model="closeForm.memo"
                type="text"
                class="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                placeholder="مثال: إقفال مارس 2026"
              />
            </label>
          </div>
          <button
            type="button"
            class="mt-3 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            :disabled="periodsStore.isSaving"
            @click="onClosePeriod"
          >
            إقفال الفترة
          </button>
        </div>

        <div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table class="min-w-full text-sm">
            <thead class="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th class="px-3 py-2 text-right font-medium">الفترة</th>
                <th class="px-3 py-2 text-right font-medium">الحالة</th>
                <th class="px-3 py-2 text-right font-medium">تاريخ الإقفال</th>
                <th class="px-3 py-2 text-right font-medium">إعادة الفتح</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="period in periodsStore.periods"
                :key="period.id"
                class="border-t border-slate-100"
              >
                <td class="px-3 py-2 font-medium tabular-nums text-slate-900">
                  {{ period.period_year }}/{{
                    String(period.period_month).padStart(2, '0')
                  }}
                </td>
                <td class="px-3 py-2 text-xs">
                  <span
                    :class="
                      period.status === 'open'
                        ? 'font-medium text-emerald-700'
                        : 'font-medium text-slate-600'
                    "
                  >
                    {{ period.status === 'open' ? 'مفتوحة' : 'مقفلة' }}
                  </span>
                </td>
                <td class="px-3 py-2 text-xs text-slate-500">
                  {{ formatPeriodDate(period.closed_at) }}
                </td>
                <td class="px-3 py-2">
                  <div
                    v-if="period.status === 'closed'"
                    class="flex flex-wrap items-center gap-2"
                  >
                    <input
                      v-model="reopenMemoById[period.id]"
                      type="text"
                      placeholder="سبب إعادة الفتح"
                      class="min-w-[12rem] flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                    />
                    <button
                      type="button"
                      class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      :disabled="periodsStore.isSaving"
                      @click="onReopenPeriod(period)"
                    >
                      إعادة فتح
                    </button>
                  </div>
                  <span v-else class="text-xs text-slate-400">—</span>
                </td>
              </tr>
              <tr v-if="periodsStore.periods.length === 0">
                <td colspan="4" class="px-3 py-8 text-center text-xs text-slate-400">
                  لا فترات بعد — تُنشأ تلقائياً عند أول قيد في الشهر
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <ManualJournalModal
      :open="manualOpen"
      :accounts="accounting.postableAccounts"
      :is-saving="accounting.isSaving"
      @close="manualOpen = false"
      @save="onSaveManual"
    />
  </div>
</template>
