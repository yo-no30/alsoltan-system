<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Plus, RefreshCw } from '@lucide/vue'
import UsersTable from '@/components/users/UsersTable.vue'
import UserFormModal from '@/components/users/UserFormModal.vue'
import UserPasswordModal from '@/components/users/UserPasswordModal.vue'
import { useAuthStore } from '@/stores/auth'
import { useUsersStore } from '@/stores/users'
import { useToast } from '@/stores/toast'
import type { Profile, UserRole } from '@/types/database.types'

const auth = useAuthStore()
const usersStore = useUsersStore()
const toast = useToast()

const formOpen = ref(false)
const passwordOpen = ref(false)
const editing = ref<Profile | null>(null)
const resetting = ref<Profile | null>(null)

async function load(): Promise<void> {
  const result = await usersStore.fetchUsers()
  if (!result.ok) toast.error(result.message)
}

function openCreate(): void {
  editing.value = null
  formOpen.value = true
}

function openEdit(user: Profile): void {
  editing.value = user
  formOpen.value = true
}

function openPassword(user: Profile): void {
  resetting.value = user
  passwordOpen.value = true
}

async function onSave(payload: {
  full_name: string
  email?: string
  password?: string
  role: UserRole
  is_active: boolean
}): Promise<void> {
  if (editing.value) {
    const result = await usersStore.updateUser({
      user_id: editing.value.id,
      full_name: payload.full_name,
      role: payload.role,
      is_active: payload.is_active,
    })
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success('تم تحديث المستخدم')
    formOpen.value = false
    return
  }

  if (!payload.email || !payload.password) {
    toast.error('البريد وكلمة المرور مطلوبان')
    return
  }

  const result = await usersStore.createUser({
    email: payload.email,
    password: payload.password,
    full_name: payload.full_name,
    role: payload.role,
  })

  if (!result.ok) {
    toast.error(result.message)
    return
  }

  toast.success('تم إنشاء حساب المستخدم')
  formOpen.value = false
}

async function onResetPassword(password: string): Promise<void> {
  if (!resetting.value) return
  const result = await usersStore.resetPassword({
    user_id: resetting.value.id,
    password,
  })
  if (!result.ok) {
    toast.error(result.message)
    return
  }
  toast.success('تم تحديث كلمة المرور')
  passwordOpen.value = false
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-3">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-slate-900">
          المستخدمون
        </h1>
        <p class="mt-1 text-sm text-slate-500">
          إضافة حسابات الكاشير والمدراء وإدارة صلاحيات الدخول
          <span class="ms-2 text-slate-600">
            (نشط: {{ usersStore.activeCount }} · كاشير: {{ usersStore.cashierCount }})
          </span>
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/70 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          @click="load"
        >
          <RefreshCw class="h-4 w-4" :stroke-width="1.75" />
          تحديث
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
          @click="openCreate"
        >
          <Plus class="h-4 w-4" :stroke-width="2" />
          إضافة مستخدم
        </button>
      </div>
    </header>

    <div
      v-if="usersStore.isLoading"
      class="rounded-2xl border border-slate-200/70 bg-white p-10 text-center text-sm text-slate-400 shadow-sm"
    >
      جاري تحميل المستخدمين...
    </div>
    <UsersTable
      v-else
      :users="usersStore.users"
      :current-user-id="auth.user?.id ?? null"
      :is-busy="usersStore.isSaving"
      @edit="openEdit"
      @reset-password="openPassword"
    />

    <UserFormModal
      :open="formOpen"
      :user="editing"
      :is-saving="usersStore.isSaving"
      @close="formOpen = false"
      @save="onSave"
    />

    <UserPasswordModal
      :open="passwordOpen"
      :user="resetting"
      :is-saving="usersStore.isSaving"
      @close="passwordOpen = false"
      @save="onResetPassword"
    />
  </div>
</template>
