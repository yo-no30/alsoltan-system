<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ChevronLeft, LogOut, Menu } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { useOnlineStatus } from '@/composables/useOnlineStatus'
import { useToast } from '@/stores/toast'
import { useUiStore } from '@/stores/ui'
import { breadcrumbsForPath } from '@/navigation/appNav'

const auth = useAuthStore()
const ui = useUiStore()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const { isOnline } = useOnlineStatus()
const isLoggingOut = ref(false)

const crumbs = computed(() => breadcrumbsForPath(route.path))

async function handleLogout(): Promise<void> {
  if (isLoggingOut.value) return

  isLoggingOut.value = true
  try {
    const result = await auth.signOut()
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    await router.replace('/login')
  } catch (error) {
    console.error('[header] logout failed:', error)
    toast.error('تعذر تسجيل الخروج. حاول مرة أخرى.')
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <header
    class="flex min-h-11 shrink-0 items-center justify-between gap-3 border-b border-slate-200/70 bg-white px-2.5 py-1.5 shadow-sm sm:px-3"
  >
    <div class="flex min-w-0 items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        class="inline-flex shrink-0 rounded-md border border-slate-200/70 p-1.5 text-slate-600 transition hover:bg-slate-50 lg:hidden"
        aria-label="فتح القائمة"
        @click="ui.toggleMobileNav()"
      >
        <Menu class="h-3.5 w-3.5" :stroke-width="1.75" />
      </button>

      <div class="min-w-0">
        <RouterLink
          to="/home"
          class="block truncate text-sm font-semibold tracking-tight text-brand-500"
        >
          مشروبات السلطان
        </RouterLink>
        <nav
          class="mt-0.5 flex min-w-0 items-center gap-0.5 text-[11px] text-slate-500"
          aria-label="مسار الصفحة"
        >
          <template v-for="(crumb, index) in crumbs" :key="`${crumb.label}-${index}`">
            <ChevronLeft
              v-if="index > 0"
              class="h-3 w-3 shrink-0 text-slate-300"
              :stroke-width="2"
            />
            <RouterLink
              v-if="crumb.to"
              :to="crumb.to"
              class="truncate transition hover:text-slate-800"
            >
              {{ crumb.label }}
            </RouterLink>
            <span
              v-else
              class="truncate font-medium text-slate-700"
              aria-current="page"
            >
              {{ crumb.label }}
            </span>
          </template>
        </nav>
      </div>
    </div>

    <div class="flex shrink-0 items-center gap-1.5 text-xs sm:gap-2">
      <span
        class="inline-flex items-center gap-1 rounded-md border border-slate-200/70 bg-slate-50 px-2 py-0.5 text-slate-600"
        :title="isOnline ? 'متصل' : 'غير متصل'"
      >
        <span
          class="h-1.5 w-1.5 rounded-full"
          :class="isOnline ? 'bg-emerald-500' : 'bg-amber-500'"
        />
        <span class="hidden sm:inline">{{ isOnline ? 'متصل' : 'غير متصل' }}</span>
      </span>

      <div
        v-if="auth.fullName"
        class="hidden items-center gap-1.5 sm:flex"
      >
        <span class="font-medium text-slate-800">{{ auth.fullName }}</span>
        <span
          v-if="auth.roleLabel"
          class="rounded border border-brand-100 bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-700"
        >
          {{ auth.roleLabel }}
        </span>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-md border border-slate-200/70 bg-white px-2 py-1 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-60"
        :disabled="isLoggingOut"
        @click="handleLogout"
      >
        <LogOut class="h-3.5 w-3.5" :stroke-width="1.75" />
        <span class="hidden sm:inline">{{ isLoggingOut ? '...' : 'خروج' }}</span>
      </button>
    </div>
  </header>
</template>
