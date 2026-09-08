<script setup lang="ts">
import { computed, onMounted, onUnmounted, type Component } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  ShoppingCart,
  Package,
  FileText,
  Handshake,
  Users,
  UserCog,
  BarChart3,
  PanelRightClose,
  PanelRightOpen,
} from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

interface NavItem {
  to: string
  label: string
  icon: Component
  adminOnly?: boolean
  group: 'ops' | 'backoffice'
}

const route = useRoute()
const auth = useAuthStore()
const ui = useUiStore()

const navItems = computed<NavItem[]>(() => {
  const items: NavItem[] = [
    {
      to: '/pos',
      label: 'نقطة البيع',
      icon: ShoppingCart,
      group: 'ops',
    },
    {
      to: '/inventory',
      label: 'المنتجات والمخزون',
      icon: Package,
      adminOnly: true,
      group: 'backoffice',
    },
    {
      to: '/purchases',
      label: 'المشتريات',
      icon: FileText,
      adminOnly: true,
      group: 'backoffice',
    },
    {
      to: '/suppliers',
      label: 'الموردين',
      icon: Handshake,
      adminOnly: true,
      group: 'backoffice',
    },
    {
      to: '/customers',
      label: 'العملاء',
      icon: Users,
      adminOnly: true,
      group: 'backoffice',
    },
    {
      to: '/users',
      label: 'المستخدمون',
      icon: UserCog,
      adminOnly: true,
      group: 'backoffice',
    },
    {
      to: '/reports',
      label: 'التقارير والأرباح',
      icon: BarChart3,
      adminOnly: true,
      group: 'backoffice',
    },
  ]

  return items.filter((item) => !item.adminOnly || auth.isAdmin)
})

const opsItems = computed(() =>
  navItems.value.filter((item) => item.group === 'ops'),
)
const backofficeItems = computed(() =>
  navItems.value.filter((item) => item.group === 'backoffice'),
)

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(`${path}/`)
}

function onNavigate(): void {
  ui.closeMobileNav()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && ui.mobileNavOpen) {
    ui.closeMobileNav()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    v-if="ui.mobileNavOpen"
    class="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px] lg:hidden"
    @click="ui.closeMobileNav()"
  />

  <aside
    class="app-sidebar fixed inset-y-0 z-50 flex flex-col border-slate-200/70 bg-white shadow-sm transition-[width,transform] duration-300 ease-out lg:static lg:z-auto"
    :class="[
      ui.sidebarWidthClass,
      ui.mobileNavOpen
        ? 'translate-x-0'
        : 'translate-x-full lg:translate-x-0',
      'end-0 border-s',
    ]"
  >
    <div
      class="flex h-11 shrink-0 items-center justify-end border-b border-slate-200/70 px-2"
    >
      <div
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-[11px] font-bold text-white"
      >
        س
      </div>
    </div>

    <nav class="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-2">
      <div>
        <p
          v-if="ui.showSidebarLabels"
          class="mb-1 px-2 text-[10px] font-semibold tracking-wide text-slate-400"
        >
          التشغيل
        </p>
        <div class="flex flex-col gap-0.5">
          <RouterLink
            v-for="item in opsItems"
            :key="item.to"
            :to="item.to"
            class="group inline-flex items-center rounded-lg text-xs transition-colors duration-150"
            :class="[
              ui.showSidebarLabels
                ? 'gap-2 px-2.5 py-2 sm:py-1.5'
                : 'justify-center px-0 py-2',
              isActive(item.to)
                ? 'bg-brand-50 font-semibold text-brand-700 ring-1 ring-brand-100'
                : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            ]"
            :title="!ui.showSidebarLabels ? item.label : undefined"
            @click="onNavigate"
          >
            <component
              :is="item.icon"
              class="h-4 w-4 shrink-0"
              :stroke-width="isActive(item.to) ? 2 : 1.75"
            />
            <span v-if="ui.showSidebarLabels" class="truncate">{{ item.label }}</span>
          </RouterLink>
        </div>
      </div>

      <div v-if="backofficeItems.length">
        <p
          v-if="ui.showSidebarLabels"
          class="mb-1 px-2 text-[10px] font-semibold tracking-wide text-slate-400"
        >
          الإدارة
        </p>
        <div class="flex flex-col gap-0.5">
          <RouterLink
            v-for="item in backofficeItems"
            :key="item.to"
            :to="item.to"
            class="group inline-flex items-center rounded-lg text-xs transition-colors duration-150"
            :class="[
              ui.showSidebarLabels
                ? 'gap-2 px-2.5 py-2 sm:py-1.5'
                : 'justify-center px-0 py-2',
              isActive(item.to)
                ? 'bg-brand-50 font-semibold text-brand-700 ring-1 ring-brand-100'
                : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            ]"
            :title="!ui.showSidebarLabels ? item.label : undefined"
            @click="onNavigate"
          >
            <component
              :is="item.icon"
              class="h-4 w-4 shrink-0"
              :stroke-width="isActive(item.to) ? 2 : 1.75"
            />
            <span v-if="ui.showSidebarLabels" class="truncate">{{ item.label }}</span>
          </RouterLink>
        </div>
      </div>
    </nav>

    <div class="hidden shrink-0 border-t border-slate-200/70 p-2 lg:block">
      <button
        type="button"
        class="inline-flex w-full items-center rounded-lg text-xs font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900"
        :class="
          ui.sidebarCollapsed
            ? 'justify-center px-0 py-2'
            : 'gap-2 px-2.5 py-1.5'
        "
        :title="ui.sidebarCollapsed ? 'توسيع القائمة' : 'طي القائمة'"
        aria-label="طي أو توسيع القائمة"
        @click="ui.toggleSidebarCollapsed()"
      >
        <PanelRightOpen
          v-if="ui.sidebarCollapsed"
          class="h-4 w-4 shrink-0"
          :stroke-width="1.75"
        />
        <PanelRightClose
          v-else
          class="h-4 w-4 shrink-0"
          :stroke-width="1.75"
        />
        <span v-if="!ui.sidebarCollapsed">طي القائمة</span>
      </button>
    </div>
  </aside>
</template>
