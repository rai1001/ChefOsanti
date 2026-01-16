import { useMemo, useState } from 'react'
import { CheckCircle, Filter, Search, ShieldAlert } from 'lucide-react'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/modules/shared/ui/Table'
import { Badge } from '@/modules/shared/ui/Badge'
import { Button } from '@/modules/shared/ui/Button'
import { formatCurrency } from '@/lib/utils'
import { Card } from '@/modules/shared/ui/Card'
import { DataState } from '@/modules/shared/ui/DataState'
import { ConfirmDialog } from '@/modules/shared/ui/ConfirmDialog'

type RangeFilter = 'all' | 'expired' | 'today' | 'three' | 'seven'

const statusTone = (alert: ExpiryAlert) => {
  if (alert.expiryCategory === 'expired' || alert.expiryCategory === 'today') return 'danger'
  if (alert.expiryCategory === 'soon_3' || alert.expiryCategory === 'soon_7') return 'warning'
  return 'success'
}

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
  const [search, setSearch] = useState<string>('')
  const alerts = useExpiryAlerts({ orgId: activeOrgId ?? undefined, status: 'open' })
  const rules = useExpiryRules(activeOrgId ?? undefined)
  const dismissAlert = useDismissExpiryAlert(activeOrgId ?? undefined)
  const createRule = useCreateExpiryRule()
  const toggleRule = useToggleExpiryRule(activeOrgId ?? undefined)
  const [disposeTarget, setDisposeTarget] = useState<ExpiryAlert | null>(null)
  const ruleDefaults = [
    { key: 'fresh', label: 'Fresh', days: 2 },
    { key: 'pasteurized', label: 'Pasteurized', days: 2 },
    { key: 'frozen', label: 'Frozen', days: 7 },
  ] as const
  const rulesByType = useMemo(() => {
    const map = new Map<string, (typeof rules.data)[number]>()
    ;(rules.data ?? []).forEach((rule) => {
      if (rule.productType) map.set(rule.productType, rule)
    })
    return map
  }, [rules.data])

  const formattedError = useFormattedError(error || alerts.error || rules.error)
  const rulesError = useFormattedError(rules.error)

  const filteredAlerts = useMemo(() => {
    return (alerts.data ?? []).filter((a) => {
      if (hotelId && a.hotelId !== hotelId) return false
      if (locationId && a.locationId !== locationId) return false
      if (search && !a.productName.toLowerCase().includes(search.toLowerCase())) return false
      return matchesRange(a, range)
    })
  }, [alerts.data, hotelId, locationId, range, search])

  const criticalAlerts = filteredAlerts.filter((a) => a.expiryCategory === 'expired' || a.expiryCategory === 'today')
  const nearAlerts = filteredAlerts.filter((a) => a.expiryCategory === 'soon_3' || a.expiryCategory === 'soon_7')
  const okAlerts = filteredAlerts.filter((a) => a.expiryCategory === 'ok' || a.expiryCategory === 'none')
  const riskValue = formatCurrency(filteredAlerts.reduce((acc, alert) => acc + alert.qty, 0) * 10)

  if (loading) {
    return <Skeleton className="h-6 w-40" />
  }
  if (!session || error) {
    return <ErrorBanner title="Inicia sesion" message={formattedError || 'Necesitas iniciar sesion.'} />
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Expiry & Stock Alerts"
        subtitle="Prioriza lotes criticos antes de perder inventario."
        actions={
          <div className="flex flex-wrap gap-2">
            <select
              className="ds-input max-w-xs"
              value={hotelId}
              onChange={(e) => {
                setHotelId(e.target.value)
                setLocationId('')
              }}
            >
              <option value="">All hotels</option>
              {(hotels.data ?? []).map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            <select className="ds-input max-w-xs" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">All locations</option>
              {(locations.data ?? []).map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            <select className="ds-input max-w-xs" value={range} onChange={(e) => setRange(e.target.value as RangeFilter)}>
              <option value="all">All alerts</option>
              <option value="expired">Expired</option>
              <option value="today">Today</option>
              <option value="three">1-3 days</option>
              <option value="seven">4-7 days</option>
            </select>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-2xl border border-border/30 bg-surface/70 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-danger/80">Riesgo financiero</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{riskValue}</p>
              <p className="text-sm text-muted-foreground">Estimado por lotes con caducidad.</p>
            </div>
            <div className="rounded-full bg-danger/10 p-3 text-danger">
              <ShieldAlert size={20} />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border/30 bg-surface/70 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-danger/80">Alertas criticas</p>
          <div className="mt-2 flex items-baseline gap-3">
            <p className="text-3xl font-bold text-foreground">{criticalAlerts.length}</p>
            <Badge variant="danger">Critical</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Accion inmediata recomendada.</p>
        </Card>

        <Card className="rounded-2xl border border-border/30 bg-surface/70 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-warning/80">Alertas proximas</p>
          <div className="mt-2 flex items-baseline gap-3">
            <p className="text-3xl font-bold text-foreground">{nearAlerts.length}</p>
            <Badge variant="warning">Near Expiry</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Planifica uso prioritario.</p>
        </Card>
      </section>

      <Card className="rounded-3xl border border-border/25 bg-surface/70 p-5 shadow-[0_24px_60px_rgba(3,7,18,0.45)] space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search size={16} />
            </span>
            <input
              type="search"
              placeholder="Buscar lote o producto..."
              className="h-11 w-full rounded-xl border border-border/30 bg-surface2/70 pl-10 pr-4 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-brand-500/40"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-surface/60 px-3 py-2 text-xs text-muted-foreground">
            <Filter size={14} />
            <span className="text-[11px] uppercase tracking-wide">Status</span>
            <Badge variant="danger">{criticalAlerts.length} Critical</Badge>
            <Badge variant="warning">{nearAlerts.length} Near</Badge>
            <Badge variant="success">{okAlerts.length} Good</Badge>
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              variant="danger"
              size="sm"
              disabled={dismissAlert.isPending || filteredAlerts.length === 0}
              onClick={() => {
                const firstCritical = criticalAlerts[0]
                if (firstCritical) setDisposeTarget(firstCritical)
              }}
            >
              Mark disposed
            </Button>
            <Button variant="secondary" size="sm">
              Prioritize use
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/20 bg-surface/50 backdrop-blur-lg">
          <DataState
            loading={alerts.isLoading}
            error={alerts.error}
            errorTitle="Error al cargar alertas"
            errorMessage={formattedError ?? undefined}
            empty={filteredAlerts.length === 0}
            emptyState={
              <div className="p-6">
                <EmptyState
                  icon={CheckCircle}
                  title="Sin alertas"
                  description="No hay caducidades pendientes segun las reglas activas."
                />
              </div>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.map((alert) => {
                  const expires = alert.expiresAt ? new Date(alert.expiresAt).toLocaleDateString('en-CA') : '-'
                  const tone = statusTone(alert)
                  return (
                    <TableRow key={alert.id} className="hover:bg-white/5">
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">{alert.productName}</p>
                          <p className="text-xs text-muted-foreground">{alert.locationName}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-foreground">{alert.qty.toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">{alert.unit}</TableCell>
                      <TableCell className="text-foreground">{expires}</TableCell>
                      <TableCell>
                        <Badge variant={tone as any} className="capitalize">
                          {alert.expiryCategory}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{alert.daysBefore ? `${alert.daysBefore}d` : '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={dismissAlert.isPending}
                            onClick={() => setDisposeTarget(alert)}
                          >
                            Dispose
                          </Button>
                          <Button variant="secondary" size="sm">
                            Prioritize
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </DataState>
        </div>
      </Card>

      <Card className="rounded-2xl border border-border/30 bg-surface/70 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.45)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Expiry rules</p>
            <p className="text-sm text-muted-foreground">Reglas por tipo (fresh/pasteurized/frozen).</p>
          </div>
        </div>

        <DataState
          loading={rules.isLoading}
          error={rules.error}
          errorTitle="Error al cargar reglas"
          errorMessage={rulesError ?? formattedError ?? undefined}
          empty={false}
          skeleton={<Skeleton className="h-20 w-full" />}
        >
          <div className="grid gap-3 md:grid-cols-3">
            {ruleDefaults.map((ruleDef) => {
              const rule = rulesByType.get(ruleDef.key)
              return (
                <div key={ruleDef.key} className="rounded-2xl border border-border/25 bg-surface/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{ruleDef.label}</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-foreground">{rule?.daysBefore ?? ruleDef.days}d</span>
                    <Badge variant={rule?.isEnabled ? 'success' : 'neutral'}>
                      {rule?.isEnabled ? 'On' : 'Off'}
                    </Badge>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {rule ? (
                      <Button
                        variant={rule.isEnabled ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => toggleRule.mutate({ ruleId: rule.id, isEnabled: !rule.isEnabled })}
                      >
                        {rule.isEnabled ? 'Desactivar' : 'Activar'}
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={createRule.isPending || !activeOrgId}
                        onClick={async () => {
                          if (!activeOrgId) return
                          await createRule.mutateAsync({
                            orgId: activeOrgId,
                            daysBefore: ruleDef.days,
                            productType: ruleDef.key,
                          })
                        }}
                      >
                        Crear regla
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </DataState>
      </Card>

      <ConfirmDialog
        open={Boolean(disposeTarget)}
        title="Confirm disposal"
        description={
          disposeTarget
            ? `Mark ${disposeTarget.productName} (${disposeTarget.qty.toFixed(2)} ${disposeTarget.unit}) as disposed?`
            : undefined
        }
        confirmLabel="Dispose"
        onCancel={() => setDisposeTarget(null)}
        onConfirm={() => {
          if (!disposeTarget) return
          dismissAlert.mutate(disposeTarget.id)
          setDisposeTarget(null)
        }}
      />
    </div>
  )
}
