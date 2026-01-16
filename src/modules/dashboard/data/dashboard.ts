import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import { endOfWeek, startOfWeek } from '../domain/week'

export type WeekEvent = {
  id: string
  title: string
  status: string
  startsAt?: string | null
  endsAt?: string | null
  clientName?: string | null
  services: { id: string; serviceType: string; startsAt?: string | null; pax?: number | null }[]
  bookings: { id: string; spaceId: string; startsAt: string; endsAt: string; spaceName?: string | null }[]
}

export type WeekEventsByDay = { date: string; events: WeekEvent[] }[]

export type DashboardPurchaseMetrics = {
  orgId: string
  hotelId: string
  day: string
  eventsCount: number
  confirmedMenus: number
  pendingOrders: number
  receivedOrders: number
  totalOrderValue: number
  pendingValue: number
  receivedValue: number
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

async function fetchWeekEvents(hotelId: string, weekStart: string): Promise<WeekEventsByDay> {
  const supabase = getSupabaseClient()
  const start = startOfWeek(weekStart)
  const end = endOfWeek(weekStart)
  const { data, error } = await supabase
    .from('events')
    .select('*, event_services (*), space_bookings (*, spaces (name))')
    .eq('hotel_id', hotelId)
    .gte('starts_at', start.toISOString())
    .lte('starts_at', end.toISOString())
    .order('starts_at')
  if (error) {
    throw mapSupabaseError(error, {
      module: 'dashboard',
      operation: 'fetchWeekEvents',
      hotelId,
      weekStart,
    })
  }
  const grouped = new Map<string, WeekEvent[]>()
    ; (data ?? []).forEach((row: any) => {
      const dateKey = row.starts_at ? row.starts_at.slice(0, 10) : toIsoDate(start)
      if (!grouped.has(dateKey)) grouped.set(dateKey, [])
      grouped.get(dateKey)!.push({
        id: row.id,
        title: row.title,
        status: row.status,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        clientName: row.client_name,
        services:
          row.event_services?.map((s: any) => ({
            id: s.id,
            serviceType: s.service_type,
            startsAt: s.starts_at,
            pax: s.pax,
          })) ?? [],
        bookings:
          row.space_bookings?.map((b: any) => ({
            id: b.id,
            spaceId: b.space_id,
            startsAt: b.starts_at,
            endsAt: b.ends_at,
            spaceName: b.spaces?.name,
          })) ?? [],
      })
    })
  const days: WeekEventsByDay = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(start)
    day.setUTCDate(start.getUTCDate() + i)
    const key = toIsoDate(day)
    days.push({ date: key, events: grouped.get(key) ?? [] })
  }
  return days
}

type OrdersSummary = {
  purchaseOrders: { total: number; totalEstimado: number; porEstado: Record<string, number> }
  eventOrders: { total: number; totalEstimado: number; porEstado: Record<string, number> }
}

export type StaffAvailability = {
  required: number
  assigned: number
  percent: number
}

async function fetchOrdersSummary(orgId: string, weekStart: string): Promise<OrdersSummary> {
  const supabase = getSupabaseClient()
  const start = startOfWeek(weekStart).toISOString()
  const end = endOfWeek(weekStart).toISOString()
  const [purchase, eventOrders] = await Promise.all([
    supabase
      .from('purchase_orders')
      .select('status,total_estimated,created_at')
      .eq('org_id', orgId)
      .gte('created_at', start)
      .lte('created_at', end),
    supabase
      .from('event_purchase_orders')
      .select('status,total_estimated,created_at')
      .eq('org_id', orgId)
      .gte('created_at', start)
      .lte('created_at', end),
  ])
  if (purchase.error) {
    throw mapSupabaseError(purchase.error, {
      module: 'dashboard',
      operation: 'fetchOrdersSummary_purchase',
      orgId,
      weekStart,
    })
  }
  if (eventOrders.error) {
    throw mapSupabaseError(eventOrders.error, {
      module: 'dashboard',
      operation: 'fetchOrdersSummary_eventOrders',
      orgId,
      weekStart,
    })
  }

  const reduce = (rows: any[]) =>
    rows.reduce(
      (acc, row) => {
        acc.total += 1
        acc.totalEstimado += Number(row.total_estimated ?? 0)
        acc.porEstado[row.status] = (acc.porEstado[row.status] ?? 0) + 1
        return acc
      },
      { total: 0, totalEstimado: 0, porEstado: {} as Record<string, number> },
    )

  return {
    purchaseOrders: reduce(purchase.data ?? []),
    eventOrders: reduce(eventOrders.data ?? []),
  }
}

async function fetchDashboardPurchaseMetrics(
  orgId: string,
  hotelId: string,
  day: string,
): Promise<DashboardPurchaseMetrics> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('dashboard_purchase_event_metrics')
    .select('*')
    .eq('org_id', orgId)
    .eq('hotel_id', hotelId)
    .eq('day', day)
    .maybeSingle()
  if (error) {
    throw mapSupabaseError(error, {
      module: 'dashboard',
      operation: 'fetchDashboardPurchaseMetrics',
      orgId,
      hotelId,
      day,
    })
  }
  const row = data ?? null
  return {
    orgId,
    hotelId,
    day,
    eventsCount: Number(row?.events_count ?? 0),
    confirmedMenus: Number(row?.confirmed_menus ?? 0),
    pendingOrders: Number(row?.pending_orders ?? 0),
    receivedOrders: Number(row?.received_orders ?? 0),
    totalOrderValue: Number(row?.total_order_value ?? 0),
    pendingValue: Number(row?.pending_value ?? 0),
    receivedValue: Number(row?.received_value ?? 0),
  }
}

export type OrderToDeliver = {
  id: string
  orderNumber: string
  status: string
  createdAt: string
  type: 'purchase' | 'event'
}

async function fetchOrdersToDeliver(orgId: string, weekStart: string, scope: 'week' | 'all') {
  const supabase = getSupabaseClient()
  const start = startOfWeek(weekStart).toISOString()
  const end = endOfWeek(weekStart).toISOString()
  const purchaseQuery = supabase
    .from('purchase_orders')
    .select('id,order_number,status,created_at')
    .eq('org_id', orgId)
    .in('status', ['ordered'])
    .order('created_at', { ascending: true })
    .limit(20)
  const eventQuery = supabase
    .from('event_purchase_orders')
    .select('id,order_number,status,created_at')
    .eq('org_id', orgId)
    .in('status', ['ordered'])
    .order('created_at', { ascending: true })
    .limit(20)
  if (scope === 'week') {
    purchaseQuery.gte('created_at', start).lte('created_at', end)
    eventQuery.gte('created_at', start).lte('created_at', end)
  }
  const [purchase, eventOrders] = await Promise.all([purchaseQuery, eventQuery])
  if (purchase.error) {
    throw mapSupabaseError(purchase.error, {
      module: 'dashboard',
      operation: 'fetchOrdersToDeliver_purchase',
      orgId,
    })
  }
  if (eventOrders.error) {
    throw mapSupabaseError(eventOrders.error, {
      module: 'dashboard',
      operation: 'fetchOrdersToDeliver_eventOrders',
      orgId,
    })
  }

  const mapped: OrderToDeliver[] = [
    ...(purchase.data ?? []).map((row: any) => ({
      id: row.id,
      orderNumber: row.order_number,
      status: row.status,
      createdAt: row.created_at,
      type: 'purchase' as const,
    })),
    ...(eventOrders.data ?? []).map((row: any) => ({
      id: row.id,
      orderNumber: row.order_number,
      status: row.status,
      createdAt: row.created_at,
      type: 'event' as const,
    })),
  ]
  return mapped
}

async function fetchStaffAvailability(hotelId: string, date: string): Promise<StaffAvailability> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('shifts')
    .select('required_count, staff_assignments(count)')
    .eq('hotel_id', hotelId)
    .eq('shift_date', date)

  if (error) {
    throw mapSupabaseError(error, {
      module: 'dashboard',
      operation: 'fetchStaffAvailability',
      hotelId,
      date,
    })
  }

  let required = 0
  let assigned = 0

    ; (data ?? []).forEach((row: any) => {
      required += row.required_count || 0
      assigned += row.staff_assignments?.[0]?.count || 0
    })

  return {
    required,
    assigned,
    percent: required > 0 ? (assigned / required) * 100 : 100,
  }
}

export type DashboardNote = {
  id?: string
  orgId: string
  userId: string
  weekStart: string
  content: string
  updatedAt?: string
}

async function fetchDashboardNote(orgId: string, userId: string, weekStart: string): Promise<DashboardNote> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('dashboard_notes')
    .select('*')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle()
  if (error) {
    if (error.code === 'PGRST116') return { orgId, userId, weekStart, content: '' }
    throw mapSupabaseError(error, {
      module: 'dashboard',
      operation: 'fetchDashboardNote',
      orgId,
      userId,
    })
  }
  if (!data) return { orgId, userId, weekStart, content: '' }
  return {
    id: data.id,
    orgId: data.org_id,
    userId: data.user_id,
    weekStart: data.week_start,
    content: data.content ?? '',
    updatedAt: data.updated_at,
  }
}

async function upsertDashboardNote(note: DashboardNote) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('dashboard_notes')
    .upsert(
      {
        id: note.id,
        org_id: note.orgId,
        user_id: note.userId,
        week_start: note.weekStart,
        content: note.content,
      },
      { onConflict: 'org_id,user_id,week_start' },
    )
    .select('*')
    .single()
  if (error) {
    throw mapSupabaseError(error, {
      module: 'dashboard',
      operation: 'upsertDashboardNote',
      orgId: note.orgId,
      userId: note.userId,
    })
  }
  return {
    id: data.id,
    orgId: data.org_id,
    userId: data.user_id,
    weekStart: data.week_start,
    content: data.content ?? '',
    updatedAt: data.updated_at,
  }
}

export function useWeekEvents(hotelId?: string, weekStart?: string) {
  return useQuery({
    queryKey: ['dashboard', 'weekEvents', hotelId, weekStart],
    queryFn: () => fetchWeekEvents(hotelId ?? '', weekStart ?? toIsoDate(new Date())),
    enabled: Boolean(hotelId && weekStart),
  })
}

export function useOrdersSummary(orgId?: string, weekStart?: string) {
  return useQuery({
    queryKey: ['dashboard', 'ordersSummary', orgId, weekStart],
    queryFn: () => fetchOrdersSummary(orgId ?? '', weekStart ?? toIsoDate(new Date())),
    enabled: Boolean(orgId && weekStart),
  })
}

export function useOrdersToDeliver(orgId?: string, weekStart?: string, scope: 'week' | 'all' = 'week') {
  return useQuery({
    queryKey: ['dashboard', 'ordersToDeliver', orgId, weekStart, scope],
    queryFn: () => fetchOrdersToDeliver(orgId ?? '', weekStart ?? toIsoDate(new Date()), scope),
    enabled: Boolean(orgId && weekStart),
  })
}

export function useDashboardPurchaseMetrics(orgId?: string, hotelId?: string, day?: string) {
  return useQuery({
    queryKey: ['dashboard', 'purchaseMetrics', orgId, hotelId, day],
    queryFn: () => fetchDashboardPurchaseMetrics(orgId ?? '', hotelId ?? '', day ?? toIsoDate(new Date())),
    enabled: Boolean(orgId && hotelId && day),
  })
}

export function useDashboardNote(orgId?: string, userId?: string, weekStart?: string) {
  const qc = useQueryClient()
  const key = ['dashboard', 'note', orgId, userId, weekStart]
  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchDashboardNote(orgId ?? '', userId ?? '', weekStart ?? toIsoDate(new Date())),
    enabled: Boolean(orgId && userId && weekStart),
  })
  const mutation = useMutation({
    mutationFn: (content: string) =>
      upsertDashboardNote({
        orgId: orgId ?? '',
        userId: userId ?? '',
        weekStart: weekStart ?? toIsoDate(new Date()),
        content,
      }),
    onSuccess: (data) => qc.setQueryData(key, data),
  })
  return { ...query, save: mutation.mutateAsync, saving: mutation.isPending }
}

export function useStaffAvailability(hotelId?: string, date?: string) {
  return useQuery({
    queryKey: ['dashboard', 'staffAvailability', hotelId, date],
    queryFn: () => fetchStaffAvailability(hotelId ?? '', date ?? toIsoDate(new Date())),
    enabled: Boolean(hotelId && date),
  })
}
