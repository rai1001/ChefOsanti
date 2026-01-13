import { describe, expect, it } from 'vitest'
import { buildRunAndBatch, computeExpiresAt } from './preparations'

describe('computeExpiresAt', () => {
  it('sums shelf life days', () => {
    const produced = '2026-01-10T10:00:00.000Z'
    expect(computeExpiresAt(produced, 3)).toBe('2026-01-13T10:00:00.000Z')
  })

  it('handles invalid dates', () => {
    expect(computeExpiresAt('bad', 3)).toBeNull()
  })
})

describe('buildRunAndBatch', () => {
  it('builds run and batch with expires', () => {
    const res = buildRunAndBatch({
      orgId: 'org',
      preparationId: 'prep1',
      locationId: 'loc',
      producedQty: 5,
      producedUnit: 'kg',
      producedAt: '2026-01-10T00:00:00.000Z',
      shelfLifeDays: 2,
      labelsCount: 2,
    })
    expect(res.runRecord.expires_at).toBe('2026-01-12T00:00:00.000Z')
    expect(res.batchRecord.source).toBe('prep')
    expect(res.batchRecord.qty).toBe(5)
    expect(res.batchRecord.preparation_id).toBe('prep1')
  })
})
