import { getExpiryState } from './batches'

describe('getExpiryState', () => {
  const base = new Date('2026-01-10T00:00:00Z')

  it('returns expired when past', () => {
    expect(getExpiryState('2026-01-09T00:00:00Z', base)).toBe('expired')
  })

  it('returns soon_3 within 3 days', () => {
    expect(getExpiryState('2026-01-12T00:00:00Z', base)).toBe('soon_3')
  })

  it('returns soon_7 within 7 days', () => {
    expect(getExpiryState('2026-01-16T00:00:00Z', base)).toBe('soon_7')
  })

  it('returns ok beyond 7 days', () => {
    expect(getExpiryState('2026-01-25T00:00:00Z', base)).toBe('ok')
  })

  it('returns no_expiry when missing', () => {
    expect(getExpiryState(null, base)).toBe('no_expiry')
  })
})
