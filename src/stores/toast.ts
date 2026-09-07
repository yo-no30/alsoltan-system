import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastMessage {
  id: string
  message: string
  variant: ToastVariant
}

const DISMISS_MS = 4000

export const useToastStore = defineStore('toast', () => {
  const items = ref<ToastMessage[]>([])

  const hasToasts = computed(() => items.value.length > 0)

  function dismiss(id: string): void {
    items.value = items.value.filter((item) => item.id !== id)
  }

  function push(message: string, variant: ToastVariant = 'info'): string {
    const id = crypto.randomUUID()
    items.value.push({ id, message, variant })

    window.setTimeout(() => {
      dismiss(id)
    }, DISMISS_MS)

    return id
  }

  function success(message: string): string {
    return push(message, 'success')
  }

  function error(message: string): string {
    return push(message, 'error')
  }

  function warning(message: string): string {
    return push(message, 'warning')
  }

  function info(message: string): string {
    return push(message, 'info')
  }

  function clear(): void {
    items.value = []
  }

  return {
    items,
    hasToasts,
    push,
    success,
    error,
    warning,
    info,
    dismiss,
    clear,
  }
})

export function useToast() {
  return useToastStore()
}
