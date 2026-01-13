import type { SupplierItem } from '@/modules/purchasing/domain/types'
import type { BarcodeMapping } from '@/modules/inventory/data/barcodes'

type Props = {
  barcode: string
  mappings: BarcodeMapping[]
  supplierItems: SupplierItem[]
  onAssign: (supplierItemId: string) => Promise<void>
}

export function AssignBarcodeSection({ barcode, mappings, supplierItems, onAssign }: Props) {
  const existing = mappings.find((m) => m.barcode === barcode)

  if (existing) {
    const itemName = supplierItems.find((s) => s.id === existing.supplierItemId)?.name ?? existing.supplierItemId
    return (
      <div className="rounded border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
        Barcode detectado <span className="font-semibold text-white">{barcode}</span> ya está asignado a{' '}
        <span className="font-semibold text-white">{itemName}</span>.
      </div>
    )
  }

  return (
    <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
      <p className="font-semibold">Barcode desconocido: {barcode}</p>
      <p className="text-xs text-amber-200">Asigna el código a un producto existente.</p>
      <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
        <select
          className="ds-input"
          onChange={async (e) => {
            if (e.target.value) {
              await onAssign(e.target.value)
            }
          }}
        >
          <option value="">Selecciona producto</option>
          {supplierItems.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
