<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { LoaderCircle } from '@lucide/vue'
import { homePathForRole, useAuthStore } from '@/stores/auth'
import { useToast } from '@/stores/toast'

const auth = useAuthStore()
const toast = useToast()
const router = useRouter()

const form = reactive({
  email: '',
  password: '',
})

const touched = reactive({
  email: false,
  password: false,
})

const submitAttempted = ref(false)

const emailError = computed(() => {
  if (!touched.email && !submitAttempted.value) return ''
  const value = form.email.trim()
  if (!value) return 'البريد الإلكتروني مطلوب'
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  if (!valid) return 'صيغة البريد الإلكتروني غير صحيحة'
  return ''
})

const passwordError = computed(() => {
  if (!touched.password && !submitAttempted.value) return ''
  if (!form.password) return 'كلمة المرور مطلوبة'
  if (form.password.length < 6) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
  return ''
})

const isFormValid = computed(
  () =>
    form.email.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) &&
    form.password.length >= 6,
)

async function onSubmit(): Promise<void> {
  submitAttempted.value = true
  touched.email = true
  touched.password = true

  if (!isFormValid.value) {
    return
  }

  const result = await auth.signIn(form.email, form.password)

  if (!result.ok) {
    toast.error(result.message)
    return
  }

  toast.success('تم تسجيل الدخول بنجاح')
  await router.replace(homePathForRole(auth.role))
}
</script>

<template>
  <div
    dir="rtl"
    class="flex min-h-dvh items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100/80 px-3 py-6 sm:px-4 sm:py-10"
  >
    <div
      class="w-full max-w-md rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-md backdrop-blur-md sm:p-8"
    >
      <header class="mb-6 text-center sm:mb-8">
        <div
          class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-lg font-bold text-white shadow-sm"
          aria-hidden="true"
        >
          س
        </div>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900">
          مشروبات السلطان
        </h1>
        <p class="mt-1 text-sm text-slate-500">Sultan Beverages</p>
        <p class="mt-3 text-sm text-slate-600">تسجيل الدخول إلى نظام الإدارة</p>
      </header>

      <form class="space-y-5" novalidate @submit.prevent="onSubmit">
        <div>
          <label
            for="login-email"
            class="mb-1.5 block text-sm font-medium text-slate-700"
          >
            البريد الإلكتروني
          </label>
          <input
            id="login-email"
            v-model="form.email"
            type="email"
            autocomplete="username"
            dir="ltr"
            class="w-full rounded-xl border border-slate-200/70 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            :class="emailError ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : ''"
            placeholder="admin@example.com"
            @blur="touched.email = true"
          />
          <p v-if="emailError" class="mt-1.5 text-xs text-red-600">
            {{ emailError }}
          </p>
        </div>

        <div>
          <label
            for="login-password"
            class="mb-1.5 block text-sm font-medium text-slate-700"
          >
            كلمة المرور
          </label>
          <input
            id="login-password"
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            dir="ltr"
            class="w-full rounded-xl border border-slate-200/70 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            :class="passwordError ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : ''"
            placeholder="••••••••"
            @blur="touched.password = true"
          />
          <p v-if="passwordError" class="mt-1.5 text-xs text-red-600">
            {{ passwordError }}
          </p>
        </div>

        <p
          v-if="auth.errorMessage"
          class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {{ auth.errorMessage }}
        </p>

        <button
          type="submit"
          class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="auth.isLoading"
        >
          <LoaderCircle
            v-if="auth.isLoading"
            class="h-4 w-4 animate-spin"
            :stroke-width="2"
          />
          {{ auth.isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول' }}
        </button>
      </form>
    </div>
  </div>
</template>
