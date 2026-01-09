import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useHotels } from '@/modules/events/data/events'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import {
  useDashboardNote,
  useOrdersSummary,
  useOrdersToDeliver,
  useStaffAvailability,
  useWeekEvents,
} from '../data/dashboard'
import { startOfWeek } from '../domain/week'
import { DailyBriefModal, OrderAuditModal } from './AiModals'
import { DailyBriefWidget } from './DailyBriefWidget'

const weekdayLabels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

function isoWeekStart(date = new Date()) {
  return startOfWeek(date).toISOString().slice(0, 10)
}

export default function DashboardPage() {
  const { activeOrgId, loading: orgLoading, memberships, setOrg } = useActiveOrgId()
  const hotels = useHotels()
  const [hotelId, setHotelId] = useState<string | undefined>(undefined)
  const [weekStart, setWeekStart] = useState<string>(isoWeekStart())
  const [selectedDay, setSelectedDay] = useState<string>(isoWeekStart())
  const [noteDraft, setNoteDraft] = useState<string>('')
  const hasLoadedNote = useRef(false)

  // AI Modals state
  const [briefOpen, setBriefOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(false)
  const [auditOrderId, setAuditOrderId] = useState<string | null>(null)

  const { session } = useSupabaseSession()
  const userId = session?.user?.id ?? null

  useEffect(() => {
    if (hotels.data?.length && !hotelId) {
      setHotelId(hotels.data[0].id)
    }
  }, [hotels.data, hotelId])

  const weekEvents = useWeekEvents(hotelId, weekStart)
  const ordersSummary = useOrdersSummary(activeOrgId ?? undefined, weekStart)
  const ordersToDeliver = useOrdersToDeliver(activeOrgId ?? undefined, weekStart)
  const availability = useStaffAvailability(hotelId, isoWeekStart())
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



  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight text-glow">Dashboard</h1>
          <p className="text-slate-400 mt-1">Bienvenido a ChefOS Premium</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col text-sm">
            <label className="text-xs text-nano-blue-400 font-semibold mb-1 uppercase tracking-wider">Semana</label>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => {
                const start = isoWeekStart(new Date(e.target.value))
                setWeekStart(start)
                setSelectedDay(start)
              }}
              className="rounded-lg border border-white/10 bg-nano-navy-800 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:outline-none focus:ring-1 focus:ring-nano-blue-500 transition-all"
            />
          </div>
          <div className="flex flex-col text-sm">
            <label className="text-xs text-nano-blue-400 font-semibold mb-1 uppercase tracking-wider">Hotel</label>
            <select
              value={hotelId}
              onChange={(e) => setHotelId(e.target.value)}
              className="rounded-lg border border-white/10 bg-nano-navy-800 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:outline-none focus:ring-1 focus:ring-nano-blue-500 transition-all"
            >
              {hotels.data?.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          {memberships && memberships.length > 1 && (
            <div className="flex flex-col text-sm">
              <label className="text-xs text-nano-blue-400 font-semibold mb-1 uppercase tracking-wider">Organización</label>
              <select
                value={activeOrgId}
                onChange={(e) => setOrg(e.target.value)}
                className="rounded-lg border border-white/10 bg-nano-navy-800 px-3 py-2 text-sm text-white focus:border-nano-blue-500 focus:outline-none focus:ring-1 focus:ring-nano-blue-500 transition-all"
              >
                {memberships.map((m) => (
                  <option key={m.orgId} value={m.orgId}>
                    {m.orgName ?? m.orgSlug ?? m.orgId}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Hero Section: AI Brief */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-nano-navy-800 to-nano-navy-900 border border-white/10 p-1 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-nano-blue-500/20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-nano-orange-500/10 blur-3xl"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-6 md:p-8 gap-6">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-nano-blue-500/10 px-3 py-1 text-xs font-semibold text-nano-blue-400 border border-nano-blue-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nano-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-nano-blue-500"></span>
              </span>
              Nano Banana AI Active
            </div>
            <h2 className="text-3xl font-display font-medium text-white">
              Buenos días, Chef.
            </h2>
            <p className="text-slate-400 max-w-xl text-lg leading-relaxed">
              Tu resumen diario está listo. Tienes <span className="text-white font-semibold">{weekEvents.data?.find(d => d.date === isoWeekStart())?.events.length ?? 0} eventos</span> esta semana y <span className="text-white font-semibold">{ordersToDeliver.data?.length ?? 0} entregas pendientes</span>.
            </p>
            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setBriefOpen(true)}
                className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-nano-blue-600 to-nano-blue-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-nano-blue-500/25 transition-all hover:scale-105 hover:shadow-nano-blue-500/40"
              >
                Generar Daily Brief
                <svg className="h-4 w-4 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
              <button
                onClick={() => {
                  const pending = ordersToDeliver.data?.[0]
                  if (!pending) {
                    alert('No hay pedidos recientes para auditar.')
                    return
                  }
                  setAuditOrderId(pending.id)
                  setAuditOpen(true)
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10 hover:border-white/20"
              >
                Auditar Pedidos
              </button>
              <Link
                to="/importer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10 hover:border-white/20"
                title="Importador Universal"
                aria-label="Ir al Importador Universal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Stats / Quick Glance */}
          <div className="grid grid-cols-2 gap-4 w-full md:w-auto min-w-[300px]">
            <div className="p-4 rounded-xl bg-nano-navy-700/50 border border-white/5 backdrop-blur-sm">
              <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Total Pedidos</div>
              <div className="text-2xl font-bold text-white mt-1">{ordersSummary.data?.purchaseOrders.total ?? 0}</div>
              <div className="text-nano-blue-400 text-xs mt-1">Esta semana</div>
            </div>
            <div className="p-4 rounded-xl bg-nano-navy-700/50 border border-white/5 backdrop-blur-sm">
              <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Gasto Est.</div>
              <div className="text-2xl font-bold text-white mt-1">€{ordersSummary.data?.purchaseOrders.totalEstimado.toFixed(0) ?? '0'}</div>
              <div className="text-nano-orange-400 text-xs mt-1">Proyectado</div>
            </div>
            <div className="p-4 rounded-xl bg-nano-navy-700/50 border border-white/5 backdrop-blur-sm col-span-2 md:col-span-1">
              <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Personal Hoy</div>
              <div className="text-2xl font-bold text-white mt-1">
                {availability.data?.assigned ?? 0} / {availability.data?.required ?? 0}
              </div>
              <div className={`text-xs mt-1 ${availability.data && availability.data.percent < 90 ? 'text-red-400' : 'text-nano-blue-400'}`}>
                {availability.data?.percent.toFixed(0) ?? 0}% Cobertura
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Calendar */}
        <div className="lg:col-span-2 space-y-6">
          <section className="glass-panel rounded-2xl p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Calendario Semanal</h2>
                <p className="text-sm text-slate-400">{weekLabel}</p>
              </div>
              {weekEvents.isLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-nano-blue-500 border-t-transparent"></div>}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {weekEvents.data?.map((day, idx) => {
                const selected = selectedDay === day.date
                const dateObj = new Date(day.date)
                const isToday = day.date === new Date().toISOString().slice(0, 10)

                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDay(day.date)}
                    className={`relative flex flex-col items-center rounded-xl p-3 px-1 transition-all duration-300 ${selected
                      ? 'bg-nano-blue-500 text-white shadow-lg shadow-nano-blue-500/25 scale-105 z-10'
                      : 'bg-nano-navy-800/50 text-slate-400 hover:bg-nano-navy-700 hover:text-white border border-transparent hover:border-white/10'
                      }`}
                  >
                    <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">{weekdayLabels[idx]}</span>
                    <span className={`text-lg font-bold mt-1 ${isToday && !selected ? 'text-nano-blue-400' : ''}`}>
                      {dateObj.getDate()}
                    </span>
                    {day.events.length > 0 && (
                      <span className="mt-2 flex h-1.5 w-1.5 rounded-full bg-nano-orange-500"></span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="mt-6 pt-6 border-t border-white/5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-nano-blue-500 rounded-full"></span>
                Agenda de {new Date(selectedDay).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}
              </h3>

              <div className="space-y-3">
                {weekEvents.data?.find((d) => d.date === selectedDay)?.events.length === 0 && (
                  <div className="text-center py-8 text-slate-500 italic">No hay eventos programados para este día.</div>
                )}

                {weekEvents.data
                  ?.find((d) => d.date === selectedDay)
                  ?.events.map((ev) => (
                    <div key={ev.id} className="group glass-card rounded-xl p-4 flex items-center justify-between hover:bg-nano-navy-700/60">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-nano-navy-900 border border-white/10 text-nano-blue-400">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-white font-medium group-hover:text-nano-blue-300 transition-colors">{ev.title}</h4>
                          <div className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                            <span className="bg-nano-navy-900 px-2 py-0.5 rounded textxs">{ev.startsAt?.slice(11, 16) ?? '--:--'}</span>
                            <span>·</span>
                            <span className="capitalize">{ev.status}</span>
                          </div>
                        </div>
                      </div>

                      <Link to={`/events/${ev.id}`} className="text-sm font-medium text-nano-blue-400 hover:text-nano-blue-300 transition-colors">
                        Ver detalles &rarr;
                      </Link>
                    </div>
                  ))}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Operaional */}
        <div className="space-y-6">
          {/* Quick Actions / AI Tools grid used to be here, now mostly in Hero but we can keep specific tools if needed or just stats */}
          <DailyBriefWidget />

          {/* Pendientes */}
          <section className="glass-panel rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-nano-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Entregas Pendientes
            </h2>
            <div className="space-y-3">
              {ordersToDeliver.data?.length === 0 && <div className="text-sm text-slate-500">Todo al día.</div>}
              {ordersToDeliver.data?.map((po) => (
                <div key={`${po.type}-${po.id}`} className="p-3 rounded-xl bg-nano-navy-800/40 border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-200">
                      {po.type === 'purchase' ? 'Compra' : 'Evento'} #{po.orderNumber}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {po.status} · {po.createdAt?.slice(0, 10)}
                    </div>
                  </div>
                  <Link
                    to={po.type === 'purchase' ? `/purchasing/orders/${po.id}` : `/purchasing/event-orders/${po.id}`}
                    className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    aria-label={`Ver detalle de pedido ${po.orderNumber}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* Notes */}
          <section className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Notas Rápidas</h2>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                {note.saving ? 'Guardando...' : 'Autoguardado'}
              </span>
            </div>
            <textarea
              className="w-full rounded-xl bg-nano-navy-900/50 border border-white/10 p-4 text-sm text-slate-300 shadow-inner focus:border-nano-blue-500/50 focus:bg-nano-navy-900 focus:outline-none focus:ring-1 focus:ring-nano-blue-500/50 transition-all placeholder:text-slate-600"
              rows={6}
              placeholder="Escribe recordatorios, ideas o notas para el equipo..."
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              disabled={note.isLoading || note.isFetching || note.isError}
            />
          </section>
        </div>
      </div>

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
