import type { RoundingRule } from './types'

export function roundRequestedQuantity(
  requested: number,
  rule: RoundingRule,
  packSize?: number | null,
): number {
  if (requested < 0) {
    throw new Error('La cantidad solicitada no puede ser negativa.')
  }

  switch (rule) {
    case 'none':
      return requested
    case 'ceil_unit':
      return Math.ceil(requested)
    case 'ceil_pack': {
      if (!packSize || packSize <= 0) {
        throw new Error('Para ceil_pack, packSize debe ser mayor que 0.')
      }
      return Math.ceil(requested / packSize) * packSize
    }
    default:
      return requested
  }
}
