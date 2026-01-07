import { describe, expect, it } from 'vitest'
import { roundRequestedQuantity } from './rounding'

describe('roundRequestedQuantity', () => {
  it('devuelve la cantidad original con regla none', () => {
    expect(roundRequestedQuantity(2.3, 'none')).toBe(2.3)
  })

  it('redondea hacia arriba por unidad con ceil_unit', () => {
    expect(roundRequestedQuantity(2.1, 'ceil_unit')).toBe(3)
    expect(roundRequestedQuantity(3, 'ceil_unit')).toBe(3)
  })

  it('redondea por pack con ceil_pack', () => {
    expect(roundRequestedQuantity(3, 'ceil_pack', 5)).toBe(5)
    expect(roundRequestedQuantity(7, 'ceil_pack', 5)).toBe(10)
  })

  it('lanza error si packSize es inválido en ceil_pack', () => {
    expect(() => roundRequestedQuantity(3, 'ceil_pack')).toThrow()
    expect(() => roundRequestedQuantity(3, 'ceil_pack', 0)).toThrow()
  })

  it('lanza error si la cantidad es negativa', () => {
    expect(() => roundRequestedQuantity(-1, 'none')).toThrow()
  })
})
