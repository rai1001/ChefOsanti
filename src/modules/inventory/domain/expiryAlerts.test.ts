import { describe, expect, it } from 'vitest'
import { categorizeExpiry, daysUntilExpiry, shouldTriggerAlert } from './expiryAlerts'

describe('daysUntilExpiry', () => {
  it('returns days difference rounded down', () => {
    const now = new Date('2026-01-10T00:00:00.000Z')
    expect(daysUntilExpiry('2026-01-12T12:00:00.000Z', now)).toBe(2)
  })

  it('returns null for invalid', () => {
    expect(daysUntilExpiry('bad', new Date())).toBeNull()
  })
})

describe('shouldTriggerAlert', () => {
  it('triggers when within window', () => {
    const now = new Date('2026-01-10T00:00:00.000Z')
    expect(shouldTriggerAlert('2026-01-11T00:00:00.000Z', 3, now)).toBe(true)
  })

  it('does not trigger when far', () => {
    const now = new Date('2026-01-10T00:00:00.000Z')
    expect(shouldTriggerAlert('2026-02-10T00:00:00.000Z', 3, now)).toBe(false)
  })
})

describe('categorizeExpiry', () => {
  it('categorizes expired', () => {
    const now = new Date('2026-01-10T00:00:00.000Z')
    expect(categorizeExpiry('2026-01-09T00:00:00.000Z', now)).toBe('expired')
    expect(categorizeExpiry('2026-01-10T00:00:00.000Z', now)).toBe('today')
    expect(categorizeExpiry('2026-01-11T00:00:00.000Z', now)).toBe('soon_3')
    expect(categorizeExpiry('2026-01-17T00:00:00.000Z', now)).toBe('soon_7')
  })
})
