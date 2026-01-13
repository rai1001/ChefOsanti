export type BarcodeResolution =
  | { status: 'known'; supplierItemId: string }
  | { status: 'unknown' }

export function resolveBarcode(
  barcode: string,
  mappings: Record<string, string>,
): BarcodeResolution {
  const clean = barcode.trim()
  if (!clean) return { status: 'unknown' }
  const match = mappings[clean]
  if (match) return { status: 'known', supplierItemId: match }
  return { status: 'unknown' }
}
