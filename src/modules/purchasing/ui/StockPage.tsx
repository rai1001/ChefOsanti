import { useMemo, useState } from 'react'
import { Package, PlusCircle, Scan, Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/modules/shared/ui/EmptyState'
import { ErrorBanner } from '@/modules/shared/ui/ErrorBanner'
import { Skeleton } from '@/modules/shared/ui/Skeleton'
import { PageHeader } from '@/modules/shared/ui/PageHeader'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useHotels } from '@/modules/events/data/events'
import { useBatches, useCreateManualEntry, useLocations } from '@/modules/inventory/data/batches'
import { getExpiryState } from '@/modules/inventory/domain/batches'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'
import { useSupplierItemsByOrg } from '../data/suppliers'
import { useAssignBarcode, useBarcodeMappings } from '@/modules/inventory/data/barcodes'
import { resolveBarcode } from '@/modules/inventory/domain/barcodeResolver'
import { BarcodeScanner } from './components/BarcodeScanner'
import { AssignBarcodeSection } from './components/AssignBarcodeSection'
import { parseExpiryAndLot } from '@/modules/inventory/domain/ocrExpiryParser'
import { ImportDeliveryNoteModal } from './components/ImportDeliveryNoteModal'
import { useExpiryAlerts } from '@/modules/inventory/data/expiryAlerts'

type EntryForm = {
  supplierItemId: string
  qty: number
  unit: 'kg' | 'ud'
  expiresAt: string | null
  lotCode: string | null
}

export default function StockPage() {
  const { session, loading, error } = useSupabaseSession()
  const { activeOrgId } = useActiveOrgId()
  const hotels = useHotels()
  const sessionError = useFormattedError(error)
  const [hotelId, setHotelId] = useState<string>('')
  const [locationId, setLocationId] = useState<string>('')
  const [filters, setFilters] = useState<{ search?: string; expiringSoon?: boolean; expired?: boolean }>({})
  const locations = useLocations(activeOrgId ?? undefined, hotelId || undefined)
  const batches = useBatches(locationId || undefined, filters)
  const supplierItems = useSupplierItemsByOrg(activeOrgId ?? undefined)
  const createEntry = useCreateManualEntry()
  const barcodeMappings = useBarcodeMappings(activeOrgId ?? undefined)
  const assignBarcode = useAssignBarcode()
  const [showModal, setShowModal] = useState(false)
  const [importModal, setImportModal] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null)
  const [ocrSuggestion, setOcrSuggestion] = useState<{ expiresAt?: string; lotCode?: string; message?: string } | null>(null)
  const [entry, setEntry] = useState<EntryForm>({
    supplierItemId: '',
    qty: 0,
    unit: 'ud',
    expiresAt: null,
    lotCode: null,
  })
  const expiryAlerts = useExpiryAlerts({ orgId: activeOrgId ?? undefined, status: 'open' })
  const batchesError = useFormattedError(batches.error)
  const createEntryError = useFormattedError(createEntry.error)

  const hotelsOptions = hotels.data ?? []
  const locationOptions = locations.data ?? []
  const selectedLocation = useMemo(
    () => locationOptions.find((l) => l.id === locationId),
    [locationId, locationOptions],
  )
  const openAlertsCount = useMemo(() => {
    const all = expiryAlerts.data ?? []
    return all.filter((a) => (!hotelId || a.hotelId === hotelId) && (!locationId || a.locationId === locationId)).length
  }, [expiryAlerts.data, hotelId, locationId])

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeOrgId || !locationId || !entry.supplierItemId || entry.qty <= 0) return
    await createEntry.mutateAsync({
      orgId: activeOrgId,
      locationId,
      supplierItemId: entry.supplierItemId,
      qty: entry.qty,
      unit: entry.unit,
      expiresAt: entry.expiresAt,
      lotCode: entry.lotCode,
      source: 'adjustment',
    })
    setShowModal(false)
    setEntry({ supplierItemId: '', qty: 0, unit: 'ud', expiresAt: null, lotCode: null })
    setPendingBarcode(null)
    setScannerOpen(false)
  }

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-4 w-64" />
      </div>
    )
  }
  if (!session || error) {
    return <ErrorBanner title="Inicia sesion" message={sessionError || 'Inicia sesion para ver stock.'} />
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Inventario por lotes (FEFO)"
        subtitle="Controla lotes, caducidades y entradas manuales por ubicacion."
        actions={
          <div className="flex flex-wrap gap-2">
            <select className="ds-input max-w-xs" value={hotelId} onChange={(e) => { setHotelId(e.target.value); setLocationId('') }}>
              <option value="">Todos los hoteles</option>
              {hotelsOptions.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            <select className="ds-input max-w-xs" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">Selecciona ubicacion</option>
              {locationOptions.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            <Link to="/inventory/expiries" className="ds-btn ds-btn-ghost flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Caducidades ({openAlertsCount})
            </Link>
            <div className="flex gap-2">
              <button
                type="button"
                className="ds-btn ds-btn-ghost"
                disabled={!locationId}
                onClick={() => {
                  setScannerOpen(true)
                  setShowModal(true)
                }}
              >
                Escanear barcode
              </button>
              <button
                type="button"
                className="ds-btn ds-btn-ghost"
                disabled={!locationId}
                onClick={() => setImportModal(true)}
              >
                <Scan className="h-4 w-4" />
                Importar albaran
              </button>
              <button
                type="button"
                className="ds-btn ds-btn-primary"
                disabled={!locationId}
                onClick={() => setShowModal(true)}
              >
                <PlusCircle className="h-4 w-4" />
                Nueva entrada
              </button>
            </div>
          </div>
        }
      />

      <div className="ds-card">
        <div className="ds-section-header">
          <div>
            <h2 className="text-sm font-semibold text-white">Lotes</h2>
            <p className="text-xs text-slate-400">{selectedLocation ? selectedLocation.name : 'Selecciona ubicacion'}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <input
              className="ds-input max-w-xs"
              placeholder="Buscar producto"
              value={filters.search || ''}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
            <label className="flex items-center gap-1 text-slate-300">
              <input
                type="checkbox"
                checked={!!filters.expiringSoon}
                onChange={(e) => setFilters((f) => ({ ...f, expiringSoon: e.target.checked, expired: false }))}
              />
              Proximos 7d
            </label>
            <label className="flex items-center gap-1 text-slate-300">
              <input
                type="checkbox"
                checked={!!filters.expired}
                onChange={(e) => setFilters((f) => ({ ...f, expired: e.target.checked, expiringSoon: false }))}
              />
              Solo caducados
            </label>
          </div>
        </div>
        {batches.isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : batches.isError ? (
          <div className="p-4">
            <ErrorBanner
              title="Error al cargar lotes"
              message={batchesError}
              onRetry={() => batches.refetch()}
            />
          </div>
        ) : batches.data?.length ? (
          <div className="overflow-x-auto">
            <table className="ds-table min-w-full">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="is-num">Cantidad</th>
                  <th>Unidad</th>
                  <th>Caduca</th>
                  <th>Estado</th>
                  <th>Lote</th>
                  <th>Fuente</th>
                </tr>
              </thead>
              <tbody>
                {batches.data.map((batch) => {
                  const status = getExpiryState(batch.expiresAt)
                  const statusLabel =
                    status === 'expired'
                      ? 'Expirado'
                      : status === 'soon_3'
                        ? 'Caduca <3d'
                        : status === 'soon_7'
                          ? 'Caduca <7d'
                          : status === 'no_expiry'
                            ? 'Sin fecha'
                            : 'OK'
                  const badgeClass =
                    status === 'expired'
                      ? 'ds-badge is-error'
                      : status === 'soon_3'
                        ? 'ds-badge is-warn'
                        : status === 'soon_7'
                          ? 'ds-badge is-info'
                          : 'ds-badge'
                  return (
                    <tr key={batch.id}>
                      <td className="font-semibold text-slate-200">{batch.supplierItemName}</td>
                      <td className="is-num">{batch.qty.toFixed(2)}</td>
                      <td>{batch.unit}</td>
                      <td>{batch.expiresAt ? new Date(batch.expiresAt).toLocaleDateString() : '-'}</td>
                      <td>
                        <span className={badgeClass}>{statusLabel}</span>
                      </td>
                      <td>{batch.lotCode || '-'}</td>
                      <td className="uppercase text-xs text-slate-400">{batch.source}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              icon={Package}
              title="Sin lotes"
              description={locationId ? 'Anade una entrada manual para ver lotes.' : 'Selecciona una ubicacion primero.'}
            />
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-xl border border-white/10 bg-nano-navy-800 p-6 shadow-2xl">
            <form className="space-y-3" onSubmit={handleSubmitEntry}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">Nueva entrada</h3>
                <button type="button" onClick={() => { setShowModal(false); setScannerOpen(false); }} className="text-slate-400 hover:text-white">
                  x
                </button>
              </div>
              <div className="mb-1">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={scannerOpen}
                    onChange={(e) => setScannerOpen(e.target.checked)}
                  />
                  Escanear con camara
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-300">Foto/archivo para sugerir caducidad/lote (OCR)</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,.txt"
                    className="ds-input"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const text = await file.text().catch(() => '')
                      const res = parseExpiryAndLot(text)
                      if (res.confidence > 0) {
                        setOcrSuggestion({
                          expiresAt: res.expiresAt,
                          lotCode: res.lotCode,
                          message: 'Sugerido por OCR',
                        })
                        setEntry((prev) => ({
                          ...prev,
                          expiresAt: res.expiresAt ?? prev.expiresAt,
                          lotCode: res.lotCode ?? prev.lotCode,
                        }))
                      } else {
                        setOcrSuggestion({ message: 'No se detecto caducidad/lote' })
                      }
                    }}
                  />
                  {ocrSuggestion && (
                    <p className="text-[11px] text-slate-400">
                      {ocrSuggestion.message}{' '}
                      {ocrSuggestion.expiresAt ? ` | Cad: ${ocrSuggestion.expiresAt}` : ''}{' '}
                      {ocrSuggestion.lotCode ? ` | Lote: ${ocrSuggestion.lotCode}` : ''}
                    </p>
                  )}
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-300">Texto OCR (pruebas)</span>
                  <textarea
                    className="ds-input min-h-[80px]"
                    placeholder="Pega texto de etiqueta para sugerir"
                    onBlur={(e) => {
                      const res = parseExpiryAndLot(e.target.value)
                      if (res.confidence > 0) {
                        setEntry((prev) => ({
                          ...prev,
                          expiresAt: res.expiresAt ?? prev.expiresAt,
                          lotCode: res.lotCode ?? prev.lotCode,
                        }))
                        setOcrSuggestion({
                          expiresAt: res.expiresAt,
                          lotCode: res.lotCode,
                          message: 'Sugerido por OCR (texto pegado)',
                        })
                      }
                    }}
                  />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-300">Producto</span>
                  <select
                    className="ds-input"
                    value={entry.supplierItemId}
                    onChange={(e) => setEntry((prev) => ({ ...prev, supplierItemId: e.target.value }))}
                  >
                    <option value="">Selecciona</option>
                    {supplierItems.data?.map((si) => (
                      <option key={si.id} value={si.id}>
                        {si.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-300">Cantidad</span>
                  <input
                    type="number"
                    className="ds-input"
                    value={entry.qty || ''}
                    onChange={(e) => setEntry((prev) => ({ ...prev, qty: Number(e.target.value) || 0 }))}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-300">Unidad</span>
                  <select
                    className="ds-input"
                    value={entry.unit}
                    onChange={(e) => setEntry((prev) => ({ ...prev, unit: e.target.value as 'kg' | 'ud' }))}
                  >
                    <option value="ud">Unidades</option>
                    <option value="kg">Kilogramos</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-slate-300">Caducidad</span>
                  <input
                    type="date"
                    className="ds-input"
                    value={entry.expiresAt ?? ''}
                    onChange={(e) => setEntry((prev) => ({ ...prev, expiresAt: e.target.value || null }))}
                  />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs font-medium text-slate-300">Lote (opcional)</span>
                  <input
                    className="ds-input"
                    value={entry.lotCode ?? ''}
                    onChange={(e) => setEntry((prev) => ({ ...prev, lotCode: e.target.value || null }))}
                  />
                </label>
              </div>

              {createEntry.isError && (
                <div className="mt-2">
                  <ErrorBanner title="Error al crear entrada" message={createEntryError} />
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
                {scannerOpen && (
                  <BarcodeScanner
                    onDetected={(code) => {
                      if (!code || !activeOrgId) return
                      setPendingBarcode(code)
                      const mappings = Object.fromEntries(
                        (barcodeMappings.data ?? []).map((m) => [m.barcode, m.supplierItemId]),
                      )
                      const res = resolveBarcode(code, mappings)
                      if (res.status === 'known') {
                        setEntry((prev) => ({ ...prev, supplierItemId: res.supplierItemId }))
                      }
                    }}
                  />
                )}

                {pendingBarcode && (
                  <AssignBarcodeSection
                    barcode={pendingBarcode}
                    mappings={barcodeMappings.data ?? []}
                    supplierItems={supplierItems.data ?? []}
                    onAssign={async (supplierItemId) => {
                      if (!activeOrgId) return
                      await assignBarcode.mutateAsync({
                        orgId: activeOrgId,
                        supplierItemId,
                        barcode: pendingBarcode,
                      })
                      setEntry((prev) => ({ ...prev, supplierItemId }))
                    }}
                  />
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setScannerOpen(false) }}
                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createEntry.isPending}
                    className="ds-btn ds-btn-primary disabled:opacity-60"
                  >
                    {createEntry.isPending ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ImportDeliveryNoteModal
        open={importModal}
        onClose={() => setImportModal(false)}
        orgId={activeOrgId ?? undefined}
        locations={locationOptions}
        supplierItems={supplierItems.data ?? []}
        defaultLocationId={locationId || undefined}
      />
    </div>
  )
}
