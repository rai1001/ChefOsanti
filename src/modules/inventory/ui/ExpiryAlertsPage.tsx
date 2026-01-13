import { useMemo, useState } from 'react'
import { AlertTriangle, Bell, CheckCircle } from 'lucide-react'
import { PageHeader } from '@/modules/shared/ui/PageHeader'
import { Skeleton } from '@/modules/shared/ui/Skeleton'
import { ErrorBanner } from '@/modules/shared/ui/ErrorBanner'
import { EmptyState } from '@/modules/shared/ui/EmptyState'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useHotels } from '@/modules/events/data/events'
import { useLocations } from '@/modules/inventory/data/batches'
import {
  useExpiryAlerts,
  useExpiryRules,
  useDismissExpiryAlert,
  useCreateExpiryRule,
  useToggleExpiryRule,
  type ExpiryAlert,
} from '@/modules/inventory/data/expiryAlerts'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'

type RangeFilter = 'all' | 'expired' | 'today' | 'three' | 'seven'

function matchesRange(alert: ExpiryAlert, range: RangeFilter) {
  if (range === 'all') return true
  if (range === 'expired') return alert.expiryCategory === 'expired'
  if (range === 'today') return alert.expiryCategory === 'today'
  if (range === 'three') return alert.daysUntil !== null && alert.daysUntil >= 0 && alert.daysUntil <= 3
  if (range === 'seven') return alert.daysUntil !== null && alert.daysUntil > 3 && alert.daysUntil <= 7
  return true
}

export default function ExpiryAlertsPage() {
  const { session, loading, error } = useSupabaseSession()
  const { activeOrgId } = useActiveOrgId()
  const hotels = useHotels()
  const [hotelId, setHotelId] = useState<string>('')
  const locations = useLocations(activeOrgId ?? undefined, hotelId || undefined)
  const [locationId, setLocationId] = useState<string>('')
  const [range, setRange] = useState<RangeFilter>('all')
  const alerts = useExpiryAlerts({ orgId: activeOrgId ?? undefined, status: 'open' })
  const rules = useExpiryRules(activeOrgId ?? undefined)
  const dismissAlert = useDismissExpiryAlert(activeOrgId ?? undefined)
  const createRule = useCreateExpiryRule()
  const toggleRule = useToggleExpiryRule(activeOrgId ?? undefined)
  const [newRuleDays, setNewRuleDays] = useState<number>(3)

  const formattedError = useFormattedError(error || alerts.error || rules.error)

  const filteredAlerts = useMemo(() => {
    return (alerts.data ?? []).filter((a) => {
      if (hotelId && a.hotelId !== hotelId) return false
      if (locationId && a.locationId !== locationId) return false
      return matchesRange(a, range)
    })
  }, [alerts.data, hotelId, locationId, range])

  if (loading) {
    return <Skeleton className="h-6 w-40" />
  }
  if (!session || error) {
    return <ErrorBanner title="Inicia sesion" message={formattedError || 'Necesitas iniciar sesion.'} />
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Caducidades"
        subtitle="Alertas generadas por reglas de caducidad y lotes activos."
        actions={
          <div className="flex flex-wrap gap-2">
            <select className="ds-input max-w-xs" value={hotelId} onChange={(e) => { setHotelId(e.target.value); setLocationId('') }}>
              <option value="">Todos los hoteles</option>
              {(hotels.data ?? []).map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            <select className="ds-input max-w-xs" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">Todas las ubicaciones</option>
              {(locations.data ?? []).map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            <select className="ds-input max-w-xs" value={range} onChange={(e) => setRange(e.target.value as RangeFilter)}>
              <option value="all">Todas</option>
              <option value="expired">Caducado</option>
              <option value="today">Hoy</option>
              <option value="three">1-3 dias</option>
              <option value="seven">4-7 dias</option>
            </select>
          </div>
        }
      />

      <div className="ds-card">
        <div className="ds-section-header">
          <div>
            <h3 className="text-sm font-semibold text-white">Reglas activas</h3>
            <p className="text-xs text-slate-400">Generan alertas sobre lotes con caducidad.</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input
              type="number"
              className="ds-input w-24"
              value={newRuleDays}
              onChange={(e) => setNewRuleDays(Number(e.target.value) || 0)}
              min={0}
            />
            <button
              type="button"
              className="ds-btn ds-btn-primary"
              disabled={createRule.isPending || !activeOrgId}
              onClick={async () => {
                if (!activeOrgId) return
                await createRule.mutateAsync({ orgId: activeOrgId, daysBefore: newRuleDays })
              }}
            >
              {createRule.isPending ? 'Creando...' : 'Anadir regla (dias)'}
            </button>
          </div>
        </div>
        {rules.isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : rules.isError ? (
          <ErrorBanner title="Error al cargar reglas" message={useFormattedError(rules.error)} onRetry={() => rules.refetch()} />
        ) : rules.data?.length ? (
          <div className="flex flex-wrap gap-2">
            {rules.data.map((rule) => (
              <button
                key={rule.id}
                type="button"
                className={`ds-badge ${rule.isEnabled ? 'is-info' : 'is-ghost'}`}
                onClick={() => toggleRule.mutate({ ruleId: rule.id, isEnabled: !rule.isEnabled })}
              >
                {rule.daysBefore}d {rule.isEnabled ? '(on)' : '(off)'}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Aun no hay reglas. Crea una para empezar a generar alertas.</p>
        )}
      </div>

      <div className="ds-card">
        <div className="ds-section-header">
          <div>
            <h3 className="text-sm font-semibold text-white">Alertas abiertas</h3>
            <p className="text-xs text-slate-400">Lotes que requieren accion.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Bell className="h-4 w-4 text-amber-400" />
            {filteredAlerts.length} abiertas
          </div>
        </div>

        {alerts.isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : alerts.isError ? (
          <div className="p-4">
            <ErrorBanner title="Error al cargar alertas" message={formattedError} onRetry={() => alerts.refetch()} />
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={CheckCircle}
              title="Sin alertas"
              description="No hay caducidades pendientes segun las reglas activas."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ds-table min-w-full">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Ubicacion</th>
                  <th className="is-num">Cantidad</th>
                  <th>Caduca</th>
                  <th className="is-num">Dias</th>
                  <th>Regla</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => {
                  const expires = alert.expiresAt ? new Date(alert.expiresAt).toLocaleDateString() : '-'
                  const badgeClass =
                    alert.expiryCategory === 'expired'
                      ? 'ds-badge is-error'
                      : alert.expiryCategory === 'today'
                        ? 'ds-badge is-warn'
                        : alert.expiryCategory === 'soon_3'
                          ? 'ds-badge is-warn'
                          : alert.expiryCategory === 'soon_7'
                            ? 'ds-badge is-info'
                            : 'ds-badge'
                  return (
                    <tr key={alert.id}>
                      <td className="font-semibold text-slate-200">{alert.productName}</td>
                      <td className="text-xs text-slate-400">{alert.locationName}</td>
                      <td className="is-num">
                        {alert.qty.toFixed(2)} {alert.unit}
                      </td>
                      <td>{expires}</td>
                      <td className="is-num">{alert.daysUntil ?? '-'}</td>
                      <td className="is-num">{alert.daysBefore ?? '-'}</td>
                      <td>
                        <span className={badgeClass}>{alert.expiryCategory}</span>
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="ds-btn ds-btn-ghost text-xs"
                          disabled={dismissAlert.isPending}
                          onClick={() => dismissAlert.mutate(alert.id)}
                        >
                          <AlertTriangle className="h-4 w-4" /> Descartar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
