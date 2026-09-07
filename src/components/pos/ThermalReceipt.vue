<script setup lang="ts">
import type { ReceiptData } from '@/composables/useSales'

defineProps<{
  receipt: ReceiptData | null
}>()

function formatMoney(value: number): string {
  return value.toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function paymentLabel(type: ReceiptData['paymentType']): string {
  return type === 'cash' ? 'نقداً' : 'آجل'
}
</script>

<template>
  <div
    v-if="receipt"
    class="thermal-receipt"
    dir="rtl"
    aria-hidden="true"
  >
    <header class="thermal-header">
      <h1>مشروبات السلطان</h1>
      <p class="thermal-sub">Sultan Beverages</p>
      <p>رقم الفاتورة: {{ receipt.invoiceNumber }}</p>
      <p>الكاشير: {{ receipt.cashierName }}</p>
      <p>العميل: {{ receipt.customerName || '—' }}</p>
      <p>التاريخ: {{ formatDateTime(receipt.createdAt) }}</p>
      <p v-if="receipt.offline">* محفوظة أوفلاين *</p>
    </header>

    <table class="thermal-table">
      <thead>
        <tr>
          <th>الصنف</th>
          <th>الكمية</th>
          <th>السعر</th>
          <th>الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in receipt.items" :key="index">
          <td>{{ item.name }}</td>
          <td>{{ item.quantity }}</td>
          <td>{{ formatMoney(item.unitPrice) }}</td>
          <td>{{ formatMoney(item.totalPrice) }}</td>
        </tr>
      </tbody>
    </table>

    <footer class="thermal-footer">
      <p>
        <span>المجموع الفرعي</span>
        <strong>{{ formatMoney(receipt.subtotal) }} ر.ي</strong>
      </p>
      <p v-if="receipt.discount > 0">
        <span>الخصم</span>
        <strong>{{ formatMoney(receipt.discount) }} ر.ي</strong>
      </p>
      <p class="thermal-total">
        <span>الإجمالي</span>
        <strong>{{ formatMoney(receipt.totalAmount) }} ر.ي</strong>
      </p>
      <p>
        <span>طريقة الدفع</span>
        <strong>{{ paymentLabel(receipt.paymentType) }}</strong>
      </p>
      <p class="thermal-thanks">شكراً لزيارتكم!</p>
    </footer>
  </div>
</template>

<style scoped>
.thermal-receipt {
  display: none;
}

@media print {
  .thermal-receipt {
    display: block;
    width: 80mm;
    max-width: 80mm;
    margin: 0 auto;
    padding: 4mm;
    color: #000;
    background: #fff;
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 1.35;
  }

  .thermal-header {
    text-align: center;
    margin-bottom: 8px;
    border-bottom: 1px dashed #000;
    padding-bottom: 8px;
  }

  .thermal-header h1 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
  }

  .thermal-sub {
    margin: 2px 0 8px;
    font-size: 11px;
  }

  .thermal-header p {
    margin: 2px 0;
  }

  .thermal-table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
  }

  .thermal-table th,
  .thermal-table td {
    text-align: start;
    padding: 3px 2px;
    border-bottom: 1px dotted #000;
    vertical-align: top;
  }

  .thermal-table th {
    font-size: 11px;
  }

  .thermal-footer p {
    display: flex;
    justify-content: space-between;
    margin: 4px 0;
  }

  .thermal-total {
    font-size: 14px;
    margin-top: 8px !important;
    border-top: 1px dashed #000;
    padding-top: 6px;
  }

  .thermal-thanks {
    display: block !important;
    text-align: center;
    margin-top: 12px !important;
    font-weight: 700;
  }
}
</style>
