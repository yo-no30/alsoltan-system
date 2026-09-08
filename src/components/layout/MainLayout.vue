<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
</script>

<template>
  <div
    class="flex h-dvh min-h-0 overflow-hidden bg-slate-50"
    dir="rtl"
  >
    <!-- Shell chrome (sidebar + header) stays at 100%; page content is denser. -->
    <AppSidebar />

    <div class="flex min-h-0 min-w-0 flex-1 flex-col">
      <AppHeader />
      <div class="app-workspace flex min-h-0 min-w-0 flex-1 flex-col">
        <main
          class="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto p-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]"
        >
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>
