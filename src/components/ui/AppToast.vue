<script setup lang="ts">
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from '@lucide/vue'
import { useToastStore, type ToastVariant } from '@/stores/toast'

const toast = useToastStore()

const variantClasses: Record<ToastVariant, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-slate-200 bg-white text-slate-800',
}

const iconClasses: Record<ToastVariant, string> = {
  success: 'text-emerald-600',
  error: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-slate-500',
}
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[100] flex flex-col items-start gap-2 sm:inset-x-auto sm:end-4 sm:w-96"
    aria-live="polite"
  >
    <div
      v-for="item in toast.items"
      :key="item.id"
      class="pointer-events-auto flex w-full items-start gap-3 rounded-xl border px-4 py-3 shadow-md backdrop-blur-md"
      :class="variantClasses[item.variant]"
      role="status"
    >
      <CheckCircle2
        v-if="item.variant === 'success'"
        class="mt-0.5 h-5 w-5 shrink-0"
        :class="iconClasses.success"
        :stroke-width="1.75"
      />
      <XCircle
        v-else-if="item.variant === 'error'"
        class="mt-0.5 h-5 w-5 shrink-0"
        :class="iconClasses.error"
        :stroke-width="1.75"
      />
      <AlertTriangle
        v-else-if="item.variant === 'warning'"
        class="mt-0.5 h-5 w-5 shrink-0"
        :class="iconClasses.warning"
        :stroke-width="1.75"
      />
      <Info
        v-else
        class="mt-0.5 h-5 w-5 shrink-0"
        :class="iconClasses.info"
        :stroke-width="1.75"
      />

      <p class="flex-1 text-sm leading-relaxed">{{ item.message }}</p>

      <button
        type="button"
        class="rounded-md p-0.5 text-current opacity-60 transition hover:opacity-100"
        :aria-label="'إغلاق'"
        @click="toast.dismiss(item.id)"
      >
        <X class="h-4 w-4" :stroke-width="1.75" />
      </button>
    </div>
  </div>
</template>
