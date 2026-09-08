<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { APP_NAV_ITEMS, filterNavItems } from '@/navigation/appNav'

const auth = useAuthStore()

const cards = computed(() =>
  filterNavItems(
    APP_NAV_ITEMS.filter((item) => item.to !== '/home'),
    auth.isAdmin,
  ),
)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-3">
    <header class="shrink-0 border-b border-slate-200 pb-3">
      <h1 class="text-base font-semibold text-slate-900">الرئيسية</h1>
      <p class="mt-1 text-xs text-slate-500">
        مرحباً{{ auth.fullName ? `، ${auth.fullName}` : '' }} — اختر الشاشة للانتقال
      </p>
    </header>

    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      <RouterLink
        v-for="card in cards"
        :key="card.to"
        :to="card.to"
        class="group flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:bg-slate-50"
      >
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition group-hover:border-brand-100 group-hover:bg-brand-50 group-hover:text-brand-700"
        >
          <component :is="card.icon" class="h-5 w-5" :stroke-width="1.75" />
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-slate-900">{{ card.label }}</p>
          <p class="mt-0.5 text-xs leading-relaxed text-slate-500">
            {{ card.description }}
          </p>
        </div>
      </RouterLink>
    </div>
  </div>
</template>
