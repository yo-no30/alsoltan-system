<script setup lang="ts">
import { reactive, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import type { Profile } from '@/types/database.types'

const props = defineProps<{
  open: boolean
  user: Profile | null
  isSaving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [password: string]
}>()

const form = reactive({ password: '', confirm: '' })
const error = reactive({ password: '', confirm: '' })

watch(
  () => [props.open, props.user] as const,
  ([isOpen]) => {
    if (!isOpen) return
    form.password = ''
    form.confirm = ''
    error.password = ''
    error.confirm = ''
  },
)

function onSubmit(): void {
  error.password = form.password.length >= 6 ? '' : 'كلمة المرور 6 أحرف على الأقل'
  error.confirm =
    form.password === form.confirm ? '' : 'كلمتا المرور غير متطابقتين'
  if (error.password || error.confirm) return
  emit('save', form.password)
}

const inputClass =
  'w-full rounded-xl border border-slate-200/70 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25'
</script>

<template>
  <AppModal :open="open" title="تعيين كلمة مرور جديدة" @close="emit('close')">
    <div class="space-y-4">
      <p class="text-sm text-slate-600">
        المستخدم:
        <span class="font-semibold text-slate-900">{{ user?.full_name }}</span>
      </p>
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">
          كلمة المرور الجديدة
        </label>
        <input
          v-model="form.password"
          type="password"
          dir="ltr"
          autocomplete="new-password"
          :class="inputClass"
        />
        <p v-if="error.password" class="mt-1 text-xs text-red-600">
          {{ error.password }}
        </p>
      </div>
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">
          تأكيد كلمة المرور
        </label>
        <input
          v-model="form.confirm"
          type="password"
          dir="ltr"
          autocomplete="new-password"
          :class="inputClass"
        />
        <p v-if="error.confirm" class="mt-1 text-xs text-red-600">
          {{ error.confirm }}
        </p>
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
        {{ isSaving ? 'جاري الحفظ...' : 'تحديث كلمة المرور' }}
      </button>
    </template>
  </AppModal>
</template>
