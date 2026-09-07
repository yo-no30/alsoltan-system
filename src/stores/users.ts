import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types/database.types'

export type StoreResult<T = void> =
  | ({ ok: true } & (T extends void ? object : { data: T }))
  | { ok: false; message: string }

interface ManageStaffResponse {
  ok: boolean
  message?: string
  data?: Profile
}

function mapError(error: { message?: string } | null, fallback: string): string {
  return error?.message?.trim() || fallback
}

export const useUsersStore = defineStore('users', () => {
  const users = ref<Profile[]>([])
  const isLoading = ref(false)
  const isSaving = ref(false)

  const activeCount = computed(
    () => users.value.filter((user) => user.is_active).length,
  )
  const cashierCount = computed(
    () => users.value.filter((user) => user.role === 'cashier').length,
  )

  function upsertUser(profile: Profile): void {
    const index = users.value.findIndex((entry) => entry.id === profile.id)
    if (index === -1) {
      users.value.push(profile)
    } else {
      users.value[index] = profile
    }
    users.value.sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'))
  }

  async function fetchUsers(): Promise<StoreResult> {
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('[users] fetch:', error.message)
        return { ok: false, message: mapError(error, 'تعذر تحميل المستخدمين.') }
      }

      users.value = data ?? []
      return { ok: true }
    } catch (error) {
      console.error('[users] fetch unexpected:', error)
      return { ok: false, message: 'حدث خطأ أثناء تحميل المستخدمين.' }
    } finally {
      isLoading.value = false
    }
  }

  async function invokeManageStaff(
    body: Record<string, unknown>,
  ): Promise<StoreResult<Profile | void>> {
    isSaving.value = true
    try {
      const { data, error } = await supabase.functions.invoke<ManageStaffResponse>(
        'manage-staff',
        { body },
      )

      const payload = data

      if (payload && payload.ok === false) {
        return {
          ok: false,
          message: payload.message || 'فشلت عملية إدارة المستخدم.',
        }
      }

      if (error) {
        console.error('[users] manage-staff invoke:', error.message)
        return {
          ok: false,
          message:
            payload?.message ||
            'تعذر الاتصال بخدمة إدارة المستخدمين. انشر الدالة manage-staff على Supabase.',
        }
      }

      if (!payload?.ok) {
        return {
          ok: false,
          message: payload?.message || 'فشلت عملية إدارة المستخدم.',
        }
      }

      if (payload.data) {
        upsertUser(payload.data)
        return { ok: true, data: payload.data }
      }

      return { ok: true }
    } catch (error) {
      console.error('[users] manage-staff unexpected:', error)
      return { ok: false, message: 'حدث خطأ غير متوقع أثناء إدارة المستخدم.' }
    } finally {
      isSaving.value = false
    }
  }

  async function createUser(input: {
    email: string
    password: string
    full_name: string
    role: UserRole
  }): Promise<StoreResult<Profile>> {
    const result = await invokeManageStaff({
      action: 'create',
      email: input.email,
      password: input.password,
      full_name: input.full_name,
      role: input.role,
    })

    if (!result.ok) return result
    if (!('data' in result) || !result.data) {
      return { ok: false, message: 'تعذر إنشاء المستخدم.' }
    }
    return { ok: true, data: result.data }
  }

  async function updateUser(input: {
    user_id: string
    full_name: string
    role: UserRole
    is_active: boolean
  }): Promise<StoreResult<Profile>> {
    const result = await invokeManageStaff({
      action: 'update_profile',
      user_id: input.user_id,
      full_name: input.full_name,
      role: input.role,
      is_active: input.is_active,
    })

    if (!result.ok) return result
    if (!('data' in result) || !result.data) {
      return { ok: false, message: 'تعذر تحديث المستخدم.' }
    }
    return { ok: true, data: result.data }
  }

  async function resetPassword(input: {
    user_id: string
    password: string
  }): Promise<StoreResult> {
    const result = await invokeManageStaff({
      action: 'reset_password',
      user_id: input.user_id,
      password: input.password,
    })
    if (!result.ok) return result
    return { ok: true }
  }

  return {
    users,
    isLoading,
    isSaving,
    activeCount,
    cashierCount,
    fetchUsers,
    createUser,
    updateUser,
    resetPassword,
  }
})
