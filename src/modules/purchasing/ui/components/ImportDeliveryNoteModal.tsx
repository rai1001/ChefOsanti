import { useEffect, useMemo, useState } from 'react'
import { X, FileUp, CheckCircle } from 'lucide-react'
import type { InventoryLocation } from '@/modules/inventory/data/batches'
import type { SupplierItem } from '@/modules/purchasing/domain/types'
import type { ParsedDeliveryNote } from '@/modules/inventory/domain/ocrDeliveryNoteParser'
import { buildShipmentDedupeKey, parseDeliveryNote } from '@/modules/inventory/domain/ocrDeliveryNoteParser'
import { useCreateInboundShipment } from '@/modules/inventory/data/inbound'
import { ErrorBanner } from '@/modules/shared/ui/ErrorBanner'
import { Skeleton } from '@/modules/shared/ui/Skeleton'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'

type EditableLine = {
  description: string
  qty: number
  unit: string
  expiresAt?: string | null
  lotCode?: string | null
  supplierItemId?: string | null
  importLine: boolean
  status: 'ready' | 'blocked' | 'skipped'
}

type Props = {
  open: boolean
  onClose: () => void
  orgId?: string
  locations: InventoryLocation[]
  supplierItems: SupplierItem[]
  defaultLocationId?: string
}

function computeStatus(line: EditableLine): 'ready' | 'blocked' | 'skipped' {
  if (!line.importLine) return 'skipped'
  if (!line.qty || line.qty <= 0) return 'blocked'
  if (!line.unit) return 'blocked'
  if (line.unit !== 'kg' && line.unit !== 'ud') return 'blocked'
  if (!line.supplierItemId) return 'blocked'
  return 'ready'
}

export function ImportDeliveryNoteModal({ open, onClose, orgId, locations, supplierItems, defaultLocationId }: Props) {
  const [rawText, setRawText] = useState('')
  const [parsed, setParsed] = useState<ParsedDeliveryNote | null>(null)
  const [locationId, setLocationId] = useState(defaultLocationId ?? '')
  const [supplierName, setSupplierName] = useState('')
  const [deliveryNumber, setDeliveryNumber] = useState('')
  const [deliveredAt, setDeliveredAt] = useState<string>('')
  const [lines, setLines] = useState<EditableLine[]>([])
  const [processing, setProcessing] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const createShipment = useCreateInboundShipment()

  useEffect(() => {
    if (!open) {
      setRawText('')
      setParsed(null)
      setLines([])
      setSupplierName('')
      setDeliveryNumber('')
      setDeliveredAt('')
      setSuccessMsg(null)
    }
  }, [open])

  useEffect(() => {
    if (open && defaultLocationId) {
      setLocationId(defaultLocationId)
    }
  }, [open, defaultLocationId])

  const formattedError = useFormattedError(createShipment.error)

  const blockedLines = useMemo(
    () => lines.filter((l) => l.importLine && l.status === 'blocked'),
    [lines],
  )

  const handleFile = async (file: File | null) => {
    if (!file) return
    setProcessing(true)
    try {
      const text = await file.text().catch(() => '')
      setRawText(text)
      if (text) handleParse(text)
    } finally {
      setProcessing(false)
    }
  }

  const handleParse = (text: string) => {
    const parsedNote = parseDeliveryNote(text)
    setParsed(parsedNote)
    setSupplierName(parsedNote.header.supplierName ?? '')
    setDeliveryNumber(parsedNote.header.deliveryNoteNumber ?? '')
    setDeliveredAt(parsedNote.header.deliveredAt ?? '')
    const mapped = (parsedNote.lines ?? []).map<EditableLine>((l) => ({
      description: l.description,
      qty: Number(l.qty ?? 0),
      unit: l.unit ?? '',
      expiresAt: l.expiresAt ?? null,
      lotCode: l.lotCode ?? null,
      supplierItemId: undefined,
      importLine: false,
      status: 'blocked',
    }))
    mapped.forEach((ln) => {
      ln.status = computeStatus(ln)
    })
    setLines(mapped)
  }

  const updateLine = (idx: number, updater: (line: EditableLine) => EditableLine) => {
    setLines((prev) => {
      const clone = [...prev]
      clone[idx] = updater({ ...clone[idx] })
      clone[idx].status = computeStatus(clone[idx])
      return clone
    })
  }

  const addManualLine = () => {
    setLines((prev) => [
      ...prev,
      { description: 'Nuevo item', qty: 1, unit: 'ud', importLine: true, status: 'blocked' },
    ])
  }

  const handleConfirm = async () => {
    if (!orgId) return
    if (!locationId) {
      createShipment.reset()
      return
    }
    if (blockedLines.length > 0) {
      return
    }
    const payload = {
      orgId,
      locationId,
      supplierId: null,
      supplierName: supplierName || null,
      deliveryNoteNumber: deliveryNumber || null,
      deliveredAt: deliveredAt || null,
      source: rawText ? ('ocr' as const) : ('manual' as const),
      rawOcrText: rawText || null,
      dedupeKey: buildShipmentDedupeKey({
        orgId,
        supplierName,
        deliveryNoteNumber: deliveryNumber,
        deliveredAt,
        rawText,
      }),
      lines: lines.map((l) => ({
        supplierItemId: l.supplierItemId ?? null,
        description: l.description,
        qty: l.qty,
        unit: l.unit,
        expiresAt: l.expiresAt ?? null,
        lotCode: l.lotCode ?? null,
        status: computeStatus(l),
        importLine: l.importLine,
      })),
    }

    await createShipment.mutateAsync(payload)
    setSuccessMsg('Albarán importado y lotes creados')
    setTimeout(() => {
      onClose()
    }, 800)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl rounded-xl border border-white/10 bg-nano-navy-800 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Importar albarán</h2>
            <p className="text-xs text-slate-400">OCR asistido: revisa y confirma antes de crear lotes.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2 rounded-lg border border-dashed border-white/10 bg-white/5 p-3 text-xs text-slate-200">
            <span className="flex items-center gap-2 font-semibold">
              <FileUp className="h-4 w-4" /> Subir imagen/PDF
            </span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,.txt"
              className="text-xs"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <span className="text-[11px] text-slate-400">
              Si el OCR falla, pega el texto abajo y continúa manualmente.
            </span>
          </label>

          <div className="md:col-span-2">
            <label className="flex flex-col gap-2 text-xs text-slate-200">
              <span className="font-semibold">Texto OCR (pégalo para pruebas)</span>
              <textarea
                className="ds-input min-h-[120px]"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Pega el texto extraído o escribe a mano"
              />
            </label>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="ds-btn ds-btn-primary"
                onClick={() => handleParse(rawText)}
                disabled={processing || !rawText}
              >
                {processing ? 'Procesando...' : 'Procesar OCR'}
              </button>
              <button type="button" className="ds-btn ds-btn-ghost" onClick={addManualLine}>
                Añadir línea manual
              </button>
            </div>
          </div>
        </div>

        {parsed?.warnings?.length ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
            {parsed.warnings.join(' | ')}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-xs text-slate-300 space-y-1">
            <span>Proveedor</span>
            <input
              className="ds-input"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Nombre proveedor"
            />
          </label>
          <label className="text-xs text-slate-300 space-y-1">
            <span>Nº albarán</span>
            <input
              className="ds-input"
              value={deliveryNumber}
              onChange={(e) => setDeliveryNumber(e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-300 space-y-1">
            <span>Fecha</span>
            <input
              type="date"
              className="ds-input"
              value={deliveredAt ?? ''}
              onChange={(e) => setDeliveredAt(e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-300 space-y-1">
            <span>Ubicación</span>
            <select className="ds-input" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">Selecciona</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-auto rounded-lg border border-white/10">
          <table className="ds-table min-w-full">
            <thead className="sticky top-0 bg-white/5">
              <tr>
                <th>Importar</th>
                <th>Descripción</th>
                <th className="is-num">Qty</th>
                <th>Unidad</th>
                <th>Producto</th>
                <th>Caducidad</th>
                <th>Lote</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-sm text-slate-400">
                    Sin líneas. Añade una manual o pega texto para parsear.
                  </td>
                </tr>
              )}
              {lines.map((line, idx) => (
                <tr key={idx}>
                  <td>
                    <input
                      type="checkbox"
                      checked={line.importLine}
                      onChange={(e) => updateLine(idx, (l) => ({ ...l, importLine: e.target.checked }))}
                    />
                  </td>
                  <td>
                    <input
                      className="ds-input"
                      aria-label="Descripción línea"
                      value={line.description}
                      onChange={(e) => updateLine(idx, (l) => ({ ...l, description: e.target.value }))}
                    />
                  </td>
                  <td className="is-num">
                    <input
                      className="ds-input"
                      aria-label="Cantidad línea"
                      type="number"
                      value={line.qty}
                      onChange={(e) =>
                        updateLine(idx, (l) => ({ ...l, qty: Number(e.target.value) || 0 }))
                      }
                    />
                  </td>
                  <td>
                    <select
                      className="ds-input"
                      aria-label="Unidad línea"
                      value={line.unit}
                      onChange={(e) => updateLine(idx, (l) => ({ ...l, unit: e.target.value }))}
                    >
                      <option value="">-</option>
                      <option value="kg">kg</option>
                      <option value="ud">ud</option>
                    </select>
                  </td>
                  <td>
                    <select
                      className="ds-input"
                      aria-label="Producto línea"
                      value={line.supplierItemId ?? ''}
                      onChange={(e) =>
                        updateLine(idx, (l) => ({ ...l, supplierItemId: e.target.value || null }))
                      }
                    >
                      <option value="">Sin mapping</option>
                      {supplierItems.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="date"
                      className="ds-input"
                      value={line.expiresAt ?? ''}
                      onChange={(e) => updateLine(idx, (l) => ({ ...l, expiresAt: e.target.value || null }))}
                    />
                  </td>
                  <td>
                    <input
                      className="ds-input"
                      value={line.lotCode ?? ''}
                      onChange={(e) => updateLine(idx, (l) => ({ ...l, lotCode: e.target.value || null }))}
                    />
                  </td>
                  <td>
                    {line.status === 'ready' ? (
                      <span className="ds-badge">OK</span>
                    ) : line.status === 'blocked' ? (
                      <span className="ds-badge is-warn text-[11px]">Revisar</span>
                    ) : (
                      <span className="ds-badge is-ghost text-[11px]">Skip</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {blockedLines.length > 0 && (
          <div className="text-xs text-amber-200">
            Hay líneas bloqueadas sin mapping o unidad inválida. Corrige o desmarca "Importar".
          </div>
        )}

        {formattedError && (
          <ErrorBanner title="Error al importar albarán" message={formattedError} onRetry={() => createShipment.reset()} />
        )}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-emerald-200 text-sm">
            <CheckCircle className="h-4 w-4" /> {successMsg}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
          <button className="ds-btn ds-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="ds-btn ds-btn-primary disabled:opacity-60"
            disabled={
              createShipment.isPending ||
              !locationId ||
              lines.length === 0 ||
              blockedLines.length > 0 ||
              lines.every((l) => !l.importLine)
            }
            onClick={handleConfirm}
          >
            {createShipment.isPending ? 'Importando...' : 'Guardar albarán e importar stock'}
          </button>
        </div>
      </div>
      {processing && (
        <div className="absolute top-4 right-4 w-48 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      )}
    </div>
  )
}
