import { describe, expect, it } from 'vitest'
import { canUseFeature } from './aiAccess'

describe('canUseFeature', () => {
  it('bloquea plan básico para order_audit', () => {
    expect(canUseFeature('admin', 'basic', 'order_audit')).toBe(false)
  })

  it('manager con pro puede daily_brief', () => {
    expect(canUseFeature('manager', 'pro', 'daily_brief')).toBe(true)
  })

  it('staff vip no puede order_audit', () => {
    expect(canUseFeature('staff', 'vip', 'order_audit')).toBe(false)
  })

  it('admin vip puede order_audit', () => {
    expect(canUseFeature('admin', 'vip', 'order_audit')).toBe(true)
  })
})
