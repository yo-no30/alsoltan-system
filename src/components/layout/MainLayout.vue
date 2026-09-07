<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
</script>

<template>
  <div
    class="flex h-dvh min-h-0 overflow-hidden bg-slate-50"
    dir="rtl"
  >
    <AppSidebar />

    <div class="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppHeader />
      <main
        class="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
      >
        <slot />
      </main>
    </div>
  </div>
</template>
