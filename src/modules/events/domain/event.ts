export type EventStatus = 'draft' | 'confirmed' | 'in_production' | 'closed' | 'cancelled'

export type Space = {
  id: string
  orgId: string
  hotelId: string
  name: string
  capacity?: number | null
  notes?: string | null
  createdAt?: string
}

export type SpaceBooking = {
  id: string
  orgId: string
  eventId: string
  spaceId: string
  startsAt: string
  endsAt: string
  groupLabel?: string | null
  note?: string | null
}

export type ServiceType =
  | 'desayuno'
  | 'coffee_break'
  | 'comida'
  | 'merienda'
  | 'cena'
  | 'coctel'
  | 'otros'

export type ServiceFormat = 'sentado' | 'de_pie'

export type EventService = {
  id: string
  orgId: string
  eventId: string
  serviceType: ServiceType
  format: ServiceFormat
  startsAt: string
  endsAt?: string | null
  pax: number
  notes?: string | null
}

type BookingLike = {
  id?: string
  startsAt: string
  endsAt: string
}

export function detectOverlaps(bookings: BookingLike[], candidate: BookingLike): boolean {
  const candStart = new Date(candidate.startsAt).getTime()
  const candEnd = new Date(candidate.endsAt).getTime()
  if (!Number.isFinite(candStart) || !Number.isFinite(candEnd) || candEnd <= candStart) {
    return false
  }

  return bookings.some((b) => {
    if (b.id && candidate.id && b.id === candidate.id) return false
    const start = new Date(b.startsAt).getTime()
    const end = new Date(b.endsAt).getTime()
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false
    return !(end <= candStart || start >= candEnd)
  })
}

export function normalizeServiceWindow(
  startsAt: string,
  endsAt?: string | null,
): { starts: string; ends?: string } {
  const startDate = new Date(startsAt)
  if (!Number.isFinite(startDate.getTime())) {
    throw new Error('Fecha inicio inv lida')
  }
  let endIso: string | undefined
  if (endsAt) {
    const endDate = new Date(endsAt)
    if (!Number.isFinite(endDate.getTime())) {
      throw new Error('Fecha fin inv lida')
    }
    if (endDate.getTime() <= startDate.getTime()) {
      throw new Error('Fin debe ser posterior al inicio')
    }
    endIso = endDate.toISOString()
  }
  return { starts: startDate.toISOString(), ends: endIso }
}
