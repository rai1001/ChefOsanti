import { describe, it, expect } from 'vitest'
import { computeNetLine } from './netToBuy'

const baseInput = {
  supplierItemId: 'si-1',
  label: 'Tomate',
  grossQty: 10,
  onHandQty: 0,
  onOrderQty: 0,
  bufferPercent: 0,
  bufferQty: 0,
  needUnit: 'kg' as const,
  purchaseUnit: 'kg' as const,
  roundingRule: 'none' as const,
  packSize: null,
}

describe('computeNetLine', () => {
  it('calculates net without stock or buffer', () => {
    const res = computeNetLine(baseInput)
    if (res.kind !== 'ok') throw new Error('expected ok')
    expect(res.netQty).toBe(10)
    expect(res.roundedQty).toBe(10)
  })

  it('applies onHand and onOrder', () => {
    const res = computeNetLine({ ...baseInput, onHandQty: 3, onOrderQty: 2 })
    if (res.kind !== 'ok') throw new Error('expected ok')
    expect(res.netQty).toBe(5)
  })

  it('applies buffer percent and qty', () => {
    const res = computeNetLine({ ...baseInput, bufferPercent: 10, bufferQty: 1 })
    if (res.kind !== 'ok') throw new Error('expected ok')
    expect(res.netQty).toBeCloseTo(10 + 1 + 1) // 10% of 10 =1 plus bufferQty 1
  })

  it('caps at zero when stock covers need', () => {
    const res = computeNetLine({ ...baseInput, onHandQty: 20 })
    if (res.kind !== 'ok') throw new Error('expected ok')
    expect(res.netQty).toBe(0)
  })

  it('rounds using pack size with ceil_pack', () => {
    const res = computeNetLine({ ...baseInput, grossQty: 5, roundingRule: 'ceil_pack', packSize: 4 })
    if (res.kind !== 'ok') throw new Error('expected ok')
    expect(res.roundedQty).toBe(8)
  })

  it('detects unit mismatch', () => {
    const res = computeNetLine({ ...baseInput, needUnit: 'kg', purchaseUnit: 'ud' })
    expect(res.kind).toBe('error')
    if (res.kind === 'error') {
      expect(res.reason).toBe('UNIT_MISMATCH')
    }
  })
})
