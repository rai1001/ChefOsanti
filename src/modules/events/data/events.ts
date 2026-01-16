import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import type {
  EventService,
  EventStatus,
  ServiceFormat,
  ServiceType,
  Space,
  SpaceBooking,
} from '../domain/event'

export type Hotel = { id: string; orgId: string; name: string }

export type Event = {
  id: string
  orgId: string
  hotelId: string
  title: string
  clientName?: string | null
  status: EventStatus
  startsAt?: string | null
  endsAt?: string | null
  notes?: string | null
  createdAt?: string
}

export type RoomScheduleEvent = {
  eventId: string
  title: string
  status: string
  menuStatus?: string | null
}

export type RoomScheduleEntry = {
  orgId: string
  hotelId: string
  eventDate: string
  roomName: string
  eventCount: number
  confirmedEvents: number
  events: RoomScheduleEvent[]
}

export type BookingWithDetails = SpaceBooking & {
  spaceName?: string
  eventTitle?: string
}

function mapSpace(row: any): Space {
  return {
    id: row.id,
    orgId: row.org_id,
    hotelId: row.hotel_id,
    name: row.name,
    capacity: row.capacity,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

function mapEvent(row: any): Event {
  return {
    id: row.id,
    orgId: row.org_id,
    hotelId: row.hotel_id,
    title: row.title,
    clientName: row.client_name,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

function mapBooking(row: any): BookingWithDetails {
  return {
    id: row.id,
    orgId: row.org_id,
    eventId: row.event_id ?? row.events?.id,
    spaceId: row.space_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    groupLabel: row.group_label,
    note: row.note,
    createdAt: row.created_at,
    spaceName: row.spaces?.name,
    eventTitle: row.events?.title,
  }
}

function mapEventService(row: any): EventService {
  return {
    id: row.id,
    orgId: row.org_id,
    eventId: row.event_id,
    serviceType: row.service_type as ServiceType,
    format: row.format as ServiceFormat,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    pax: row.pax,
    notes: row.notes,
  }
}

export async function listHotels(): Promise<Hotel[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('hotels').select('id, org_id, name').order('name')
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'listHotels',
    })
  }
  return data?.map((row) => ({ id: row.id, orgId: row.org_id, name: row.name })) ?? []
}

export async function listSpaces(hotelId?: string): Promise<Space[]> {
  const supabase = getSupabaseClient()
  let query = supabase.from('spaces').select('*').order('name')
  if (hotelId) query = query.eq('hotel_id', hotelId)
  const { data, error } = await query
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'listSpaces',
      hotelId,
    })
  }
  return data?.map(mapSpace) ?? []
}

export async function createSpace(params: {
  orgId: string
  hotelId: string
  name: string
  capacity?: number | null
  notes?: string | null
}): Promise<Space> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('spaces')
    .insert({
      org_id: params.orgId,
      hotel_id: params.hotelId,
      name: params.name,
      capacity: params.capacity ?? null,
      notes: params.notes ?? null,
    })
    .select('*')
    .single()
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'createSpace',
      orgId: params.orgId,
      hotelId: params.hotelId,
    })
  }
  return mapSpace(data)
}

export async function listEvents(filters?: {
  hotelId?: string
  startsAt?: string
  endsAt?: string
}): Promise<Event[]> {
  const supabase = getSupabaseClient()
  let query = supabase.from('events').select('*').order('created_at', { ascending: false })
  if (filters?.hotelId) query = query.eq('hotel_id', filters.hotelId)
  if (filters?.startsAt) query = query.gte('starts_at', filters.startsAt)
  if (filters?.endsAt) query = query.lte('ends_at', filters.endsAt)
  const { data, error } = await query
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'listEvents',
      hotelId: filters?.hotelId,
    })
  }
  return data?.map(mapEvent) ?? []
}

export async function createEvent(params: {
  orgId: string
  hotelId: string
  title: string
  clientName?: string
  status: EventStatus
  startsAt?: string | null
  endsAt?: string | null
  notes?: string | null
}): Promise<Event> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('events')
    .insert({
      org_id: params.orgId,
      hotel_id: params.hotelId,
      title: params.title,
      client_name: params.clientName ?? null,
      status: params.status,
      starts_at: params.startsAt ?? null,
      ends_at: params.endsAt ?? null,
      notes: params.notes ?? null,
    })
    .select('*')
    .single()
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'createEvent',
      orgId: params.orgId,
      hotelId: params.hotelId,
    })
  }
  return mapEvent(data)
}

export async function getEventWithBookings(
  id: string,
): Promise<{ event: Event; bookings: BookingWithDetails[] }> {
  const supabase = getSupabaseClient()
  const { data: event, error: eventErr } = await supabase.from('events').select('*').eq('id', id).single()
  if (eventErr || !event) {
    throw mapSupabaseError(eventErr || { code: 'PGRST116', message: 'Evento no encontrado' }, {
      module: 'events',
      operation: 'getEventWithBookings',
      id,
    })
  }

  const { data: bookings, error: bookingsErr } = await supabase
    .from('space_bookings')
    .select('*, spaces (name), events (title)')
    .eq('event_id', id)
    .order('starts_at')
  if (bookingsErr) {
    throw mapSupabaseError(bookingsErr, {
      module: 'events',
      operation: 'getEventWithBookings',
      step: 'bookings',
      id,
    })
  }
  return { event: mapEvent(event), bookings: bookings?.map(mapBooking) ?? [] }
}

export async function listEventServices(eventId: string): Promise<EventService[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('event_services')
    .select('*')
    .eq('event_id', eventId)
    .order('starts_at')
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'listEventServices',
      eventId,
    })
  }
  return data?.map(mapEventService) ?? []
}

export async function createEventService(params: {
  orgId: string
  eventId: string
  serviceType: ServiceType
  format: ServiceFormat
  startsAt: string
  endsAt?: string | null
  pax: number
  notes?: string | null
}): Promise<EventService> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('event_services')
    .insert({
      org_id: params.orgId,
      event_id: params.eventId,
      service_type: params.serviceType,
      format: params.format,
      starts_at: params.startsAt,
      ends_at: params.endsAt ?? null,
      pax: params.pax,
      notes: params.notes ?? null,
    })
    .select('*')
    .single()
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'createEventService',
      orgId: params.orgId,
      eventId: params.eventId,
    })
  }
  return mapEventService(data)
}

export async function updateEventService(serviceId: string, payload: Partial<EventService>) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('event_services')
    .update({
      service_type: payload.serviceType,
      format: payload.format,
      starts_at: payload.startsAt,
      ends_at: payload.endsAt ?? null,
      pax: payload.pax,
      notes: payload.notes ?? null,
    })
    .eq('id', serviceId)
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'updateEventService',
      serviceId,
    })
  }
}

export async function deleteEventService(serviceId: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('event_services').delete().eq('id', serviceId)
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'deleteEventService',
      serviceId,
    })
  }
}

export async function listBookingsByHotel(params: {
  hotelId: string
  startsAt?: string
  endsAt?: string
}): Promise<BookingWithDetails[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('space_bookings')
    .select('*, events!inner(id, title, hotel_id), spaces!inner(name, hotel_id)')
    .eq('events.hotel_id', params.hotelId)
    .order('starts_at')

  if (params.startsAt) query = query.gte('starts_at', params.startsAt)
  if (params.endsAt) query = query.lte('ends_at', params.endsAt)

  const { data, error } = await query
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'listBookingsByHotel',
      hotelId: params.hotelId,
    })
  }
  return data?.map(mapBooking) ?? []
}

export async function listRoomSchedules(params: { hotelId: string; eventDate: string }): Promise<RoomScheduleEntry[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('event_room_schedule')
    .select('org_id, hotel_id, event_date, room_name, event_count, confirmed_events, events')
    .eq('hotel_id', params.hotelId)
    .eq('event_date', params.eventDate)
    .order('room_name', { ascending: true })

  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'listRoomSchedules',
      hotelId: params.hotelId,
      eventDate: params.eventDate,
    })
  }

  return (data ?? []).map((row) => ({
    orgId: row.org_id,
    hotelId: row.hotel_id,
    eventDate: row.event_date,
    roomName: row.room_name,
    eventCount: Number(row.event_count ?? 0),
    confirmedEvents: Number(row.confirmed_events ?? 0),
    events: Array.isArray(row.events)
      ? row.events.map((evt: any) => ({
          eventId: evt.event_id,
          title: evt.title ?? 'Evento',
          status: evt.status ?? 'pending',
          menuStatus: evt.menu_status ?? null,
        }))
      : [],
  }))
}

export async function createBooking(params: {
  orgId: string
  eventId: string
  spaceId: string
  startsAt: string
  endsAt: string
  groupLabel?: string | null
  note?: string | null
}): Promise<SpaceBooking> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('space_bookings')
    .insert({
      org_id: params.orgId,
      event_id: params.eventId,
      space_id: params.spaceId,
      starts_at: params.startsAt,
      ends_at: params.endsAt,
      group_label: params.groupLabel ?? null,
      note: params.note ?? null,
    })
    .select('*')
    .single()
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'createBooking',
      orgId: params.orgId,
      eventId: params.eventId,
    })
  }
  return mapBooking(data)
}

export async function deleteBooking(id: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('space_bookings').delete().eq('id', id)
  if (error) {
    throw mapSupabaseError(error, {
      module: 'events',
      operation: 'deleteBooking',
      id,
    })
  }
}

// Hooks
export function useHotels() {
  return useQuery({ queryKey: ['events-hotels'], queryFn: listHotels })
}

export function useSpaces(hotelId?: string) {
  return useQuery({ queryKey: ['spaces', hotelId], queryFn: () => listSpaces(hotelId), enabled: Boolean(hotelId) })
}

export function useCreateSpace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createSpace,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['spaces', variables.hotelId] })
    },
  })
}

export function useEvents(filters?: { hotelId?: string; startsAt?: string; endsAt?: string }) {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: () => listEvents(filters),
    enabled: Boolean(filters?.hotelId),
  })
}

export function useEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getEventWithBookings(eventId ?? ''),
    enabled: Boolean(eventId),
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createEvent,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['events', { hotelId: data.hotelId }] })
    },
  })
}

export function useBookingsByHotel(params: { hotelId: string; startsAt?: string; endsAt?: string }) {
  return useQuery({
    queryKey: ['space_bookings', params],
    queryFn: () => listBookingsByHotel(params),
    enabled: Boolean(params.hotelId),
  })
}

export function useCreateBooking(eventId: string | undefined, orgId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<Parameters<typeof createBooking>[0], 'eventId' | 'orgId'>) =>
      createBooking({
        ...payload,
        eventId: eventId ?? '',
        orgId: orgId ?? '',
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['event', eventId] })
      qc.invalidateQueries({ queryKey: ['space_bookings'] })
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['spaces', vars.spaceId] })
    },
  })
}

export function useDeleteBooking(eventId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteBooking,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event', eventId] })
      qc.invalidateQueries({ queryKey: ['space_bookings'] })
    },
  })
}

export function useEventServices(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event_services', eventId],
    queryFn: () => listEventServices(eventId ?? ''),
    enabled: Boolean(eventId),
  })
}

export function useCreateEventService(eventId: string | undefined, orgId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<Parameters<typeof createEventService>[0], 'eventId' | 'orgId'>) =>
      createEventService({
        ...payload,
        eventId: eventId ?? '',
        orgId: orgId ?? '',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event_services', eventId] })
    },
  })
}

export function useUpdateEventService(eventId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { serviceId: string; data: Partial<EventService> }) =>
      updateEventService(params.serviceId, params.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event_services', eventId] })
    },
  })
}

export function useDeleteEventService(eventId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteEventService,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event_services', eventId] })
    },
  })
}

export function useRoomSchedules(params?: { hotelId?: string; eventDate?: string }) {
  return useQuery({
    queryKey: ['room_schedule', params],
    queryFn: () => listRoomSchedules({ hotelId: params?.hotelId ?? '', eventDate: params?.eventDate ?? '' }),
    enabled: Boolean(params?.hotelId && params?.eventDate),
  })
}
