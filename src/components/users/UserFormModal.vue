<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import type { Profile, UserRole } from '@/types/database.types'

const props = defineProps<{
  open: boolean
  user: Profile | null
  isSaving?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [
    payload: {
      full_name: string
      email?: string
      password?: string
      role: UserRole
      is_active: boolean
    },
  ]
}>()

const form = reactive({
  full_name: '',
  email: '',
  password: '',
  role: 'cashier' as UserRole,
  is_active: true,
})

const errors = reactive({
  full_name: '',
  email: '',
  password: '',
})

const isCreate = computed(() => props.user === null)
const title = computed(() =>
  isCreate.value ? 'إضافة مستخدم' : 'تعديل مستخدم',
)

watch(
  () => [props.open, props.user] as const,
  ([isOpen]) => {
    if (!isOpen) return
    form.full_name = props.user?.full_name ?? ''
    form.email = props.user?.email ?? ''
    form.password = ''
    form.role = props.user?.role ?? 'cashier'
    form.is_active = props.user?.is_active ?? true
    errors.full_name = ''
    errors.email = ''
    errors.password = ''
  },
)

function onSubmit(): void {
  errors.full_name = form.full_name.trim() ? '' : 'الاسم مطلوب'
  if (isCreate.value) {
    errors.email =
      form.email.trim() && form.email.includes('@')
        ? ''
        : 'بريد إلكتروني صالح مطلوب'
    errors.password =
      form.password.length >= 6 ? '' : 'كلمة المرور 6 أحرف على الأقل'
  } else {
    errors.email = ''
    errors.password = ''
  }

  if (errors.full_name || errors.email || errors.password) return

  emit('save', {
    full_name: form.full_name.trim(),
    email: isCreate.value ? form.email.trim().toLowerCase() : undefined,
    password: isCreate.value ? form.password : undefined,
    role: form.role,
    is_active: form.is_active,
  })
}

const inputClass =
  'w-full rounded-xl border border-slate-200/70 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25'
</script>

<template>
  <AppModal :open="open" :title="title" @close="emit('close')">
    <div class="space-y-4">
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">
          الاسم الكامل
        </label>
        <input v-model="form.full_name" type="text" :class="inputClass" />
        <p v-if="errors.full_name" class="mt-1 text-xs text-red-600">
          {{ errors.full_name }}
        </p>
      </div>

      <div v-if="isCreate">
        <label class="mb-1.5 block text-sm font-medium text-slate-700">
          البريد الإلكتروني (لتسجيل الدخول)
        </label>
        <input
          v-model="form.email"
          type="email"
          dir="ltr"
          autocomplete="off"
          :class="inputClass"
          placeholder="cashier@example.com"
        />
        <p v-if="errors.email" class="mt-1 text-xs text-red-600">
          {{ errors.email }}
        </p>
      </div>

      <div v-else>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">
          البريد الإلكتروني
        </label>
        <input
          :value="form.email"
          type="email"
          dir="ltr"
          disabled
          :class="inputClass + ' opacity-70'"
        />
      </div>

      <div v-if="isCreate">
        <label class="mb-1.5 block text-sm font-medium text-slate-700">
          كلمة المرور
        </label>
        <input
          v-model="form.password"
          type="password"
          dir="ltr"
          autocomplete="new-password"
          :class="inputClass"
        />
        <p v-if="errors.password" class="mt-1 text-xs text-red-600">
          {{ errors.password }}
        </p>
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">الدور</label>
        <select v-model="form.role" :class="inputClass">
          <option value="cashier">كاشير</option>
          <option value="admin">مدير</option>
        </select>
      </div>

      <label
        v-if="!isCreate"
        class="inline-flex items-center gap-2 text-sm text-slate-700"
      >
        <input v-model="form.is_active" type="checkbox" class="rounded text-brand-500" />
        حساب نشط (يمكنه تسجيل الدخول)
      </label>
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
