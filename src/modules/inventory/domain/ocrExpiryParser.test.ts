import { describe, expect, it } from 'vitest'
import { parseExpiryAndLot } from './ocrExpiryParser'

describe('parseExpiryAndLot', () => {
  it('detecta fecha dd/mm/yyyy y lote', () => {
    const text = 'CAD: 12/03/2026 LOTE ABC123'
    const res = parseExpiryAndLot(text)
    expect(res.expiresAt).toBe('2026-03-12')
    expect(res.lotCode).toBe('ABC123')
    expect(res.confidence).toBeGreaterThan(0.5)
  })

  it('soporta formato yyyy-mm-dd', () => {
    const res = parseExpiryAndLot('Best before: 2026-11-05')
    expect(res.expiresAt).toBe('2026-11-05')
  })

  it('retorna vacío si no hay matches', () => {
    const res = parseExpiryAndLot('Sin datos de caducidad')
    expect(res.confidence).toBe(0)
    expect(res.expiresAt).toBeUndefined()
    expect(res.lotCode).toBeUndefined()
  })
})
