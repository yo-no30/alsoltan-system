<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'default' | 'success' | 'warning' | 'muted' | 'danger'
  }>(),
  { variant: 'default' },
)

const variantClass: Record<string, string> = {
  default: 'border-brand-100 bg-brand-50 text-brand-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  muted: 'border-slate-200 bg-slate-50 text-slate-600',
  danger: 'border-red-200 bg-red-50 text-red-700',
}
</script>

<template>
  <span
    class="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium"
    :class="variantClass[variant]"
  >
    <slot />
  </span>
</template>
