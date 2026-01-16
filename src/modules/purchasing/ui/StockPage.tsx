import { useMemo, useState } from 'react'
import { AlertTriangle, Bell, Boxes, Filter, PackageSearch, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/modules/shared/ui/EmptyState'
import { ErrorBanner } from '@/modules/shared/ui/ErrorBanner'
import { Skeleton } from '@/modules/shared/ui/Skeleton'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useHotels } from '@/modules/events/data/events'
import { useBatches, useCreateManualEntry, useLocations } from '@/modules/inventory/data/batches'
import { useInboundMissingExpiry } from '@/modules/inventory/data/inboundAlerts'
import { getExpiryState } from '@/modules/inventory/domain/batches'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'
import { useSupplierItemsByOrg } from '../data/suppliers'
import { useAssignBarcode, useBarcodeMappings } from '@/modules/inventory/data/barcodes'
import { BarcodeScanner } from './components/BarcodeScanner'
import { AssignBarcodeSection } from './components/AssignBarcodeSection'
import { parseExpiryAndLot } from '@/modules/inventory/domain/ocrExpiryParser'
import { ImportDeliveryNoteModal } from './components/ImportDeliveryNoteModal'
import { useExpiryAlerts } from '@/modules/inventory/data/expiryAlerts'
import { Badge } from '@/modules/shared/ui/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/modules/shared/ui/Table'
import { Button } from '@/modules/shared/ui/Button'
import { Card } from '@/modules/shared/ui/Card'
import { DataState } from '@/modules/shared/ui/DataState'

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
  const missingExpiry = useInboundMissingExpiry({
    orgId: activeOrgId ?? undefined,
    hotelId: hotelId || undefined,
    locationId: locationId || undefined,
  })
  const batchesError = useFormattedError(batches.error)
  const missingExpiryError = useFormattedError(missingExpiry.error)
  const createEntryError = useFormattedError(createEntry.error)

  const hotelsOptions = hotels.data ?? []
  const locationOptions = locations.data ?? []
  const openAlertsCount = useMemo(() => {
    const all = expiryAlerts.data ?? []
    return all.filter((a) => (!hotelId || a.hotelId === hotelId) && (!locationId || a.locationId === locationId)).length
  }, [expiryAlerts.data, hotelId, locationId])
  const missingExpiryCount = useMemo(() => (missingExpiry.data ?? []).length, [missingExpiry.data])

  const batchStats = useMemo(() => {
    const list = batches.data ?? []
    let expired = 0
    let soon = 0
    let ok = 0
    let noExpiry = 0
    list.forEach((batch) => {
      const state = getExpiryState(batch.expiresAt)
      if (state === 'expired') expired += 1
      else if (state === 'soon_3' || state === 'soon_7') soon += 1
      else if (state === 'no_expiry') noExpiry += 1
      else ok += 1
    })
    return { total: list.length, expired, soon, ok, noExpiry }
  }, [batches.data])

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

  const statusBadge = (expiresAt: string | null) => {
    const status = getExpiryState(expiresAt)
    if (status === 'expired') return <Badge variant="danger">Expired</Badge>
    if (status === 'soon_3') return <Badge variant="warning">Near Expiry</Badge>
    if (status === 'soon_7') return <Badge variant="info">Near Expiry</Badge>
    if (status === 'no_expiry') return <Badge variant="info">No expiry</Badge>
    return <Badge variant="success">Good</Badge>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Inventory</p>
        <h1 className="text-4xl font-semibold text-foreground">Inventory & Expiry Control</h1>
        <p className="text-sm text-muted-foreground">Control de lotes, caducidades y entradas manuales.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-3xl border border-border/20 bg-surface/70 p-4 shadow-[0_16px_48px_rgba(3,7,18,0.45)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total items</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{batchStats.total}</p>
          <p className="text-sm text-muted-foreground">Lotes activos en stock.</p>
        </Card>
        <Card className="rounded-3xl border border-border/20 bg-surface/70 p-4 shadow-[0_16px_48px_rgba(3,7,18,0.45)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-warning/80">Near expiry</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{batchStats.soon}</p>
            </div>
            <span className="rounded-full bg-warning/10 p-3 text-warning">
              <AlertTriangle size={18} />
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Usar en los proximos 7 dias.</p>
        </Card>
        <Card className="rounded-3xl border border-border/20 bg-surface/70 p-4 shadow-[0_16px_48px_rgba(3,7,18,0.45)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-danger/80">Expired</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{batchStats.expired}</p>
            </div>
            <span className="rounded-full bg-danger/10 p-3 text-danger">
              <Boxes size={18} />
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Requiere disposicion inmediata.</p>
        </Card>
        <Card className="rounded-3xl border border-border/20 bg-surface/70 p-4 shadow-[0_16px_48px_rgba(3,7,18,0.45)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent/80">Alerts</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{openAlertsCount}</p>
            </div>
            <span className="rounded-full bg-accent/10 p-3 text-accent">
              <Bell size={18} />
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Caducidades abiertas.</p>
        </Card>
        <Card className="rounded-3xl border border-border/20 bg-surface/70 p-4 shadow-[0_16px_48px_rgba(3,7,18,0.45)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-warning/80">Falta caducidad</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{missingExpiryCount}</p>
            </div>
            <span className="rounded-full bg-warning/10 p-3 text-warning">
              <AlertTriangle size={18} />
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Albaranes sin fecha de caducidad.</p>
        </Card>
      </section>

      <Card className="rounded-3xl border border-border/25 bg-surface/70 p-5 shadow-[0_24px_60px_rgba(3,7,18,0.45)]">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search size={16} />
            </span>
            <input
              type="search"
              placeholder="Search stock items..."
              className="h-11 w-full rounded-xl border border-border/30 bg-surface2/70 pl-10 pr-4 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-brand-500/40"
              value={filters.search || ''}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-surface/60 px-3 py-2 text-xs text-muted-foreground">
            <Filter size={14} />
            <span className="text-[11px] uppercase tracking-wide">Filter</span>
            <label className="flex items-center gap-1 text-foreground">
              <input
                type="checkbox"
                checked={!!filters.expiringSoon}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, expiringSoon: e.target.checked, expired: false }))
                }
              />
              Near expiry
            </label>
            <label className="flex items-center gap-1 text-foreground">
              <input
                type="checkbox"
                checked={!!filters.expired}
                onChange={(e) => setFilters((f) => ({ ...f, expired: e.target.checked, expiringSoon: false }))}
              />
              Expired
            </label>
            {(filters.search || filters.expiringSoon || filters.expired) && (
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setFilters({})}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-surface/60 px-3 py-2 text-xs text-muted-foreground">
            <span className="text-[10px] uppercase tracking-wide">Hotel</span>
            <select
              className="bg-transparent text-sm text-foreground outline-none"
              value={hotelId}
              onChange={(e) => {
                setHotelId(e.target.value)
                setLocationId('')
              }}
            >
              <option value="">Todos</option>
              {hotelsOptions.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-surface/60 px-3 py-2 text-xs text-muted-foreground">
            <span className="text-[10px] uppercase tracking-wide">Location</span>
            <select
              className="bg-transparent text-sm text-foreground outline-none"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              <option value="">Selecciona</option>
              {locationOptions.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <Link
            to="/inventory/expiries"
            className="inline-flex items-center gap-2 rounded-xl border border-border/30 bg-surface/70 px-3 py-2 text-xs font-semibold text-foreground hover:border-accent/50"
          >
            <Bell className="h-4 w-4" />
            Caducidades ({openAlertsCount})
          </Link>

          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" disabled={!locationId} onClick={() => setImportModal(true)}>
              Importar albaran
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!locationId}
              onClick={() => {
                setScannerOpen(true)
              }}
            >
              Escanear barcode
            </Button>
            <Button size="sm" disabled={!locationId} onClick={() => setShowModal(true)}>
              Nueva entrada
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/20 bg-surface/50 backdrop-blur-lg">
          <DataState
            loading={batches.isLoading}
            error={locationId ? batches.error : null}
            errorTitle="Error al cargar lotes"
            errorMessage={batchesError ?? undefined}
            empty={!locationId || (batches.data?.length ?? 0) === 0}
            emptyState={
              <div className="p-6">
                <EmptyState
                  icon={PackageSearch}
                  title="Sin lotes"
                  description={locationId ? 'Anade una entrada manual para ver lotes.' : 'Selecciona una ubicacion primero.'}
                />
              </div>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.data?.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-semibold text-foreground">{batch.supplierItemName}</TableCell>
                    <TableCell className="text-muted-foreground">Prep</TableCell>
                    <TableCell className="text-right text-foreground">{batch.qty.toFixed(0)}</TableCell>
                    <TableCell className="text-muted-foreground">{batch.unit}</TableCell>
                    <TableCell className="text-foreground">
                      {batch.expiresAt ? new Date(batch.expiresAt).toLocaleDateString('en-CA') : '-'}
                    </TableCell>
                    <TableCell>{statusBadge(batch.expiresAt)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {batch.createdAt ? new Date(batch.createdAt).toLocaleString('en-US') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataState>
        </div>
      </Card>

      {missingExpiryCount > 0 && (
        <Card className="rounded-3xl border border-border/25 bg-surface/70 p-5 shadow-[0_24px_60px_rgba(3,7,18,0.45)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-warning/80">Caducidad pendiente</p>
              <p className="text-sm text-muted-foreground">Lineas de albaran sin fecha de caducidad.</p>
            </div>
            <Badge variant="warning">{missingExpiryCount}</Badge>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/20 bg-surface/50 backdrop-blur-lg">
            <DataState
              loading={missingExpiry.isLoading}
              error={missingExpiry.error}
              errorTitle="Error al cargar pendientes"
              errorMessage={missingExpiryError ?? undefined}
              empty={(missingExpiry.data ?? []).length === 0}
              emptyState={<div className="p-4 text-sm text-muted-foreground">Sin pendientes.</div>}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Ubicacion</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Fecha albaran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missingExpiry.data?.map((line) => (
                    <TableRow key={line.lineId}>
                      <TableCell className="font-semibold text-foreground">{line.description}</TableCell>
                      <TableCell className="text-muted-foreground">{line.supplierName}</TableCell>
                      <TableCell className="text-muted-foreground">{line.locationName}</TableCell>
                      <TableCell className="text-right text-foreground">{line.qty.toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {line.deliveredAt ?? '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataState>
          </div>
        </Card>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-xl border border-white/10 bg-surface/80 p-6 shadow-2xl">
            <form className="space-y-3" onSubmit={handleSubmitEntry}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Nueva entrada</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setScannerOpen(false)
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  x
                </button>
              </div>
              <div className="mb-1">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
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
                  <span className="text-xs font-medium text-muted-foreground">Foto/archivo para sugerir caducidad/lote (OCR)</span>
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
                    <p className="text-[11px] text-muted-foreground">
                      {ocrSuggestion.message}{' '}
                      {ocrSuggestion.expiresAt ? ` | Cad: ${ocrSuggestion.expiresAt}` : ''}{' '}
                      {ocrSuggestion.lotCode ? ` | Lote: ${ocrSuggestion.lotCode}` : ''}
                    </p>
                  )}
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Texto OCR (pruebas)</span>
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
                  <span className="text-xs font-medium text-muted-foreground">Producto</span>
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
                  <span className="text-xs font-medium text-muted-foreground">Cantidad</span>
                  <input
                    type="number"
                    className="ds-input"
                    value={entry.qty || ''}
                    onChange={(e) => setEntry((prev) => ({ ...prev, qty: Number(e.target.value) || 0 }))}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Unidad</span>
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
                  <span className="text-xs font-medium text-muted-foreground">Caducidad</span>
                  <input
                    type="date"
                    className="ds-input"
                    value={entry.expiresAt ?? ''}
                    onChange={(e) => setEntry((prev) => ({ ...prev, expiresAt: e.target.value || null }))}
                  />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs font-medium text-muted-foreground">Lote (opcional)</span>
                  <input
                    className="ds-input"
                    value={entry.lotCode ?? ''}
                    onChange={(e) => setEntry((prev) => ({ ...prev, lotCode: e.target.value || null }))}
                  />
                </label>
              </div>

              {createEntryError && (
                <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {createEntryError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createEntry.isPending}>
                  {createEntry.isPending ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {importModal && (
        <ImportDeliveryNoteModal
          open={importModal}
          onClose={() => setImportModal(false)}
          orgId={activeOrgId ?? undefined}
          locations={locationOptions}
          supplierItems={supplierItems.data ?? []}
          defaultLocationId={locationId}
        />
      )}

      {scannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border/30 bg-surface/90 p-4 shadow-2xl">
            <button
              type="button"
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              onClick={() => setScannerOpen(false)}
            >
              <X size={16} />
            </button>
            <p className="mb-3 text-sm text-foreground">Apunta la camara al codigo de barras.</p>
            <div className="overflow-hidden rounded-xl border border-border/30">
              <BarcodeScanner
                onDetected={(code) => {
                  setPendingBarcode(code)
                  setScannerOpen(false)
                  setShowModal(true)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {pendingBarcode && (
        <AssignBarcodeSection
          barcode={pendingBarcode}
          mappings={barcodeMappings.data ?? []}
          supplierItems={supplierItems.data ?? []}
          onAssign={async (itemId) => {
            await assignBarcode.mutateAsync({ orgId: activeOrgId ?? '', barcode: pendingBarcode || '', supplierItemId: itemId })
            setPendingBarcode(null)
          }}
        />
      )}
    </div>
  )
}
