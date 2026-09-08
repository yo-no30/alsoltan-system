<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { Plus, Trash2 } from '@lucide/vue'
import AppModal from '@/components/ui/AppModal.vue'
import MoneyAmount from '@/components/ui/MoneyAmount.vue'
import type { Account } from '@/types/database.types'
import type { JournalLineInput } from '@/stores/accounting'
import { ALAYH_LABEL, LAHU_LABEL, roundMoney } from '@/utils/accountingTerms'
import { toDateInputValue } from '@/utils/dateRange'

const props = defineProps<{
  open: boolean
  accounts: Account[]
  isSaving: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [payload: { entryDate: string; memo: string; lines: JournalLineInput[] }]
}>()

type LineDraft = {
  account_id: string
  alayh: string
  lahu: string
}

const form = reactive({
  entryDate: toDateInputValue(new Date()),
  memo: '',
  lines: [] as LineDraft[],
})

function emptyLine(): LineDraft {
  return { account_id: '', alayh: '', lahu: '' }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.entryDate = toDateInputValue(new Date())
    form.memo = ''
    form.lines = [emptyLine(), emptyLine()]
  },
)

const totals = computed(() => {
  let alayh = 0
  let lahu = 0
  for (const line of form.lines) {
    alayh += Number(line.alayh) || 0
    lahu += Number(line.lahu) || 0
  }
  return {
    alayh: roundMoney(alayh),
    lahu: roundMoney(lahu),
    balanced: roundMoney(alayh) === roundMoney(lahu) && alayh > 0,
  }
})

function addLine(): void {
  form.lines.push(emptyLine())
}

function removeLine(index: number): void {
  if (form.lines.length <= 2) return
  form.lines.splice(index, 1)
}

function submit(): void {
  const lines: JournalLineInput[] = form.lines
    .map((line) => ({
      account_id: line.account_id,
      alayh: roundMoney(Number(line.alayh) || 0),
      lahu: roundMoney(Number(line.lahu) || 0),
    }))
    .filter((line) => line.account_id && (line.alayh > 0 || line.lahu > 0))

  emit('save', {
    entryDate: form.entryDate,
    memo: form.memo.trim(),
    lines,
  })
}
</script>

<template>
  <AppModal
    :open="open"
    title="قيد يومية يدوي"
    size="xl"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block text-xs font-medium text-slate-600">
          التاريخ
          <input
            v-model="form.entryDate"
            type="date"
            class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <label class="block text-xs font-medium text-slate-600">
          البيان
          <input
            v-model="form.memo"
            type="text"
            placeholder="سبب القيد"
            class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </label>
      </div>

      <div class="overflow-x-auto rounded-lg border border-slate-200">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th class="px-3 py-2 text-right font-medium">الحساب</th>
              <th class="w-32 px-3 py-2 text-right font-medium">{{ ALAYH_LABEL }}</th>
              <th class="w-32 px-3 py-2 text-right font-medium">{{ LAHU_LABEL }}</th>
              <th class="w-12 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(line, index) in form.lines"
              :key="index"
              class="border-t border-slate-100"
            >
              <td class="px-2 py-1.5">
                <select
                  v-model="line.account_id"
                  class="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-brand-400"
                >
                  <option value="">اختر حساباً</option>
                  <option
                    v-for="account in accounts"
                    :key="account.id"
                    :value="account.id"
                  >
                    {{ account.code }} — {{ account.name }}
                  </option>
                </select>
              </td>
              <td class="px-2 py-1.5">
                <input
                  v-model="line.alayh"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full rounded-md border border-slate-200 px-2 py-1.5 text-left text-xs tabular-nums outline-none focus:border-brand-400"
                  @input="line.lahu = ''"
                />
              </td>
              <td class="px-2 py-1.5">
                <input
                  v-model="line.lahu"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full rounded-md border border-slate-200 px-2 py-1.5 text-left text-xs tabular-nums outline-none focus:border-brand-400"
                  @input="line.alayh = ''"
                />
              </td>
              <td class="px-2 py-1.5 text-center">
                <button
                  type="button"
                  class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-40"
                  :disabled="form.lines.length <= 2"
                  @click="removeLine(index)"
                >
                  <Trash2 class="h-3.5 w-3.5" :stroke-width="1.75" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          @click="addLine"
        >
          <Plus class="h-3.5 w-3.5" :stroke-width="2" />
          سطر إضافي
        </button>
        <div class="text-xs text-slate-600">
          مجموع {{ ALAYH_LABEL }}:
          <span class="font-semibold text-slate-900">
            <MoneyAmount :amount="totals.alayh" />
          </span>
          · مجموع {{ LAHU_LABEL }}:
          <span class="font-semibold text-slate-900">
            <MoneyAmount :amount="totals.lahu" />
          </span>
          <span
            class="ms-2 font-medium"
            :class="totals.balanced ? 'text-emerald-700' : 'text-amber-700'"
          >
            {{ totals.balanced ? 'متوازن' : 'غير متوازن' }}
          </span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          @click="emit('close')"
        >
          إلغاء
        </button>
        <button
          type="button"
          class="rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          :disabled="isSaving || !totals.balanced || !form.memo.trim()"
          @click="submit"
        >
          {{ isSaving ? 'جاري الحفظ...' : 'ترحيل القيد' }}
        </button>
      </div>
    </template>
  </AppModal>
</template>
