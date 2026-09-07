<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'
import AppToast from '@/components/ui/AppToast.vue'

const route = useRoute()
const useBlankLayout = computed(() => route.meta.layout === 'blank')
</script>

<template>
  <div class="contents" dir="rtl">
    <MainLayout v-if="!useBlankLayout">
      <RouterView />
    </MainLayout>
    <RouterView v-else />
    <AppToast />
  </div>
</template>
