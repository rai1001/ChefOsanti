import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useHotels } from '@/modules/events/data/events'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useOrgPlan } from '@/modules/orgs/data/orgPlans'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { aiFeatures, canUseFeature, type PlanTier } from '@/modules/auth/domain/aiAccess'
import {
  useDashboardNote,
  useOrdersSummary,
  useOrdersToDeliver,
  useWeekEvents,
} from '../data/dashboard'
import { startOfWeek } from '../domain/week'
import { DailyBriefModal, OrderAuditModal } from './AiModals'

const weekdayLabels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

function isoWeekStart(date = new Date()) {
  return startOfWeek(date).toISOString().slice(0, 10)
}

export function DashboardPage() {
  const { activeOrgId, loading: orgLoading, memberships, setOrg } = useActiveOrgId()
  const hotels = useHotels()
  const [hotelId, setHotelId] = useState<string | undefined>(undefined)
  const [weekStart, setWeekStart] = useState<string>(isoWeekStart())
  const [selectedDay, setSelectedDay] = useState<string>(isoWeekStart())
  const [userId, setUserId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState<string>('')
  const hasLoadedNote = useRef(false)
  const [rpcAllowed, setRpcAllowed] = useState<Record<string, boolean | null>>({})
  const { role } = useCurrentRole()
  const orgPlan = useOrgPlan(activeOrgId ?? undefined)

  // AI Modals state
  const [briefOpen, setBriefOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(false)
  const [auditOrderId, setAuditOrderId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null))
      .catch(() => setUserId(null))
  }, [])

  useEffect(() => {
    if (hotels.data?.length && !hotelId) {
      setHotelId(hotels.data[0].id)
    }
  }, [hotels.data, hotelId])

  const weekEvents = useWeekEvents(hotelId, weekStart)
  const ordersSummary = useOrdersSummary(activeOrgId ?? undefined, weekStart)
  const ordersToDeliver = useOrdersToDeliver(activeOrgId ?? undefined, weekStart)
  const note = useDashboardNote(activeOrgId ?? undefined, userId ?? undefined, weekStart)

  useEffect(() => {
    if (note.data) {
      hasLoadedNote.current = true
      setNoteDraft(note.data.content ?? '')
    }
  }, [note.data?.id, note.data?.content, note.data?.weekStart])

  useEffect(() => {
    if (!hasLoadedNote.current || !activeOrgId || !userId) return
    const timer = setTimeout(() => {
      note.save(noteDraft).catch(() => {
        /* no-op */
      })
    }, 600)
    return () => clearTimeout(timer)
  }, [noteDraft, activeOrgId, userId, weekStart])

  useEffect(() => {
    if (!activeOrgId) return
    const supabase = getSupabaseClient()
    aiFeatures.forEach((feature) => {
      supabase
        .rpc('can_use_feature', { feature_key: feature.key, p_org_id: activeOrgId })
        .then(({ data, error }) => {
          if (error) {
            setRpcAllowed((prev) => ({ ...prev, [feature.key]: false }))
            return
          }
          setRpcAllowed((prev) => ({ ...prev, [feature.key]: Boolean(data) }))
        })
    })
  }, [activeOrgId])

  const weekLabel = useMemo(() => {
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return `${start.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`
  }, [weekStart])

  if (orgLoading) {
    return <div className="text-slate-600">Cargando organización...</div>
  }

  if (!activeOrgId) {
    return <div className="text-red-600">No hay organización activa. Inicia sesión o selecciona una.</div>
  }

  const plan: PlanTier = orgPlan.data ?? 'basic'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard semanal</h1>
          <p className="text-sm text-slate-600">Eventos, pedidos y notas operativas de la semana</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col text-sm text-slate-700">
            <label className="text-xs text-slate-500">Semana</label>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => {
                const start = isoWeekStart(new Date(e.target.value))
                setWeekStart(start)
                setSelectedDay(start)
              }}
              className="rounded border border-slate-200 px-2 py-1 text-sm"
            />
          </div>
          <div className="flex flex-col text-sm text-slate-700">
            <label className="text-xs text-slate-500">Hotel</label>
            <select
              value={hotelId}
              onChange={(e) => setHotelId(e.target.value)}
              className="rounded border border-slate-200 px-2 py-1 text-sm"
            >
              {hotels.data?.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          {memberships && memberships.length > 1 && (
            <div className="flex flex-col text-sm text-slate-700">
              <label className="text-xs text-slate-500">Organización</label>
              <select
                value={activeOrgId}
                onChange={(e) => setOrg(e.target.value)}
                className="rounded border border-slate-200 px-2 py-1 text-sm"
              >
                {memberships.map((m) => (
                  <option key={m.orgId} value={m.orgId}>
                    {m.orgId}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Semana en curso</h2>
            <p className="text-sm text-slate-600">{weekLabel}</p>
          </div>
          {weekEvents.isLoading && <span className="text-sm text-slate-500">Cargando eventos...</span>}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
          {weekEvents.data?.map((day, idx) => {
            const selected = selectedDay === day.date
            const dateObj = new Date(day.date)
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDay(day.date)}
                className={`flex flex-col rounded border p-3 text-left transition ${selected ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-300'
                  }`}
              >
                <div className="flex items-baseline justify-between">
                  <div className="text-xs font-medium text-slate-500">{weekdayLabels[idx]}</div>
                  <div className="text-xs text-slate-500">
                    {dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  {day.events.length === 0 && <div className="text-xs text-slate-400">Sin eventos</div>}
                  {day.events.map((ev) => (
                    <div key={ev.id} className="rounded bg-slate-50 p-2 text-xs text-slate-700">
                      <div className="font-semibold text-slate-800">{ev.title}</div>
                      <div className="text-[11px] text-slate-500">
                        {ev.startsAt?.slice(11, 16) ?? '--:--'} {ev.services.length > 0 ? `· ${ev.services.length} servicios` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </button>
            )
          })}
        </div>
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-slate-800">Detalle día seleccionado</h3>
          <div className="mt-2 space-y-2">
            {weekEvents.data
              ?.find((d) => d.date === selectedDay)
              ?.events.map((ev) => (
                <div key={ev.id} className="rounded border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{ev.title}</div>
                      <div className="text-xs text-slate-600">
                        {ev.startsAt?.slice(11, 16) ?? '--:--'} · {ev.status}
                      </div>
                    </div>
                    <Link to={`/events/${ev.id}`} className="text-xs text-brand-700 underline">
                      Ver evento
                    </Link>
                  </div>
                  {ev.services.length > 0 && (
                    <div className="mt-2 text-xs text-slate-700">
                      Servicios: {ev.services.map((s) => `${s.serviceType} (${s.pax ?? 0}p)`).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            {weekEvents.data?.find((d) => d.date === selectedDay)?.events.length === 0 && (
              <div className="text-xs text-slate-500">Sin eventos ese día.</div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Acceso IA</h2>
            <p className="text-sm text-slate-600">Plan activo: {plan.toUpperCase()} · Rol: {role}</p>
          </div>
          {orgPlan.isLoading && <span className="text-xs text-slate-500">Cargando plan...</span>}
        </div>
        <div className="grid gap-3 md:grid-cols-3" data-testid="ai-access-panel">
          {aiFeatures.map((feature) => {
            const allowed = rpcAllowed[feature.key] ?? canUseFeature(role, plan, feature.key)
            const labelMap: Record<typeof feature.key, string> = {
              daily_brief: 'Daily Brief (IA)',
              ocr_review: 'OCR Review',
              order_audit: 'Order Audit',
            }
            const requirement = `Disponible en PLAN ${feature.minPlan.toUpperCase()} / ROL ${feature.minRole}`
            const onClick = async () => {
              if (!allowed) {
                alert('Tu plan o rol no permite esta funcion.')
                return
              }
              const supabase = getSupabaseClient()
              const { data, error } = await supabase.rpc('can_use_feature', {
                feature_key: feature.key,
                p_org_id: activeOrgId,
              })
              if (error || !data) {
                alert('No autorizado (Server side check)')
                return
              }

              if (feature.key === 'daily_brief') {
                setBriefOpen(true)
              } else if (feature.key === 'order_audit') {
                // Pick a pending order to audit
                const pending = ordersToDeliver.data?.[0]
                if (!pending) {
                  alert('No hay pedidos recientes para auditar.')
                  return
                }
                setAuditOrderId(pending.id)
                setAuditOpen(true)
              } else if (feature.key === 'ocr_review') {
                alert('Sube un archivo en un evento para usar el OCR.')
              }
            }
            return (
              <div key={feature.key} className="rounded border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-900">{labelMap[feature.key]}</p>
                <p className="text-xs text-slate-600">
                  Plan mínimo: {feature.minPlan.toUpperCase()} · Rol mínimo: {feature.minRole}
                </p>
                <button
                  type="button"
                  data-testid={`btn-${feature.key}`}
                  onClick={onClick}
                  disabled={!allowed}
                  className="mt-2 w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {allowed ? 'Autorizado' : requirement}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Pedidos</h2>
            {ordersSummary.isLoading && <span className="text-xs text-slate-500">Cargando...</span>}
          </div>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="rounded border border-slate-200 p-3">
              <div className="font-semibold text-slate-800">Compras</div>
              <div>Total: {ordersSummary.data?.purchaseOrders.total ?? 0}</div>
              <div>Estimado: €{ordersSummary.data?.purchaseOrders.totalEstimado.toFixed(2) ?? '0.00'}</div>
            </div>
            <div className="rounded border border-slate-200 p-3">
              <div className="font-semibold text-slate-800">Pedidos por evento</div>
              <div>Total: {ordersSummary.data?.eventOrders.total ?? 0}</div>
              <div>Estimado: €{ordersSummary.data?.eventOrders.totalEstimado.toFixed(2) ?? '0.00'}</div>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Pedidos por entregar</h2>
            {ordersToDeliver.isLoading && <span className="text-xs text-slate-500">Cargando...</span>}
          </div>
          <div className="space-y-2 text-sm text-slate-700">
            {ordersToDeliver.data?.length === 0 && <div className="text-xs text-slate-500">Nada pendiente.</div>}
            {ordersToDeliver.data?.map((po) => (
              <div key={`${po.type}-${po.id}`} className="flex items-center justify-between rounded border border-slate-200 p-2">
                <div>
                  <div className="font-semibold text-slate-800">
                    {po.type === 'purchase' ? 'Compra' : 'Evento'} · {po.orderNumber}
                  </div>
                  <div className="text-xs text-slate-500">
                    {po.status} · {po.createdAt?.slice(0, 10)}
                  </div>
                </div>
                <Link
                  to={po.type === 'purchase' ? `/purchasing/orders/${po.id}` : `/purchasing/event-orders/${po.id}`}
                  className="text-xs text-brand-700 underline"
                >
                  Abrir
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Notas</h2>
            <p className="text-sm text-slate-600">Bloc personal por semana (solo tú y tu org)</p>
          </div>
          <div className="text-xs text-slate-500">
            {note.saving ? 'Guardando...' : note.isFetching ? 'Cargando...' : 'Guardado'}
          </div>
        </div>
        <textarea
          className="mt-3 w-full rounded border border-slate-200 p-3 text-sm shadow-inner focus:border-brand-500 focus:outline-none"
          rows={4}
          placeholder="Anota recordatorios, entregas, riesgos..."
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          disabled={note.isLoading || note.isFetching || note.isError}
        />
        {note.isError && <div className="mt-2 text-xs text-red-600">No se pudo guardar la nota.</div>}
      </section>

      {
        briefOpen && (
          <DailyBriefModal
            weekStart={weekStart}
            onClose={() => setBriefOpen(false)}
          />
        )
      }
      {
        auditOpen && auditOrderId && (
          <OrderAuditModal
            orderId={auditOrderId}
            onClose={() => {
              setAuditOpen(false)
              setAuditOrderId(null)
            }}
          />
        )
      }
    </div >
  )
}
