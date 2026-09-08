import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { AccountingPeriod } from '@/types/database.types'

export type StoreResult<T = void> =
  | ({ ok: true } & (T extends void ? object : { data: T }))
  | { ok: false; message: string }

function mapError(error: { message?: string } | null, fallback: string): string {
  return error?.message?.trim() || fallback
}

export const usePeriodsStore = defineStore('periods', () => {
  const periods = ref<AccountingPeriod[]>([])
  const isLoading = ref(false)
  const isSaving = ref(false)

  async function fetchPeriods(): Promise<StoreResult> {
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('accounting_periods')
        .select('*')
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .limit(36)

      if (error) {
        console.error('[periods] fetch:', error.message)
        return { ok: false, message: mapError(error, 'تعذر تحميل الفترات المحاسبية.') }
      }
      periods.value = data ?? []
      return { ok: true }
    } catch (error) {
      console.error('[periods] fetch unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء تحميل الفترات.' }
    } finally {
      isLoading.value = false
    }
  }

  async function closePeriod(input: {
    year: number
    month: number
    memo?: string
  }): Promise<StoreResult<AccountingPeriod>> {
    isSaving.value = true
    try {
      const { data, error } = await supabase.rpc('close_accounting_period', {
        p_year: input.year,
        p_month: input.month,
        p_memo: input.memo ?? '',
      })
      if (error || !data) {
        console.error('[periods] close:', error?.message)
        return { ok: false, message: mapError(error, 'تعذر إقفال الفترة.') }
      }
      await fetchPeriods()
      return { ok: true, data }
    } catch (error) {
      console.error('[periods] close unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء الإقفال.' }
    } finally {
      isSaving.value = false
    }
  }

  async function reopenPeriod(input: {
    year: number
    month: number
    memo: string
  }): Promise<StoreResult<AccountingPeriod>> {
    isSaving.value = true
    try {
      const memo = input.memo.trim()
      if (!memo) {
        return { ok: false, message: 'سبب إعادة الفتح إلزامي.' }
      }
      const { data, error } = await supabase.rpc('reopen_accounting_period', {
        p_year: input.year,
        p_month: input.month,
        p_memo: memo,
      })
      if (error || !data) {
        console.error('[periods] reopen:', error?.message)
        return { ok: false, message: mapError(error, 'تعذر إعادة فتح الفترة.') }
      }
      await fetchPeriods()
      return { ok: true, data }
    } catch (error) {
      console.error('[periods] reopen unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء إعادة الفتح.' }
    } finally {
      isSaving.value = false
    }
  }

  return {
    periods,
    isLoading,
    isSaving,
    fetchPeriods,
    closePeriod,
    reopenPeriod,
  }
})
