import { roundRequestedQuantity } from './rounding'
import type { PurchaseUnit, RoundingRule } from './types'

export type PurchaseOrderStatus = 'draft' | 'approved' | 'ordered' | 'received' | 'cancelled'

export type PurchaseOrderLineInput = {
  requestedQty: number
  unitPrice?: number | null
  roundingRule: RoundingRule
  packSize?: number | null
}

export function assertValidStatusTransition(from: PurchaseOrderStatus, to: PurchaseOrderStatus) {
  if (from === to) return
  const allowed: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
    draft: ['approved', 'cancelled'],
    approved: ['ordered', 'cancelled'],
    ordered: ['received', 'cancelled'],
    received: [],
    cancelled: [],
  }
  if (!allowed[from].includes(to)) {
    throw new Error(`Transición de estado no permitida: ${from} -> ${to}`)
  }
}

export function computeLineTotal(requestedQty: number, unitPrice?: number | null): number {
  if (!unitPrice) return 0
  return requestedQty * unitPrice
}

export function computeOrderTotal(lines: { lineTotal: number }[]): number {
  return lines.reduce((acc, l) => acc + (l.lineTotal ?? 0), 0)
}

export function applyRoundingToRequested(
  requested: number,
  roundingRule: RoundingRule,
  packSize?: number | null,
): number {
  return roundRequestedQuantity(requested, roundingRule, packSize ?? undefined)
}

export function applyReceivingToStock(currentStock: number, receivedQty: number): number {
  if (receivedQty < 0) {
    throw new Error('Cantidad recibida no puede ser negativa')
  }
  return currentStock + receivedQty
}

export type PurchaseOrderLine = {
  id: string
  supplierItemId: string
  ingredientId: string
  requestedQty: number
  receivedQty: number
  purchaseUnit: PurchaseUnit
  roundingRule: RoundingRule
  packSize?: number | null
  unitPrice?: number | null
  lineTotal: number
}
