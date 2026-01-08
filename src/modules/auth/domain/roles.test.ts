import { describe, expect, it } from 'vitest'
import { can } from './roles'

describe('roles permissions', () => {
  it('admin tiene todos los permisos', () => {
    expect(can('admin', 'admin:org')).toBe(true)
    expect(can('admin', 'menus:write')).toBe(true)
  })

  it('manager no tiene admin:org pero sí puede escribir', () => {
    expect(can('manager', 'admin:org')).toBe(false)
    expect(can('manager', 'events:write')).toBe(true)
  })

  it('staff solo lectura', () => {
    expect(can('staff', 'events:read')).toBe(true)
    expect(can('staff', 'events:write')).toBe(false)
    expect(can(undefined, 'events:write')).toBe(false)
  })
})
