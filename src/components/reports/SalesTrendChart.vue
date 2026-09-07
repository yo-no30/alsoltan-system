<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js'
import type { TrendPoint } from '@/composables/useReports'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
)

const props = defineProps<{
  points: TrendPoint[]
}>()

const chartData = computed(() => ({
  labels: props.points.map((point) => point.label),
  datasets: [
    {
      label: 'المبيعات',
      data: props.points.map((point) => point.total),
      borderColor: '#800020',
      backgroundColor: 'rgba(128, 0, 32, 0.12)',
      pointBackgroundColor: '#800020',
      pointRadius: 3,
      tension: 0.35,
      fill: true,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context: { parsed: { y: number | null } }) =>
          `${(context.parsed.y ?? 0).toLocaleString('ar-SA', {
            minimumFractionDigits: 2,
          })} ر.ي`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#64748b', maxRotation: 0 },
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(148, 163, 184, 0.25)' },
      ticks: { color: '#64748b' },
    },
  },
}
</script>

<template>
  <div class="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
    <h3 class="mb-3 text-sm font-semibold text-slate-900">اتجاه المبيعات</h3>
    <div v-if="points.every((p) => p.total === 0)" class="flex h-56 items-center justify-center text-sm text-slate-400">
      لا توجد مبيعات في هذه الفترة
    </div>
    <div v-else class="h-56">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
