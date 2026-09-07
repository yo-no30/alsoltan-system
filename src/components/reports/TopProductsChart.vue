<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import type { TopProductRow } from '@/composables/useReports'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps<{
  products: TopProductRow[]
}>()

const chartData = computed(() => ({
  labels: props.products.map((product) => product.name),
  datasets: [
    {
      label: 'الكمية',
      data: props.products.map((product) => product.quantity),
      backgroundColor: [
        '#800020',
        '#6e001b',
        '#5e0017',
        '#d05c74',
        '#e895a4',
      ],
      borderRadius: 8,
      barThickness: 22,
    },
  ],
}))

const chartOptions = {
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { color: 'rgba(148, 163, 184, 0.25)' },
      ticks: { color: '#64748b', precision: 0 },
    },
    y: {
      grid: { display: false },
      ticks: { color: '#334155' },
    },
  },
}
</script>

<template>
  <div class="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
    <h3 class="mb-3 text-sm font-semibold text-slate-900">الأكثر مبيعاً (Top 5)</h3>
    <div
      v-if="products.length === 0"
      class="flex h-56 items-center justify-center text-sm text-slate-400"
    >
      لا توجد بيانات مبيعات للمنتجات
    </div>
    <div v-else class="h-56">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
