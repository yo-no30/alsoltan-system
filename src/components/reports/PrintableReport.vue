<script setup lang="ts">
import type {
  PaymentBreakdown,
  PurchaseSummary,
  TopProductRow,
} from '@/composables/useReports'

defineProps<{
  rangeLabel: string
  generatedAt: string
  totalRevenue: number
  netProfit: number
  totalSupplierDebt: number
  lowStockCount: number
  payments: PaymentBreakdown[]
  purchases: PurchaseSummary
  topProducts: TopProductRow[]
}>()

function formatMoney(value: number): string {
  return value.toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
</script>

<template>
  <div class="print-report" dir="rtl">
    <header class="print-report__header">
      <h1>مشروبات السلطان — الملخص المالي</h1>
      <p>Sultan Beverages Financial Summary</p>
      <p>الفترة: {{ rangeLabel }}</p>
      <p>تاريخ التصدير: {{ generatedAt }}</p>
    </header>

    <section class="print-report__kpis">
      <div>
        <span>إجمالي المبيعات</span>
        <strong>{{ formatMoney(totalRevenue) }} ر.ي</strong>
      </div>
      <div>
        <span>صافي الأرباح</span>
        <strong>{{ formatMoney(netProfit) }} ر.ي</strong>
      </div>
      <div>
        <span>ديون الموردين</span>
        <strong>{{ formatMoney(totalSupplierDebt) }} ر.ي</strong>
      </div>
      <div>
        <span>منتجات منخفضة المخزون</span>
        <strong>{{ lowStockCount }}</strong>
      </div>
    </section>

    <section>
      <h2>المبيعات حسب الدفع</h2>
      <table>
        <thead>
          <tr>
            <th>الطريقة</th>
            <th>العدد</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in payments" :key="row.type">
            <td>{{ row.label }}</td>
            <td>{{ row.count }}</td>
            <td>{{ formatMoney(row.total) }} ر.ي</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2>ملخص المشتريات</h2>
      <table>
        <tbody>
          <tr>
            <td>عدد الفواتير</td>
            <td>{{ purchases.count }}</td>
          </tr>
          <tr>
            <td>إجمالي المشتريات</td>
            <td>{{ formatMoney(purchases.totalAmount) }} ر.ي</td>
          </tr>
          <tr>
            <td>المدفوع</td>
            <td>{{ formatMoney(purchases.paidAmount) }} ر.ي</td>
          </tr>
          <tr>
            <td>المتبقي</td>
            <td>{{ formatMoney(purchases.unpaidAmount) }} ر.ي</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-if="topProducts.length">
      <h2>الأكثر مبيعاً</h2>
      <table>
        <thead>
          <tr>
            <th>المنتج</th>
            <th>الكمية</th>
            <th>الإيراد</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in topProducts" :key="product.productId">
            <td>{{ product.name }}</td>
            <td>{{ product.quantity }}</td>
            <td>{{ formatMoney(product.revenue) }} ر.ي</td>
          </tr>
        </tbody>
      </table>
    </section>

    <footer class="print-report__footer">
      تقرير داخلي — مشروبات السلطان
    </footer>
  </div>
</template>

<style scoped>
.print-report {
  display: none;
}

@media print {
  .print-report {
    display: block;
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    padding: 16px;
    color: #000;
    background: #fff;
    font-family: Tahoma, 'Segoe UI', Arial, sans-serif;
    font-size: 12px;
  }

  .print-report__header {
    text-align: center;
    margin-bottom: 16px;
    border-bottom: 1px solid #000;
    padding-bottom: 10px;
  }

  .print-report__header h1 {
    margin: 0 0 6px;
    font-size: 18px;
  }

  .print-report__header p {
    margin: 2px 0;
  }

  .print-report__kpis {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 16px;
  }

  .print-report__kpis div {
    border: 1px solid #000;
    padding: 8px;
  }

  .print-report__kpis span {
    display: block;
    font-size: 11px;
  }

  .print-report__kpis strong {
    display: block;
    margin-top: 4px;
    font-size: 14px;
  }

  h2 {
    margin: 14px 0 6px;
    font-size: 13px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
  }

  th,
  td {
    border: 1px solid #000;
    padding: 5px 6px;
    text-align: start;
  }

  .print-report__footer {
    margin-top: 20px;
    text-align: center;
    font-size: 11px;
  }
}
</style>
