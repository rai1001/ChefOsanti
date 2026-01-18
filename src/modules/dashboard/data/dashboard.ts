import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import { isValidUuid } from '@/lib/utils'
import { endOfRange, startOfRange } from '../domain/week'

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

export type DashboardRollingDay = {
  day: string
  eventsCount: number
  purchasePending: number
  purchaseOrdered: number
  purchaseReceived: number
  productionDraft: number
  productionInProgress: number
  productionDone: number
  staffRequired: number
  staffAssigned: number
}

export type DashboardEventHighlight = {
  eventId: string
  title: string
  startsAt: string | null
  status: string
  paxTotal: number
  servicesCount: number
  productionStatus?: string | null
}

export type DashboardDeadline = {
  deadlineDay: string
  eventPurchaseOrderId: string
  orderNumber: string
  status: string
  productType: string
  supplierName: string
  eventTitle: string
  leadTimeDays: number
  orderDeadlineAt: string
  reminderEndAt: string
  reminderActive: boolean
}

export type DashboardShift = {
  id: string
  shiftDate: string
  shiftType: string
  startsAt: string
  endsAt: string
  requiredCount: number
  assignments: { staffMemberId: string; staffName: string }[]
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

async function fetchWeekEvents(hotelId: string, weekStart: string): Promise<WeekEventsByDay> {
  const supabase = getSupabaseClient()
  const start = startOfRange(weekStart)
  const end = endOfRange(weekStart, 7)
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
  const start = startOfRange(weekStart).toISOString()
  const end = endOfRange(weekStart, 7).toISOString()
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

async function fetchDashboardRollingGrid(
  orgId: string,
  hotelId: string,
  rangeStart: string,
): Promise<DashboardRollingDay[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('dashboard_rolling_grid', {
    p_org_id: orgId,
    p_hotel_id: hotelId,
    p_start: rangeStart,
    p_days: 7,
  })
  if (error) {
    throw mapSupabaseError(error, {
      module: 'dashboard',
      operation: 'fetchDashboardRollingGrid',
      orgId,
      hotelId,
      rangeStart,
    })
  }
  return (
    (data as any[] | null)?.map((row) => ({
      day: row.day,
      eventsCount: Number(row.events_count ?? 0),
      purchasePending: Number(row.purchase_pending ?? 0),
      purchaseOrdered: Number(row.purchase_ordered ?? 0),
      purchaseReceived: Number(row.purchase_received ?? 0),
      productionDraft: Number(row.production_draft ?? 0),
      productionInProgress: Number(row.production_in_progress ?? 0),
      productionDone: Number(row.production_done ?? 0),
      staffRequired: Number(row.staff_required ?? 0),
      staffAssigned: Number(row.staff_assigned ?? 0),
    })) ?? []
  )
}

async function fetchDashboardHighlights(
  orgId: string,
  hotelId: string,
  rangeStart: string,
): Promise<DashboardEventHighlight[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('dashboard_event_highlights', {
    p_org_id: orgId,
    p_hotel_id: hotelId,
    p_start: rangeStart,
    p_days: 7,
  })
  if (error) {
    throw mapSupabaseError(error, {
      module: 'dashboard',
      operation: 'fetchDashboardHighlights',
      orgId,
      hotelId,
      rangeStart,
    })
  }
  return (
    (data as any[] | null)?.map((row) => ({
      eventId: row.event_id,
      title: row.title,
      startsAt: row.starts_at,
      status: row.status,
      paxTotal: Number(row.pax_total ?? 0),
      servicesCount: Number(row.services_count ?? 0),
      productionStatus: row.production_status ?? null,
    })) ?? []
  )
}

async function fetchDashboardBriefing(
  orgId: string,
  hotelId: string,
  rangeStart: string,
): Promise<DashboardDeadline[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('dashboard_briefing', {
    p_org_id: orgId,
    p_hotel_id: hotelId,
    p_start: rangeStart,
    p_days: 7,
  })
  if (error) {
    throw mapSupabaseError(error, {
      module: 'dashboard',
      operation: 'fetchDashboardBriefing',
      orgId,
      hotelId,
      rangeStart,
    })
  }
  return (
    (data as any[] | null)?.map((row) => ({
      deadlineDay: row.deadline_day,
      eventPurchaseOrderId: row.event_purchase_order_id,
      orderNumber: row.order_number,
      status: row.status,
      productType: row.product_type,
      supplierName: row.supplier_name,
      eventTitle: row.event_title,
      leadTimeDays: Number(row.lead_time_days ?? 0),
      orderDeadlineAt: row.order_deadline_at,
      reminderEndAt: row.reminder_end_at,
      reminderActive: Boolean(row.reminder_active),
    })) ?? []
  )
}

async function fetchDashboardStaffShifts(
  orgId: string,
  hotelId: string,
  day: string,
): Promise<DashboardShift[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('shifts')
    .select('id,shift_date,shift_type,starts_at,ends_at,required_count, staff_assignments(staff_member_id, staff_members(full_name))')
    .eq('org_id', orgId)
    .eq('hotel_id', hotelId)
    .eq('shift_date', day)
    .order('shift_type', { ascending: true })
  if (error) {
    throw mapSupabaseError(error, {
      module: 'dashboard',
      operation: 'fetchDashboardStaffShifts',
      orgId,
      hotelId,
      day,
    })
  }
  return (
    (data as any[] | null)?.map((row) => ({
      id: row.id,
      shiftDate: row.shift_date,
      shiftType: row.shift_type,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      requiredCount: Number(row.required_count ?? 0),
      assignments:
        row.staff_assignments?.map((a: any) => ({
          staffMemberId: a.staff_member_id,
          staffName: a.staff_members?.full_name ?? a.staff_member_id,
        })) ?? [],
    })) ?? []
  )
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
  const start = startOfRange(weekStart).toISOString()
  const end = endOfRange(weekStart, 7).toISOString()
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
    enabled: isValidUuid(hotelId) && Boolean(weekStart),
  })
}

export function useOrdersSummary(orgId?: string, weekStart?: string) {
  return useQuery({
    queryKey: ['dashboard', 'ordersSummary', orgId, weekStart],
    queryFn: () => fetchOrdersSummary(orgId ?? '', weekStart ?? toIsoDate(new Date())),
    enabled: isValidUuid(orgId) && Boolean(weekStart),
  })
}

export function useOrdersToDeliver(orgId?: string, weekStart?: string, scope: 'week' | 'all' = 'week') {
  return useQuery({
    queryKey: ['dashboard', 'ordersToDeliver', orgId, weekStart, scope],
    queryFn: () => fetchOrdersToDeliver(orgId ?? '', weekStart ?? toIsoDate(new Date()), scope),
    enabled: isValidUuid(orgId) && Boolean(weekStart),
  })
}

export function useDashboardPurchaseMetrics(orgId?: string, hotelId?: string, day?: string) {
  return useQuery({
    queryKey: ['dashboard', 'purchaseMetrics', orgId, hotelId, day],
    queryFn: () => fetchDashboardPurchaseMetrics(orgId ?? '', hotelId ?? '', day ?? toIsoDate(new Date())),
    enabled: isValidUuid(orgId) && isValidUuid(hotelId) && Boolean(day),
  })
}

export function useDashboardRollingGrid(orgId?: string, hotelId?: string, rangeStart?: string) {
  return useQuery({
    queryKey: ['dashboard', 'rollingGrid', orgId, hotelId, rangeStart],
    queryFn: () => fetchDashboardRollingGrid(orgId ?? '', hotelId ?? '', rangeStart ?? toIsoDate(new Date())),
    enabled: isValidUuid(orgId) && isValidUuid(hotelId) && Boolean(rangeStart),
  })
}

export function useDashboardHighlights(orgId?: string, hotelId?: string, rangeStart?: string) {
  return useQuery({
    queryKey: ['dashboard', 'highlights', orgId, hotelId, rangeStart],
    queryFn: () => fetchDashboardHighlights(orgId ?? '', hotelId ?? '', rangeStart ?? toIsoDate(new Date())),
    enabled: isValidUuid(orgId) && isValidUuid(hotelId) && Boolean(rangeStart),
  })
}

export function useDashboardBriefing(orgId?: string, hotelId?: string, rangeStart?: string) {
  return useQuery({
    queryKey: ['dashboard', 'briefing', orgId, hotelId, rangeStart],
    queryFn: () => fetchDashboardBriefing(orgId ?? '', hotelId ?? '', rangeStart ?? toIsoDate(new Date())),
    enabled: isValidUuid(orgId) && isValidUuid(hotelId) && Boolean(rangeStart),
  })
}

export function useDashboardStaffShifts(orgId?: string, hotelId?: string, day?: string) {
  return useQuery({
    queryKey: ['dashboard', 'staffShifts', orgId, hotelId, day],
    queryFn: () => fetchDashboardStaffShifts(orgId ?? '', hotelId ?? '', day ?? toIsoDate(new Date())),
    enabled: isValidUuid(orgId) && isValidUuid(hotelId) && Boolean(day),
  })
}

export function useDashboardNote(orgId?: string, userId?: string, weekStart?: string) {
  const qc = useQueryClient()
  const key = ['dashboard', 'note', orgId, userId, weekStart]
  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchDashboardNote(orgId ?? '', userId ?? '', weekStart ?? toIsoDate(new Date())),
    enabled: isValidUuid(orgId) && isValidUuid(userId) && Boolean(weekStart),
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
    enabled: isValidUuid(hotelId) && Boolean(date),
  })
}
