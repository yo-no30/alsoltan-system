<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import ReportDateFilter from '@/components/reports/ReportDateFilter.vue'
import KpiCards from '@/components/reports/KpiCards.vue'
import SalesTrendChart from '@/components/reports/SalesTrendChart.vue'
import TopProductsChart from '@/components/reports/TopProductsChart.vue'
import FinanceSummaryTables from '@/components/reports/FinanceSummaryTables.vue'
import ReportExportBar from '@/components/reports/ReportExportBar.vue'
import PrintableReport from '@/components/reports/PrintableReport.vue'
import { useReports } from '@/composables/useReports'
import { useToast } from '@/stores/toast'
import { CURRENCY_LABEL, formatMoney } from '@/utils/currency'
import { toDateInputValue } from '@/utils/dateRange'
import {
  buildTablePdf,
  downloadBlob,
  sharePdfFile,
} from '@/utils/pdfExport'

const toast = useToast()
const isExporting = ref(false)

const {
  isLoading,
  preset,
  customStart,
  customEnd,
  range,
  sales,
  productsSnapshot,
  totalRevenue,
  netProfit,
  totalSupplierDebt,
  lowStockCount,
  topProducts,
  trendPoints,
  paymentBreakdown,
  purchaseSummary,
  loadReports,
  setPreset,
} = useReports()

const rangeLabel = computed(() => {
  const start = range.value.start.toLocaleDateString('ar-YE')
  const end = range.value.end.toLocaleDateString('ar-YE')
  if (preset.value === 'today') return `اليوم (${start})`
  if (preset.value === 'week') return `الأسبوع الحالي (${start} — ${end})`
  if (preset.value === 'month') return `الشهر الحالي (${start} — ${end})`
  return `من ${start} إلى ${end}`
})

const generatedAt = computed(() =>
  new Date().toLocaleString('ar-YE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }),
)

async function refresh(): Promise<void> {
  const result = await loadReports()
  if (!result.ok) toast.error(result.message)
}

function buildSalesPdfInput() {
  return {
    title: 'تقرير المبيعات',
    subtitle: rangeLabel.value,
    filename: `sales-${toDateInputValue(new Date())}.pdf`,
    headers: [
      'رقم الفاتورة',
      'العميل',
      'التاريخ',
      'طريقة الدفع',
      `الإجمالي (${CURRENCY_LABEL})`,
      'الحالة',
    ],
    rows: sales.value.map((sale) => [
      sale.invoice_number,
      sale.customer_name || '—',
      new Date(sale.created_at).toLocaleString('ar-YE'),
      sale.payment_type === 'cash' ? 'نقداً' : 'آجل',
      formatMoney(Number(sale.total_amount)),
      sale.status === 'synced_offline' ? 'مزامنة أوفلاين' : 'مكتملة',
    ]),
  }
}

function buildInventoryPdfInput() {
  return {
    title: 'تقرير المخزون',
    subtitle: `تاريخ التصدير: ${generatedAt.value}`,
    filename: `inventory-${toDateInputValue(new Date())}.pdf`,
    headers: [
      'الاسم',
      'المخزون',
      'حد التنبيه',
      `سعر البيع (${CURRENCY_LABEL})`,
      `سعر التكلفة (${CURRENCY_LABEL})`,
      'الحالة',
    ],
    rows: productsSnapshot.value.map((product) => [
      product.name,
      product.stock_quantity,
      product.min_stock_alert,
      formatMoney(Number(product.price)),
      formatMoney(Number(product.cost_price)),
      product.is_active ? 'نشط' : 'موقوف',
    ]),
  }
}

async function withExportLock(action: () => Promise<void>): Promise<void> {
  if (isExporting.value) return
  isExporting.value = true
  try {
    await action()
  } catch (error) {
    console.error('[reports] export failed:', error)
    toast.error('تعذر إنشاء ملف PDF. حاول مرة أخرى.')
  } finally {
    isExporting.value = false
  }
}

async function exportSalesPdf(): Promise<void> {
  await withExportLock(async () => {
    if (sales.value.length === 0) {
      toast.warning('لا توجد مبيعات لتصديرها في هذه الفترة')
      return
    }
    toast.info('جاري إنشاء ملف المبيعات...')
    const { blob, filename } = await buildTablePdf(buildSalesPdfInput())
    downloadBlob(blob, filename)
    toast.success('تم تصدير تقرير المبيعات PDF')
  })
}

async function shareSalesPdf(): Promise<void> {
  await withExportLock(async () => {
    if (sales.value.length === 0) {
      toast.warning('لا توجد مبيعات لمشاركتها في هذه الفترة')
      return
    }
    const { blob, filename } = await buildTablePdf(buildSalesPdfInput())
    const result = await sharePdfFile(
      blob,
      filename,
      'تقرير مبيعات مشروبات السلطان',
    )
    if (result === 'shared') {
      toast.success('تمت مشاركة تقرير المبيعات')
    } else if (result === 'downloaded') {
      toast.success('تم تنزيل الملف — شاركه من مجلد التنزيلات')
    }
  })
}

async function exportInventoryPdf(): Promise<void> {
  await withExportLock(async () => {
    if (productsSnapshot.value.length === 0) {
      toast.warning('لا توجد منتجات لتصديرها')
      return
    }
    const { blob, filename } = await buildTablePdf(buildInventoryPdfInput())
    downloadBlob(blob, filename)
    toast.success('تم تصدير تقرير المخزون PDF')
  })
}

async function shareInventoryPdf(): Promise<void> {
  await withExportLock(async () => {
    if (productsSnapshot.value.length === 0) {
      toast.warning('لا توجد منتجات لمشاركتها')
      return
    }
    const { blob, filename } = await buildTablePdf(buildInventoryPdfInput())
    const result = await sharePdfFile(
      blob,
      filename,
      'تقرير مخزون مشروبات السلطان',
    )
    if (result === 'shared') {
      toast.success('تمت مشاركة تقرير المخزون')
    } else if (result === 'downloaded') {
      toast.success('تم تنزيل الملف — شاركه من مجلد التنزيلات')
    }
  })
}

async function printSummary(): Promise<void> {
  document.body.classList.remove('printing-thermal')
  document.body.classList.add('printing-report')
  await nextTick()
  window.print()
  window.setTimeout(() => {
    document.body.classList.remove('printing-report')
  }, 300)
}

watch([preset, customStart, customEnd], () => {
  void refresh()
})

onMounted(() => {
  void refresh()
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-7xl flex-col gap-3">
    <header
      class="no-print flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
    >
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-slate-900">
          التقارير والأرباح
        </h1>
        <p class="mt-1 text-sm text-slate-500">
          لوحة التحليلات المالية لمشروبات السلطان
        </p>
      </div>
      <ReportExportBar
        :disabled="isLoading"
        :busy="isExporting"
        @export-sales="exportSalesPdf"
        @share-sales="shareSalesPdf"
        @export-inventory="exportInventoryPdf"
        @share-inventory="shareInventoryPdf"
        @print="printSummary"
      />
    </header>

    <div class="no-print">
      <ReportDateFilter
        :preset="preset"
        :custom-start="customStart"
        :custom-end="customEnd"
        @update:preset="setPreset"
        @update:custom-start="customStart = $event"
        @update:custom-end="customEnd = $event"
      />
    </div>

    <div
      v-if="isLoading"
      class="no-print rounded-2xl border border-slate-200/70 bg-white p-10 text-center text-sm text-slate-400 shadow-sm"
    >
      جاري تحميل التقارير...
    </div>

    <template v-else>
      <div class="no-print space-y-4">
        <KpiCards
          :total-revenue="totalRevenue"
          :net-profit="netProfit"
          :total-supplier-debt="totalSupplierDebt"
          :low-stock-count="lowStockCount"
        />

        <div class="grid gap-4 xl:grid-cols-2">
          <SalesTrendChart :points="trendPoints" />
          <TopProductsChart :products="topProducts" />
        </div>

        <FinanceSummaryTables
          :payments="paymentBreakdown"
          :purchases="purchaseSummary"
        />
      </div>

      <PrintableReport
        :range-label="rangeLabel"
        :generated-at="generatedAt"
        :total-revenue="totalRevenue"
        :net-profit="netProfit"
        :total-supplier-debt="totalSupplierDebt"
        :low-stock-count="lowStockCount"
        :payments="paymentBreakdown"
        :purchases="purchaseSummary"
        :top-products="topProducts"
      />
    </template>
  </div>
</template>
