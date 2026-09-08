<script setup lang="ts">
import RiyalSymbol from '@/components/ui/RiyalSymbol.vue'
import { formatMoney } from '@/utils/currency'

withDefaults(
  defineProps<{
    amount: number
    /** Hide the currency symbol (number only). */
    hideSymbol?: boolean
  }>(),
  {
    hideSymbol: false,
  },
)
</script>

<template>
  <span class="inline-flex items-center gap-1 tabular-nums">
    <span>{{ formatMoney(amount) }}</span>
    <RiyalSymbol v-if="!hideSymbol" />
  </span>
</template>
