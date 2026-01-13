import { describe, it, expect } from 'vitest'
import { computeAvailableOnHand, detectReservationConflicts } from './reservations'

describe('reservations domain', () => {
  it('reduces onHand by reserved', () => {
    expect(computeAvailableOnHand(10, 3)).toBe(7)
  })

  it('floors at zero', () => {
    expect(computeAvailableOnHand(5, 10)).toBe(0)
  })

  it('detects conflicts when reserved > stock', () => {
    const res = detectReservationConflicts(5, 8)
    expect(res.hasConflict).toBe(true)
    expect(res.shortage).toBe(3)
  })

  it('no conflict when stock covers reservations', () => {
    const res = detectReservationConflicts(10, 4)
    expect(res.hasConflict).toBe(false)
    expect(res.shortage).toBe(0)
  })
})
