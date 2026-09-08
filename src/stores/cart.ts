import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface CartLine {
  productId: string
  name: string
  unitPrice: number
  quantity: number
}

export const useCartStore = defineStore('cart', () => {
  const lines = ref<CartLine[]>([])
  const appliedDiscount = ref(0)

  const itemCount = computed(() =>
    lines.value.reduce((sum, line) => sum + line.quantity, 0),
  )

  const subtotal = computed(() =>
    lines.value.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
  )

  const totalAmount = computed(() =>
    Math.max(0, roundMoney(subtotal.value - appliedDiscount.value)),
  )

  function roundMoney(value: number): number {
    return Math.round(value * 100) / 100
  }

  function lineTotal(productId: string): number {
    const line = lines.value.find((entry) => entry.productId === productId)
    if (!line) return 0
    return roundMoney(line.unitPrice * line.quantity)
  }

  function addItem(item: Omit<CartLine, 'quantity'>, quantity = 1): void {
    if (quantity <= 0) {
      return
    }

    const existing = lines.value.find((line) => line.productId === item.productId)
    if (existing) {
      existing.quantity += quantity
      return
    }

    lines.value.push({
      ...item,
      quantity,
    })
  }

  function updateQuantity(productId: string, quantity: number): void {
    const line = lines.value.find((entry) => entry.productId === productId)
    if (!line) {
      return
    }

    if (quantity <= 0) {
      removeItem(productId)
      return
    }

    line.quantity = Math.floor(quantity)
  }

  function updateUnitPrice(productId: string, unitPrice: number): void {
    const line = lines.value.find((entry) => entry.productId === productId)
    if (!line) {
      return
    }

    const safe = Number.isFinite(unitPrice) ? unitPrice : 0
    line.unitPrice = roundMoney(Math.max(0, safe))
  }

  function increment(productId: string): void {
    const line = lines.value.find((entry) => entry.productId === productId)
    if (!line) return
    line.quantity += 1
  }

  function decrement(productId: string): void {
    const line = lines.value.find((entry) => entry.productId === productId)
    if (!line) return
    if (line.quantity <= 1) {
      removeItem(productId)
      return
    }
    line.quantity -= 1
  }

  function removeItem(productId: string): void {
    lines.value = lines.value.filter((line) => line.productId !== productId)
  }

  function setDiscount(amount: number): void {
    const safe = Number.isFinite(amount) ? amount : 0
    const clamped = Math.min(Math.max(0, safe), subtotal.value)
    appliedDiscount.value = roundMoney(clamped)
  }

  function clearCart(): void {
    lines.value = []
    appliedDiscount.value = 0
  }

  return {
    lines,
    appliedDiscount,
    itemCount,
    subtotal,
    totalAmount,
    lineTotal,
    addItem,
    updateQuantity,
    updateUnitPrice,
    increment,
    decrement,
    removeItem,
    setDiscount,
    clearCart,
  }
})
