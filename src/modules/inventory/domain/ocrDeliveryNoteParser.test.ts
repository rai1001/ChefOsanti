import { describe, expect, it } from 'vitest'
import { buildShipmentDedupeKey, parseDeliveryNote } from './ocrDeliveryNoteParser'

const sample = `
ALBARÁN 1234
Proveedor Demo
Fecha: 12/01/2026
Tomate rama 10 kg
Huevos L 30 ud
`

describe('parseDeliveryNote', () => {
  it('extrae header y líneas', () => {
    const res = parseDeliveryNote(sample)
    expect(res.header.deliveryNoteNumber).toContain('1234')
    expect(res.header.deliveredAt).toBe('2026-01-12')
    expect(res.lines.length).toBeGreaterThan(0)
    const first = res.lines[0]
    expect(first.description.toLowerCase()).toContain('tomate')
    expect(first.qty).toBe(10)
    expect(first.unit).toBe('kg')
  })

  it('advierte cuando no hay líneas', () => {
    const res = parseDeliveryNote('Documento sin líneas numéricas')
    expect(res.lines.length).toBe(0)
    expect(res.warnings.length).toBeGreaterThan(0)
  })
})

describe('buildShipmentDedupeKey', () => {
  it('combina valores y rawText', () => {
    const key = buildShipmentDedupeKey({
      orgId: 'org',
      supplierName: 'Prov',
      deliveryNoteNumber: 'A-1',
      deliveredAt: '2026-01-12',
      rawText: 'Texto de prueba',
    })
    expect(key).toContain('org')
    expect(key).toContain('prov')
    expect(key).toContain('a-1')
  })
})
