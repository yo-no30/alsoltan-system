import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types/database.types'

function mapAuthError(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('invalid login credentials')) {
    return 'بيانات الدخول غير صحيحة. تحقق من البريد وكلمة المرور.'
  }
  if (lower.includes('email not confirmed')) {
    return 'يجب تأكيد البريد الإلكتروني قبل تسجيل الدخول.'
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'تعذر الاتصال بالخادم. تحقق من الشبكة وحاول مرة أخرى.'
  }

  return 'تعذر تسجيل الدخول. حاول مرة أخرى.'
}

export function homePathForRole(role: UserRole | null | undefined): string {
  return role === 'admin' ? '/reports' : '/pos'
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const user = ref<User | null>(null)
  const profile = ref<Profile | null>(null)
  const isLoading = ref(false)
  const isReady = ref(false)
  const errorMessage = ref<string | null>(null)

  let authSubscriptionBound = false
  let initializePromise: Promise<void> | null = null

  const isAuthenticated = computed(
    () => session.value !== null && profile.value !== null,
  )
  const role = computed<UserRole | null>(() => profile.value?.role ?? null)
  const isAdmin = computed(() => role.value === 'admin')
  const isCashier = computed(() => role.value === 'cashier')
  const fullName = computed(() => profile.value?.full_name ?? '')
  const roleLabel = computed(() => {
    if (role.value === 'admin') return 'مدير النظام'
    if (role.value === 'cashier') return 'كاشير'
    return ''
  })

  function clearLocalState(): void {
    session.value = null
    user.value = null
    profile.value = null
    errorMessage.value = null
  }

  async function fetchProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('[auth] fetchProfile failed:', error.message)
        return null
      }

      return data
    } catch (error) {
      console.error('[auth] fetchProfile unexpected error:', error)
      return null
    }
  }

  async function applySession(nextSession: Session | null): Promise<void> {
    session.value = nextSession
    user.value = nextSession?.user ?? null

    if (!nextSession?.user) {
      profile.value = null
      return
    }

    const nextProfile = await fetchProfile(nextSession.user.id)
    profile.value = nextProfile
  }

  async function initialize(): Promise<void> {
    if (isReady.value) {
      return
    }

    if (initializePromise) {
      await initializePromise
      return
    }

    initializePromise = (async () => {
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_resolve, reject) => {
            window.setTimeout(() => {
              reject(new Error('انتهت مهلة الاتصال بقاعدة البيانات'))
            }, 5000)
          }),
        ])

        if (sessionResult.error) {
          console.error('[auth] getSession failed:', sessionResult.error.message)
          clearLocalState()
        } else {
          await applySession(sessionResult.data.session)
        }

        if (!authSubscriptionBound) {
          authSubscriptionBound = true
          supabase.auth.onAuthStateChange((_event, nextSession) => {
            void applySession(nextSession)
          })
        }
      } catch (error) {
        console.error('[auth] initialize unexpected error:', error)
        clearLocalState()
      } finally {
        isReady.value = true
      }
    })()

    await initializePromise
  }

  async function signIn(
    email: string,
    password: string,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    isLoading.value = true
    errorMessage.value = null

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        const message = mapAuthError(error.message)
        errorMessage.value = message
        return { ok: false, message }
      }

      await applySession(data.session)

      if (!data.user || !profile.value) {
        await supabase.auth.signOut()
        clearLocalState()
        const message =
          'تم تسجيل الدخول لكن لم يتم العثور على ملف المستخدم. تواصل مع المدير لإعداد صلاحياتك.'
        errorMessage.value = message
        return { ok: false, message }
      }

      if (profile.value.is_active === false) {
        await supabase.auth.signOut()
        clearLocalState()
        const message = 'هذا الحساب موقوف. تواصل مع المدير.'
        errorMessage.value = message
        return { ok: false, message }
      }

      return { ok: true }
    } catch (error) {
      console.error('[auth] signIn unexpected error:', error)
      const message = 'حدث خطأ غير متوقع أثناء تسجيل الدخول.'
      errorMessage.value = message
      return { ok: false, message }
    } finally {
      isLoading.value = false
    }
  }

  async function signOut(): Promise<{ ok: true } | { ok: false; message: string }> {
    isLoading.value = true
    errorMessage.value = null

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('[auth] signOut failed:', error.message)
        const message = 'تعذر تسجيل الخروج. حاول مرة أخرى.'
        errorMessage.value = message
        return { ok: false, message }
      }

      clearLocalState()
      return { ok: true }
    } catch (error) {
      console.error('[auth] signOut unexpected error:', error)
      const message = 'حدث خطأ غير متوقع أثناء تسجيل الخروج.'
      errorMessage.value = message
      return { ok: false, message }
    } finally {
      isLoading.value = false
    }
  }

  return {
    session,
    user,
    profile,
    isLoading,
    isReady,
    errorMessage,
    isAuthenticated,
    role,
    isAdmin,
    isCashier,
    fullName,
    roleLabel,
    initialize,
    signIn,
    signOut,
    fetchProfile,
  }
})
