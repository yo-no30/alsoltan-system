import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'alsoltan-sidebar-collapsed'

function readStoredCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export const useUiStore = defineStore('ui', () => {
  const sidebarCollapsed = ref(readStoredCollapsed())
  const mobileNavOpen = ref(false)

  const sidebarWidthClass = computed(() =>
    // Mobile drawer always full label width; desktop respects collapse
    sidebarCollapsed.value ? 'w-64 lg:w-12' : 'w-64 lg:w-44',
  )

  const showSidebarLabels = computed(
    () => !sidebarCollapsed.value || mobileNavOpen.value,
  )

  function toggleSidebarCollapsed(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setSidebarCollapsed(value: boolean): void {
    sidebarCollapsed.value = value
  }

  function openMobileNav(): void {
    mobileNavOpen.value = true
  }

  function closeMobileNav(): void {
    mobileNavOpen.value = false
  }

  function toggleMobileNav(): void {
    mobileNavOpen.value = !mobileNavOpen.value
  }

  watch(sidebarCollapsed, (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
    } catch {
      // ignore storage failures
    }
  })

  return {
    sidebarCollapsed,
    mobileNavOpen,
    sidebarWidthClass,
    showSidebarLabels,
    toggleSidebarCollapsed,
    setSidebarCollapsed,
    openMobileNav,
    closeMobileNav,
    toggleMobileNav,
  }
})
