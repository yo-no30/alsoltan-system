<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Search } from '@lucide/vue'

const props = defineProps<{
  modelValue: string
  autofocus?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function focusInput(): void {
  inputRef.value?.focus()
}

function onInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)

  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    emit('update:modelValue', value.trim())
  }, 120)
}

onMounted(() => {
  if (props.autofocus !== false) {
    focusInput()
  }
})

defineExpose({ focusInput })
</script>

<template>
  <div class="relative">
    <Search
      class="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
      :stroke-width="1.75"
    />
    <input
      ref="inputRef"
      :value="modelValue"
      type="search"
      enterkeyhint="search"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      class="w-full rounded-lg border border-slate-200/70 bg-white py-2 pe-2.5 ps-8 text-xs text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
      placeholder="بحث بالاسم..."
      @input="onInput"
    />
  </div>
</template>
