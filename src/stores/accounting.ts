import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import {
  ACCOUNT_NATURE_LABELS,
  roundMoney,
  signedMovement,
  type AccountNature,
  type JournalSourceType,
} from '@/utils/accountingTerms'
import type {
  Account,
  AccountTypeRow,
  JournalEntry,
  JournalLine,
} from '@/types/database.types'

export type StoreResult<T = void> =
  | ({ ok: true } & (T extends void ? object : { data: T }))
  | { ok: false; message: string }

export type JournalLineInput = {
  account_id: string
  alayh: number
  lahu: number
  memo?: string
}

export type AccountWithType = Account & {
  account_type?: AccountTypeRow | null
}

export type JournalWithLines = JournalEntry & {
  lines: Array<JournalLine & { account?: AccountWithType | null }>
}

export type TrialBalanceRow = {
  account: AccountWithType
  totalAlayh: number
  totalLahu: number
  balance: number
}

export type LedgerRow = {
  entryId: string
  entryDate: string
  memo: string
  sourceType: JournalSourceType
  alayh: number
  lahu: number
  runningBalance: number
}

function mapError(error: { message?: string } | null, fallback: string): string {
  return error?.message?.trim() || fallback
}

function unwrapAccountType(
  raw: Account & { account_types?: AccountTypeRow | AccountTypeRow[] | null },
): AccountWithType {
  const rel = raw.account_types
  const account_type = Array.isArray(rel) ? (rel[0] ?? null) : (rel ?? null)
  const { account_types: _ignored, ...rest } = raw
  return { ...rest, account_type }
}

export const useAccountingStore = defineStore('accounting', () => {
  const accountTypes = ref<AccountTypeRow[]>([])
  const accounts = ref<AccountWithType[]>([])
  const entries = ref<JournalWithLines[]>([])
  const isLoading = ref(false)
  const isSaving = ref(false)

  const postableAccounts = computed(() =>
    accounts.value.filter((account) => account.is_postable && account.is_active),
  )

  const cashAccount = computed(
    () => accounts.value.find((account) => account.system_key === 'cash') ?? null,
  )

  const activeAccountTypes = computed(() =>
    accountTypes.value
      .filter((row) => row.is_active)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
  )

  function natureOf(account: AccountWithType): AccountNature {
    return (account.account_type?.nature ?? 'asset') as AccountNature
  }

  function accountsGroupedByType(): Array<{
    type: AccountTypeRow
    accounts: AccountWithType[]
  }> {
    return activeAccountTypes.value.map((type) => ({
      type,
      accounts: accounts.value.filter((account) => account.type_id === type.id),
    }))
  }

  async function fetchAccountTypes(): Promise<StoreResult> {
    try {
      const { data, error } = await supabase
        .from('account_types')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      if (error) {
        console.error('[accounting] fetchAccountTypes:', error.message)
        return { ok: false, message: mapError(error, 'تعذر تحميل أنواع الحسابات.') }
      }

      accountTypes.value = data ?? []
      return { ok: true }
    } catch (error) {
      console.error('[accounting] fetchAccountTypes unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء تحميل أنواع الحسابات.' }
    }
  }

  async function fetchAccounts(): Promise<StoreResult> {
    isLoading.value = true
    try {
      const typesResult = await fetchAccountTypes()
      if (!typesResult.ok) return typesResult

      const { data, error } = await supabase
        .from('accounts')
        .select('*, account_types(*)')
        .order('code', { ascending: true })

      if (error) {
        console.error('[accounting] fetchAccounts:', error.message)
        return { ok: false, message: mapError(error, 'تعذر تحميل شجرة الحسابات.') }
      }

      accounts.value = (data ?? []).map((row) =>
        unwrapAccountType(
          row as Account & {
            account_types?: AccountTypeRow | AccountTypeRow[] | null
          },
        ),
      )
      return { ok: true }
    } catch (error) {
      console.error('[accounting] fetchAccounts unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء تحميل الحسابات.' }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchEntries(limit = 100): Promise<StoreResult> {
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*, journal_lines(*, accounts(*, account_types(*)))')
        .eq('status', 'posted')
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('[accounting] fetchEntries:', error.message)
        return { ok: false, message: mapError(error, 'تعذر تحميل القيود.') }
      }

      entries.value = (data ?? []).map((row) => {
        const raw = row as JournalEntry & {
          journal_lines?: Array<
            JournalLine & {
              accounts?:
                | (Account & {
                    account_types?: AccountTypeRow | AccountTypeRow[] | null
                  })
                | Array<
                    Account & {
                      account_types?: AccountTypeRow | AccountTypeRow[] | null
                    }
                  >
                | null
            }
          >
        }
        const lines = (raw.journal_lines ?? []).map((line) => {
          const accountRel = line.accounts
          const accountRaw = Array.isArray(accountRel)
            ? (accountRel[0] ?? null)
            : (accountRel ?? null)
          const account = accountRaw ? unwrapAccountType(accountRaw) : null
          const { accounts: _ignored, ...rest } = line
          return { ...rest, account }
        })
        const { journal_lines: _jl, ...entry } = raw
        return { ...entry, lines }
      })

      return { ok: true }
    } catch (error) {
      console.error('[accounting] fetchEntries unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء تحميل القيود.' }
    } finally {
      isLoading.value = false
    }
  }

  async function createAccountType(input: {
    name: string
    nature: AccountNature
    sort_order?: number
  }): Promise<StoreResult<AccountTypeRow>> {
    isSaving.value = true
    try {
      const name = input.name.trim()
      if (!name) return { ok: false, message: 'اسم النوع مطلوب.' }

      const { data, error } = await supabase
        .from('account_types')
        .insert({
          name,
          nature: input.nature,
          sort_order: input.sort_order ?? 100,
          is_active: true,
        })
        .select('*')
        .single()

      if (error || !data) {
        console.error('[accounting] createAccountType:', error?.message)
        return { ok: false, message: mapError(error, 'تعذر إضافة نوع الحساب.') }
      }

      accountTypes.value = [...accountTypes.value, data].sort(
        (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
      )
      return { ok: true, data }
    } catch (error) {
      console.error('[accounting] createAccountType unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء إضافة نوع الحساب.' }
    } finally {
      isSaving.value = false
    }
  }

  async function createAccount(input: {
    code: string
    name: string
    type_id: string
    is_postable: boolean
  }): Promise<StoreResult<AccountWithType>> {
    isSaving.value = true
    try {
      const code = input.code.trim()
      const name = input.name.trim()
      if (!code || !name) {
        return { ok: false, message: 'رمز الحساب والاسم مطلوبان.' }
      }
      if (!input.type_id) {
        return { ok: false, message: 'يجب اختيار نوع الحساب.' }
      }

      const { data, error } = await supabase
        .from('accounts')
        .insert({
          code,
          name,
          type_id: input.type_id,
          is_postable: input.is_postable,
          is_active: true,
          system_key: null,
        })
        .select('*, account_types(*)')
        .single()

      if (error || !data) {
        console.error('[accounting] createAccount:', error?.message)
        return { ok: false, message: mapError(error, 'تعذر إضافة الحساب.') }
      }

      const mapped = unwrapAccountType(
        data as Account & {
          account_types?: AccountTypeRow | AccountTypeRow[] | null
        },
      )
      accounts.value = [...accounts.value, mapped].sort((a, b) =>
        a.code.localeCompare(b.code),
      )
      return { ok: true, data: mapped }
    } catch (error) {
      console.error('[accounting] createAccount unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء إضافة الحساب.' }
    } finally {
      isSaving.value = false
    }
  }

  async function setAccountActive(
    accountId: string,
    isActive: boolean,
  ): Promise<StoreResult<AccountWithType>> {
    isSaving.value = true
    try {
      const existing = accounts.value.find((row) => row.id === accountId)
      if (existing?.system_key) {
        return { ok: false, message: 'لا يمكن إيقاف حساب نظامي.' }
      }

      const { data, error } = await supabase
        .from('accounts')
        .update({ is_active: isActive })
        .eq('id', accountId)
        .select('*, account_types(*)')
        .single()

      if (error || !data) {
        console.error('[accounting] setAccountActive:', error?.message)
        return { ok: false, message: mapError(error, 'تعذر تحديث الحساب.') }
      }

      const mapped = unwrapAccountType(
        data as Account & {
          account_types?: AccountTypeRow | AccountTypeRow[] | null
        },
      )
      const idx = accounts.value.findIndex((row) => row.id === accountId)
      if (idx >= 0) accounts.value[idx] = mapped
      return { ok: true, data: mapped }
    } catch (error) {
      console.error('[accounting] setAccountActive unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء تحديث الحساب.' }
    } finally {
      isSaving.value = false
    }
  }

  async function createManualEntry(input: {
    entryDate: string
    memo: string
    lines: JournalLineInput[]
  }): Promise<StoreResult<{ id: string }>> {
    isSaving.value = true
    try {
      const payloadLines = input.lines.map((line) => ({
        account_id: line.account_id,
        alayh: roundMoney(line.alayh),
        lahu: roundMoney(line.lahu),
        memo: line.memo ?? '',
      }))

      const { data, error } = await supabase.rpc('create_manual_journal_entry', {
        p_entry_date: input.entryDate,
        p_memo: input.memo,
        p_lines: payloadLines,
      })

      if (error || !data) {
        console.error('[accounting] createManualEntry:', error?.message)
        return { ok: false, message: mapError(error, 'تعذر حفظ القيد اليدوي.') }
      }

      await fetchEntries()
      return { ok: true, data: { id: data } }
    } catch (error) {
      console.error('[accounting] createManualEntry unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء حفظ القيد.' }
    } finally {
      isSaving.value = false
    }
  }

  async function buildTrialBalance(): Promise<StoreResult<TrialBalanceRow[]>> {
    try {
      if (accounts.value.length === 0) {
        const loaded = await fetchAccounts()
        if (!loaded.ok) return loaded
      }

      const { data, error } = await supabase
        .from('journal_lines')
        .select('account_id, amount_alayh, amount_lahu, journal_entries!inner(status)')
        .eq('journal_entries.status', 'posted')

      if (error) {
        console.error('[accounting] trialBalance:', error.message)
        return { ok: false, message: mapError(error, 'تعذر بناء ميزان المراجعة.') }
      }

      const totals = new Map<string, { alayh: number; lahu: number }>()
      for (const row of data ?? []) {
        const current = totals.get(row.account_id) ?? { alayh: 0, lahu: 0 }
        current.alayh = roundMoney(current.alayh + Number(row.amount_alayh))
        current.lahu = roundMoney(current.lahu + Number(row.amount_lahu))
        totals.set(row.account_id, current)
      }

      const rows: TrialBalanceRow[] = accounts.value
        .filter((account) => account.is_postable)
        .map((account) => {
          const total = totals.get(account.id) ?? { alayh: 0, lahu: 0 }
          return {
            account,
            totalAlayh: total.alayh,
            totalLahu: total.lahu,
            balance: signedMovement(natureOf(account), total.alayh, total.lahu),
          }
        })
        .filter((row) => row.totalAlayh !== 0 || row.totalLahu !== 0 || row.balance !== 0)

      return { ok: true, data: rows }
    } catch (error) {
      console.error('[accounting] trialBalance unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء ميزان المراجعة.' }
    }
  }

  async function buildAccountLedger(
    accountId: string,
  ): Promise<StoreResult<LedgerRow[]>> {
    try {
      const account = accounts.value.find((entry) => entry.id === accountId)
      if (!account) {
        return { ok: false, message: 'الحساب غير موجود.' }
      }

      const { data, error } = await supabase
        .from('journal_lines')
        .select(
          'amount_alayh, amount_lahu, entry_id, journal_entries!inner(id, entry_date, memo, source_type, status, created_at)',
        )
        .eq('account_id', accountId)
        .eq('journal_entries.status', 'posted')
        .order('created_at', {
          ascending: true,
          foreignTable: 'journal_entries',
        })

      if (error) {
        console.error('[accounting] ledger:', error.message)
        return { ok: false, message: mapError(error, 'تعذر تحميل دفتر الأستاذ.') }
      }

      type LineJoin = {
        amount_alayh: number
        amount_lahu: number
        entry_id: string
        journal_entries:
          | {
              id: string
              entry_date: string
              memo: string
              source_type: JournalSourceType
              status: string
              created_at: string
            }
          | {
              id: string
              entry_date: string
              memo: string
              source_type: JournalSourceType
              status: string
              created_at: string
            }[]
      }

      const sorted = ([...(data ?? [])] as LineJoin[]).sort((a, b) => {
        const ea = Array.isArray(a.journal_entries)
          ? a.journal_entries[0]
          : a.journal_entries
        const eb = Array.isArray(b.journal_entries)
          ? b.journal_entries[0]
          : b.journal_entries
        const dateCmp = (ea?.entry_date ?? '').localeCompare(eb?.entry_date ?? '')
        if (dateCmp !== 0) return dateCmp
        return (ea?.created_at ?? '').localeCompare(eb?.created_at ?? '')
      })

      let running = 0
      const rows: LedgerRow[] = sorted.map((line) => {
        const entry = Array.isArray(line.journal_entries)
          ? line.journal_entries[0]
          : line.journal_entries
        const alayh = Number(line.amount_alayh)
        const lahu = Number(line.amount_lahu)
        running = roundMoney(
          running + signedMovement(natureOf(account), alayh, lahu),
        )
        return {
          entryId: entry?.id ?? line.entry_id,
          entryDate: entry?.entry_date ?? '',
          memo: entry?.memo ?? '',
          sourceType: (entry?.source_type ?? 'manual') as JournalSourceType,
          alayh,
          lahu,
          runningBalance: running,
        }
      })

      return { ok: true, data: rows }
    } catch (error) {
      console.error('[accounting] ledger unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء دفتر الأستاذ.' }
    }
  }

  async function buildIncomeStatement(): Promise<
    StoreResult<{
      revenue: number
      expenses: number
      netIncome: number
      revenueRows: TrialBalanceRow[]
      expenseRows: TrialBalanceRow[]
    }>
  > {
    const trial = await buildTrialBalance()
    if (!trial.ok) return trial

    const revenueRows = trial.data.filter(
      (row) => natureOf(row.account) === 'revenue',
    )
    const expenseRows = trial.data.filter(
      (row) => natureOf(row.account) === 'expense',
    )

    const revenue = roundMoney(
      revenueRows.reduce((sum, row) => sum + Math.abs(row.balance), 0),
    )
    const expenses = roundMoney(
      expenseRows.reduce((sum, row) => sum + Math.abs(row.balance), 0),
    )

    return {
      ok: true,
      data: {
        revenue,
        expenses,
        netIncome: roundMoney(revenue - expenses),
        revenueRows,
        expenseRows,
      },
    }
  }

  function natureLabel(nature: AccountNature): string {
    return ACCOUNT_NATURE_LABELS[nature]
  }

  async function transferCashToBank(input: {
    amount: number
    memo?: string
  }): Promise<StoreResult<{ id: string }>> {
    isSaving.value = true
    try {
      if (!Number.isFinite(input.amount) || input.amount <= 0) {
        return { ok: false, message: 'مبلغ التحويل يجب أن يكون أكبر من صفر.' }
      }

      const { data, error } = await supabase.rpc('transfer_cash_to_bank', {
        p_amount: roundMoney(input.amount),
        p_memo: input.memo ?? '',
      })

      if (error || !data) {
        console.error('[accounting] transfer:', error?.message)
        return {
          ok: false,
          message: mapError(error, 'تعذر تحويل الصندوق إلى البنك.'),
        }
      }

      return { ok: true, data: { id: data } }
    } catch (error) {
      console.error('[accounting] transfer unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء التحويل.' }
    } finally {
      isSaving.value = false
    }
  }

  return {
    accountTypes,
    accounts,
    entries,
    isLoading,
    isSaving,
    postableAccounts,
    cashAccount,
    activeAccountTypes,
    natureOf,
    accountsGroupedByType,
    fetchAccountTypes,
    fetchAccounts,
    fetchEntries,
    createAccountType,
    createAccount,
    setAccountActive,
    createManualEntry,
    transferCashToBank,
    buildTrialBalance,
    buildAccountLedger,
    buildIncomeStatement,
    natureLabel,
  }
})
