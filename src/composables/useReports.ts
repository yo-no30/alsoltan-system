import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import {
  formatDayKey,
  formatHourKey,
  resolveDateRange,
  toDateInputValue,
  toIsoBounds,
  type DatePreset,
  type DateRangeBounds,
} from '@/utils/dateRange'
import type {
  Product,
  Purchase,
  SalePaymentType,
} from '@/types/database.types'

export interface ReportSaleRow {
  id: string
  invoice_number: string
  total_amount: number
  payment_type: SalePaymentType
  created_at: string
  status: string
  customer_id: string | null
  customer_name: string | null
}

export interface TopProductRow {
  productId: string
  name: string
  quantity: number
  revenue: number
}

export interface TrendPoint {
  label: string
  total: number
}

export interface PaymentBreakdown {
  type: SalePaymentType
  label: string
  count: number
  total: number
}

export interface PurchaseSummary {
  totalAmount: number
  paidAmount: number
  unpaidAmount: number
  cashTotal: number
  creditTotal: number
  count: number
}

interface SaleItemJoinRow {
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  products: { name: string; cost_price: number } | null
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function useReports() {
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)

  const preset = ref<DatePreset>('month')
  const customStart = ref(toDateInputValue(new Date()))
  const customEnd = ref(toDateInputValue(new Date()))

  const sales = ref<ReportSaleRow[]>([])
  const productsSnapshot = ref<Product[]>([])
  const purchaseRows = ref<Purchase[]>([])
  const totalSupplierDebt = ref(0)
  const lowStockCount = ref(0)
  const cogs = ref(0)
  const topProducts = ref<TopProductRow[]>([])
  const trendPoints = ref<TrendPoint[]>([])

  const range = computed<DateRangeBounds>(() =>
    resolveDateRange(preset.value, customStart.value, customEnd.value),
  )

  const totalRevenue = computed(() =>
    roundMoney(sales.value.reduce((sum, sale) => sum + Number(sale.total_amount), 0)),
  )

  const netProfit = computed(() => roundMoney(totalRevenue.value - cogs.value))

  const paymentBreakdown = computed<PaymentBreakdown[]>(() => {
    const cash = { type: 'cash' as const, label: 'نقداً', count: 0, total: 0 }
    const credit = { type: 'credit' as const, label: 'آجل', count: 0, total: 0 }

    for (const sale of sales.value) {
      if (sale.payment_type === 'cash') {
        cash.count += 1
        cash.total += Number(sale.total_amount)
      } else {
        credit.count += 1
        credit.total += Number(sale.total_amount)
      }
    }

    cash.total = roundMoney(cash.total)
    credit.total = roundMoney(credit.total)
    return [cash, credit]
  })

  const purchaseSummary = computed<PurchaseSummary>(() => {
    let totalAmount = 0
    let paidAmount = 0
    let cashTotal = 0
    let creditTotal = 0

    for (const purchase of purchaseRows.value) {
      const total = Number(purchase.total_amount)
      const paid = Number(purchase.paid_amount)
      totalAmount += total
      paidAmount += paid
      if (purchase.payment_type === 'cash') {
        cashTotal += total
      } else {
        creditTotal += total
      }
    }

    return {
      totalAmount: roundMoney(totalAmount),
      paidAmount: roundMoney(paidAmount),
      unpaidAmount: roundMoney(Math.max(0, totalAmount - paidAmount)),
      cashTotal: roundMoney(cashTotal),
      creditTotal: roundMoney(creditTotal),
      count: purchaseRows.value.length,
    }
  })

  const hasSales = computed(() => sales.value.length > 0)

  function buildTrend(salesRows: ReportSaleRow[], bounds: DateRangeBounds): TrendPoint[] {
    const useHours = bounds.preset === 'today'
    const bucket = new Map<string, number>()

    if (useHours) {
      for (let hour = 0; hour < 24; hour += 1) {
        bucket.set(`${String(hour).padStart(2, '0')}:00`, 0)
      }
    } else {
      const cursor = new Date(bounds.start)
      cursor.setHours(0, 0, 0, 0)
      const end = new Date(bounds.end)
      end.setHours(0, 0, 0, 0)
      while (cursor.getTime() <= end.getTime()) {
        bucket.set(formatDayKey(cursor), 0)
        cursor.setDate(cursor.getDate() + 1)
      }
    }

    for (const sale of salesRows) {
      const date = new Date(sale.created_at)
      const key = useHours ? formatHourKey(date) : formatDayKey(date)
      bucket.set(key, roundMoney((bucket.get(key) ?? 0) + Number(sale.total_amount)))
    }

    return Array.from(bucket.entries()).map(([label, total]) => ({ label, total }))
  }

  function buildTopProducts(items: SaleItemJoinRow[]): TopProductRow[] {
    const map = new Map<string, TopProductRow>()

    for (const item of items) {
      const name = item.products?.name ?? 'منتج محذوف'
      const existing = map.get(item.product_id)
      const lineRevenue = Number(item.unit_price) * Number(item.quantity)
      if (existing) {
        existing.quantity += Number(item.quantity)
        existing.revenue = roundMoney(existing.revenue + lineRevenue)
      } else {
        map.set(item.product_id, {
          productId: item.product_id,
          name,
          quantity: Number(item.quantity),
          revenue: roundMoney(lineRevenue),
        })
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
  }

  async function loadReports(): Promise<{ ok: true } | { ok: false; message: string }> {
    isLoading.value = true
    errorMessage.value = null

    try {
      const bounds = range.value
      const { startIso, endIso } = toIsoBounds(bounds)

      const [salesResult, purchasesResult, suppliersResult, productsResult] =
        await Promise.all([
          supabase
            .from('sales')
            .select(
              'id, invoice_number, total_amount, payment_type, created_at, status, customer_id, customers(name)',
            )
            .gte('created_at', startIso)
            .lte('created_at', endIso)
            .order('created_at', { ascending: true }),
          supabase
            .from('purchases')
            .select('*')
            .gte('created_at', startIso)
            .lte('created_at', endIso),
          supabase.from('suppliers').select('balance_due'),
          supabase.from('products').select('*'),
        ])

      if (salesResult.error) {
        console.error('[reports] sales:', salesResult.error.message)
        return { ok: false, message: 'تعذر تحميل بيانات المبيعات.' }
      }
      if (purchasesResult.error) {
        console.error('[reports] purchases:', purchasesResult.error.message)
        return { ok: false, message: 'تعذر تحميل بيانات المشتريات.' }
      }
      if (suppliersResult.error) {
        console.error('[reports] suppliers:', suppliersResult.error.message)
        return { ok: false, message: 'تعذر تحميل ديون الموردين.' }
      }
      if (productsResult.error) {
        console.error('[reports] products:', productsResult.error.message)
        return { ok: false, message: 'تعذر تحميل بيانات المخزون.' }
      }

      const salesRows = (salesResult.data ?? []).map((row) => {
        const related = row.customers as { name?: string } | null | undefined
        return {
          id: row.id,
          invoice_number: row.invoice_number,
          total_amount: Number(row.total_amount),
          payment_type: row.payment_type,
          created_at: row.created_at,
          status: row.status,
          customer_id: row.customer_id,
          customer_name: related?.name ?? null,
        } satisfies ReportSaleRow
      })
      sales.value = salesRows
      purchaseRows.value = (purchasesResult.data ?? []) as Purchase[]
      productsSnapshot.value = (productsResult.data ?? []) as Product[]

      totalSupplierDebt.value = roundMoney(
        (suppliersResult.data ?? []).reduce(
          (sum, row) => sum + Number(row.balance_due),
          0,
        ),
      )

      lowStockCount.value = productsSnapshot.value.filter(
        (product) => product.stock_quantity <= product.min_stock_alert,
      ).length

      trendPoints.value = buildTrend(salesRows, bounds)

      const saleIds = salesRows.map((sale) => sale.id)
      if (saleIds.length === 0) {
        cogs.value = 0
        topProducts.value = []
        return { ok: true }
      }

      const itemsResult = await supabase
        .from('sale_items')
        .select('sale_id, product_id, quantity, unit_price, products(name, cost_price)')
        .in('sale_id', saleIds)

      if (itemsResult.error) {
        console.error('[reports] sale_items:', itemsResult.error.message)
        return { ok: false, message: 'تعذر تحميل تفاصيل بنود المبيعات.' }
      }

      const items = (itemsResult.data ?? []) as unknown as SaleItemJoinRow[]
      cogs.value = roundMoney(
        items.reduce((sum, item) => {
          const cost = Number(item.products?.cost_price ?? 0)
          return sum + cost * Number(item.quantity)
        }, 0),
      )
      topProducts.value = buildTopProducts(items)

      return { ok: true }
    } catch (error) {
      console.error('[reports] unexpected:', error)
      errorMessage.value = 'حدث خطأ أثناء تحميل التقارير.'
      return { ok: false, message: errorMessage.value }
    } finally {
      isLoading.value = false
    }
  }

  function setPreset(next: DatePreset): void {
    preset.value = next
  }

  return {
    isLoading,
    errorMessage,
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
    cogs,
    topProducts,
    trendPoints,
    paymentBreakdown,
    purchaseSummary,
    hasSales,
    loadReports,
    setPreset,
  }
}
