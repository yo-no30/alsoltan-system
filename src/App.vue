<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'
import AppToast from '@/components/ui/AppToast.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()
const useBlankLayout = computed(() => route.meta.layout === 'blank')
</script>

<template>
  <div class="contents" dir="rtl">
    <div
      v-if="!auth.isReady"
      class="grid min-h-dvh place-items-center bg-slate-50"
    >
      <div class="text-center">
        <div
          class="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-500 text-lg font-bold text-white shadow-sm"
        >
          س
        </div>
        <p class="text-xl font-semibold text-slate-900">مشروبات السلطان</p>
        <p class="mt-2 text-sm text-slate-500">جاري التحميل...</p>
      </div>
    </div>
    <template v-else>
      <MainLayout v-if="!useBlankLayout">
        <RouterView />
      </MainLayout>
      <RouterView v-else />
    </template>
    <AppToast />
  </div>
</template>
