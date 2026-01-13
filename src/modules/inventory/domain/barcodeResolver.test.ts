import { resolveBarcode } from './barcodeResolver'

describe('resolveBarcode', () => {
  const mappings = { '123': 'item-a', 'ABC-999': 'item-b' }

  it('returns known when barcode exists', () => {
    expect(resolveBarcode('123', mappings)).toEqual({ status: 'known', supplierItemId: 'item-a' })
  })

  it('is case-sensitive and trims', () => {
    expect(resolveBarcode(' 123 ', mappings)).toEqual({ status: 'known', supplierItemId: 'item-a' })
    expect(resolveBarcode('abc-999', mappings)).toEqual({ status: 'unknown' })
  })

  it('returns unknown for missing', () => {
    expect(resolveBarcode('xxx', mappings)).toEqual({ status: 'unknown' })
  })
})
