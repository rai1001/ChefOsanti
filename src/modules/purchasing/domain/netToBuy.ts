import { roundRequestedQuantity } from './rounding'
import type { PurchaseUnit, RoundingRule } from './types'

export type NetInput = {
  supplierItemId: string
  label: string
  grossQty: number
  onHandQty: number
  onOrderQty: number
  bufferPercent?: number
  bufferQty?: number
  needUnit: PurchaseUnit
  purchaseUnit: PurchaseUnit
  roundingRule: RoundingRule
  packSize?: number | null
}

export type NetResult =
  | {
      kind: 'error'
      reason: 'UNIT_MISMATCH'
      supplierItemId: string
      label: string
    }
  | {
      kind: 'ok'
      supplierItemId: string
      label: string
      grossQty: number
      onHandQty: number
      onOrderQty: number
      bufferApplied: number
      netQty: number
      roundedQty: number
    }

export function computeNetLine(input: NetInput): NetResult {
  if (input.needUnit !== input.purchaseUnit) {
    return { kind: 'error', reason: 'UNIT_MISMATCH', supplierItemId: input.supplierItemId, label: input.label }
  }

  const bufferFromPercent = (input.bufferPercent ?? 0) > 0 ? input.grossQty * (input.bufferPercent ?? 0) / 100 : 0
  const bufferQty = (input.bufferQty ?? 0) + bufferFromPercent

  const netRaw = input.grossQty - input.onHandQty - input.onOrderQty + bufferQty
  const net = Math.max(0, Number(netRaw))
  const rounded = roundRequestedQuantity(net, input.roundingRule, input.packSize ?? undefined)

  return {
    kind: 'ok',
    supplierItemId: input.supplierItemId,
    label: input.label,
    grossQty: input.grossQty,
    onHandQty: input.onHandQty,
    onOrderQty: input.onOrderQty,
    bufferApplied: bufferQty,
    netQty: net,
    roundedQty: rounded,
  }
}
