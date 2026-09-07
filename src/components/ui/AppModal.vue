<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { X } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    size?: 'md' | 'lg' | 'xl'
  }>(),
  { size: 'md' },
)

const emit = defineEmits<{
  close: []
}>()

const sizeClass: Record<'md' | 'lg' | 'xl', string> = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.open) {
    emit('close')
  }
}

function onOverlayClick(): void {
  emit('close')
}

watch(
  () => props.open,
  (isOpen) => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
  },
)

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <div
        class="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        @click="onOverlayClick"
      />

      <div
        class="relative z-10 flex max-h-[min(92dvh,92vh)] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200/70 bg-white shadow-md sm:mx-4 sm:rounded-2xl"
        :class="sizeClass[size]"
      >
        <header
          class="flex items-center justify-between border-b border-slate-200/70 px-4 py-2.5"
        >
          <h2 class="text-sm font-semibold text-slate-900">{{ title }}</h2>
          <button
            type="button"
            class="rounded-md p-1 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="إغلاق"
            @click="emit('close')"
          >
            <X class="h-3.5 w-3.5" :stroke-width="1.75" />
          </button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <slot />
        </div>

        <footer
          v-if="$slots.footer"
          class="flex flex-col-reverse gap-2 border-t border-slate-200/70 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-end [&_button]:w-full sm:[&_button]:w-auto"
        >
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>
