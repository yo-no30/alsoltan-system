import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Account, OperatingExpense } from '@/types/database.types'
import { roundMoney } from '@/utils/accountingTerms'

export type StoreResult<T = void> =
  | ({ ok: true } & (T extends void ? object : { data: T }))
  | { ok: false; message: string }

export type OperatingExpenseWithAccount = OperatingExpense & {
  account?: Account | null
}

export type OperatingExpenseFilters = {
  dateFrom?: string
  dateTo?: string
  accountId?: string
  payFrom?: 'cash' | 'bank' | ''
  memo?: string
}

function mapError(error: { message?: string } | null, fallback: string): string {
  return error?.message?.trim() || fallback
}

export const useOperatingExpensesStore = defineStore('operatingExpenses', () => {
  const expenses = ref<OperatingExpenseWithAccount[]>([])
  const isLoading = ref(false)
  const isSaving = ref(false)

  const totalAmount = computed(() =>
    roundMoney(expenses.value.reduce((sum, row) => sum + Number(row.amount), 0)),
  )

  async function fetchExpenses(
    filters: OperatingExpenseFilters = {},
  ): Promise<StoreResult> {
    isLoading.value = true
    try {
      let query = supabase
        .from('operating_expenses')
        .select('*, accounts(*)')
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500)

      if (filters.dateFrom) {
        query = query.gte('expense_date', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('expense_date', filters.dateTo)
      }
      if (filters.accountId) {
        query = query.eq('account_id', filters.accountId)
      }
      if (filters.payFrom === 'cash' || filters.payFrom === 'bank') {
        query = query.eq('pay_from', filters.payFrom)
      }
      const memo = filters.memo?.trim()
      if (memo) {
        query = query.ilike('memo', `%${memo}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('[operatingExpenses] fetch:', error.message)
        return { ok: false, message: mapError(error, 'تعذر تحميل المصاريف التشغيلية.') }
      }

      expenses.value = (data ?? []).map((row) => {
        const raw = row as OperatingExpense & {
          accounts?: Account | Account[] | null
        }
        const rel = raw.accounts
        const account = Array.isArray(rel) ? (rel[0] ?? null) : (rel ?? null)
        const { accounts: _a, ...rest } = raw
        return { ...rest, account }
      })
      return { ok: true }
    } catch (error) {
      console.error('[operatingExpenses] fetch unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء تحميل المصاريف التشغيلية.' }
    } finally {
      isLoading.value = false
    }
  }

  async function recordExpense(input: {
    expenseDate: string
    accountId: string
    amount: number
    payFrom: 'cash' | 'bank'
    memo?: string
  }): Promise<StoreResult<OperatingExpense>> {
    isSaving.value = true
    try {
      if (!input.accountId) {
        return { ok: false, message: 'اختر حساب المصروف.' }
      }
      if (!Number.isFinite(input.amount) || input.amount <= 0) {
        return { ok: false, message: 'مبلغ المصروف يجب أن يكون أكبر من صفر.' }
      }

      const { data, error } = await supabase.rpc('record_operating_expense', {
        p_expense_date: input.expenseDate,
        p_account_id: input.accountId,
        p_amount: roundMoney(input.amount),
        p_pay_from: input.payFrom,
        p_memo: input.memo ?? '',
      })

      if (error || !data) {
        console.error('[operatingExpenses] record:', error?.message)
        return { ok: false, message: mapError(error, 'تعذر تسجيل المصروف التشغيلي.') }
      }

      return { ok: true, data }
    } catch (error) {
      console.error('[operatingExpenses] record unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء تسجيل المصروف التشغيلي.' }
    } finally {
      isSaving.value = false
    }
  }

  return {
    expenses,
    isLoading,
    isSaving,
    totalAmount,
    fetchExpenses,
    recordExpense,
  }
})
