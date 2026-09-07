<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import type { Customer } from '@/types/database.types'

const props = defineProps<{
  open: boolean
  customer: Customer | null
  isSaving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [payload: { name: string; phone: string | null; notes: string | null }]
}>()

const form = reactive({ name: '', phone: '', notes: '' })
const error = reactive({ name: '' })

const title = computed(() =>
  props.customer ? 'تعديل عميل' : 'إضافة عميل',
)

watch(
  () => [props.open, props.customer] as const,
  ([isOpen]) => {
    if (!isOpen) return
    form.name = props.customer?.name ?? ''
    form.phone = props.customer?.phone ?? ''
    form.notes = props.customer?.notes ?? ''
    error.name = ''
  },
)

function onSubmit(): void {
  if (!form.name.trim()) {
    error.name = 'اسم العميل مطلوب'
    return
  }
  error.name = ''
  emit('save', {
    name: form.name.trim(),
    phone: form.phone.trim() || null,
    notes: form.notes.trim() || null,
  })
}

const inputClass =
  'w-full rounded-xl border border-slate-200/70 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25'
</script>

<template>
  <AppModal :open="open" :title="title" @close="emit('close')">
    <div class="space-y-4">
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">اسم العميل</label>
        <input v-model="form.name" type="text" :class="inputClass" />
        <p v-if="error.name" class="mt-1 text-xs text-red-600">{{ error.name }}</p>
      </div>
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">الجوال</label>
        <input v-model="form.phone" type="tel" dir="ltr" :class="inputClass" />
      </div>
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">ملاحظات</label>
        <textarea
          v-model="form.notes"
          rows="3"
          :class="inputClass"
          placeholder="عنوان، شروط ائتمان، ملاحظات..."
        />
      </div>
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
        {{ isSaving ? 'جاري الحفظ...' : 'حفظ' }}
      </button>
    </template>
  </AppModal>
</template>
