<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <section class="mx-auto max-w-5xl">
    <header class="mb-3">
      <h1 class="text-xl font-semibold tracking-tight text-slate-900">
        {{ title }}
      </h1>
      <p v-if="description" class="mt-0.5 text-xs text-slate-500">
        {{ description }}
      </p>
    </header>
    <div class="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <slot>
        <p class="text-xs text-slate-500">هذه الشاشة جاهزة للربط مع المنطق التشغيلي.</p>
      </slot>
    </div>
  </section>
</template>
