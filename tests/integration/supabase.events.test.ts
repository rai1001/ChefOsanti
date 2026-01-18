import { beforeAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import {
  bootstrapAppClient,
  createOrgUser,
  createSupabaseClients,
  ensureSupabaseReady,
  loadSupabaseEnv,
  resetSupabaseDatabase,
  signInAppUser,
} from './utils/supabaseTestUtils'

describe.sequential('Supabase Events data flows', () => {
  const env = loadSupabaseEnv()
  const { admin } = createSupabaseClients(env)
  let appClient: any
  let orgA: Awaited<ReturnType<typeof createOrgUser>>
  let orgB: Awaited<ReturnType<typeof createOrgUser>>
  let spaceId: string
  let eventId: string
  let attachmentId: string
  let AppErrorCls: any

  let listSpaces: typeof import('@/modules/events/data/events').listSpaces
  let createSpace: typeof import('@/modules/events/data/events').createSpace
  let listEvents: typeof import('@/modules/events/data/events').listEvents
  let createEvent: typeof import('@/modules/events/data/events').createEvent
  let getEventWithBookings: typeof import('@/modules/events/data/events').getEventWithBookings
  let listBookingsByHotel: typeof import('@/modules/events/data/events').listBookingsByHotel
  let createBooking: typeof import('@/modules/events/data/events').createBooking
  let deleteBooking: typeof import('@/modules/events/data/events').deleteBooking
  let listEventServices: typeof import('@/modules/events/data/events').listEventServices
  let createEventService: typeof import('@/modules/events/data/events').createEventService
  let updateEventService: typeof import('@/modules/events/data/events').updateEventService
  let deleteEventService: typeof import('@/modules/events/data/events').deleteEventService
  let listEventAttachments: typeof import('@/modules/events/data/ocr').listEventAttachments
  let processOcrLocally: typeof import('@/modules/events/data/ocr').processOcrLocally
  let applyOcrDraft: typeof import('@/modules/events/data/ocr').applyOcrDraft
  let getServiceMenuContent: typeof import('@/modules/events/data/ocr').getServiceMenuContent
  let updateServiceMenuItem: typeof import('@/modules/events/data/ocr').updateServiceMenuItem

  beforeAll(async () => {
    await resetSupabaseDatabase()
    await ensureSupabaseReady(env.url)
    appClient = await bootstrapAppClient(env)

    const eventsMod = await import('@/modules/events/data/events')
    listSpaces = eventsMod.listSpaces
    createSpace = eventsMod.createSpace
    listEvents = eventsMod.listEvents
    createEvent = eventsMod.createEvent
    getEventWithBookings = eventsMod.getEventWithBookings
    listBookingsByHotel = eventsMod.listBookingsByHotel
    createBooking = eventsMod.createBooking
    deleteBooking = eventsMod.deleteBooking
    listEventServices = eventsMod.listEventServices
    createEventService = eventsMod.createEventService
    updateEventService = eventsMod.updateEventService
    deleteEventService = eventsMod.deleteEventService

    const ocrMod = await import('@/modules/events/data/ocr')
    listEventAttachments = ocrMod.listEventAttachments
    processOcrLocally = ocrMod.processOcrLocally
    applyOcrDraft = ocrMod.applyOcrDraft
    getServiceMenuContent = ocrMod.getServiceMenuContent
    updateServiceMenuItem = ocrMod.updateServiceMenuItem

    AppErrorCls = (await import('@/lib/shared/errors')).AppError
    orgA = await createOrgUser(admin, 'eventsA')
    orgB = await createOrgUser(admin, 'eventsB')
    await signInAppUser(appClient, orgA.email, orgA.password)

    const space = await createSpace({
      orgId: orgA.orgId,
      hotelId: orgA.hotelId,
      name: 'Salon QA',
      capacity: 80,
      notes: 'principal',
    })
    spaceId = space.id

    const now = new Date()
    const evt = await createEvent({
      orgId: orgA.orgId,
      hotelId: orgA.hotelId,
      title: 'Evento QA',
      clientName: 'Cliente QA',
      status: 'confirmed',
      startsAt: now.toISOString(),
      endsAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      notes: 'Notas del evento',
    })
    eventId = evt.id

    const attachmentRes = await appClient
      .from('event_attachments')
      .insert({
        id: randomUUID(),
        org_id: orgA.orgId,
        event_id: eventId,
        storage_path: `org/${orgA.orgId}/event/${eventId}/menu.txt`,
        original_name: 'menu.txt',
        mime_type: 'text/plain',
        size_bytes: 12,
      })
      .select('id')
      .single()
    attachmentId = attachmentRes.data?.id as string
  }, 240_000)

  it('CRUD de eventos y bookings por organizacion', async () => {
    await signInAppUser(appClient, orgA.email, orgA.password)
    const spaces = await listSpaces(orgA.hotelId)
    expect(spaces.map((s) => s.id)).toContain(spaceId)

    const events = await listEvents({ hotelId: orgA.hotelId })
    expect(events.map((e) => e.id)).toContain(eventId)

    const booking = await createBooking({
      orgId: orgA.orgId,
      eventId,
      spaceId,
      startsAt: events[0]?.startsAt ?? new Date().toISOString(),
      endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      groupLabel: 'Montaje',
      note: 'Setup inicial',
    })

    const withBookings = await getEventWithBookings(eventId)
    expect(withBookings.bookings.map((b) => b.id)).toContain(booking.id)

    const byHotel = await listBookingsByHotel({ hotelId: orgA.hotelId })
    expect(byHotel.some((b) => b.spaceId === spaceId)).toBe(true)

    const service = await createEventService({
      orgId: orgA.orgId,
      eventId,
      serviceType: 'cena',
      format: 'sentado',
      startsAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      pax: 50,
      notes: 'Servicio inicial',
    })

    const services = await listEventServices(eventId)
    expect(services.map((s) => s.id)).toContain(service.id)

    await updateEventService(service.id, { pax: 60, notes: 'Ajuste pax' })
    const afterUpdate = await listEventServices(eventId)
    expect(afterUpdate.find((s) => s.id === service.id)?.pax).toBe(60)

    await deleteBooking(booking.id)
    const bookingsAfter = await listBookingsByHotel({ hotelId: orgA.hotelId })
    expect(bookingsAfter.some((b) => b.id === booking.id)).toBe(false)

    await deleteEventService(service.id)
    const afterDelete = await listEventServices(eventId)
    expect(afterDelete.find((s) => s.id === service.id)).toBeUndefined()
  })

  it('impide operar con eventos de otra organizacion', async () => {
    await appClient.auth.signOut()
    await signInAppUser(appClient, orgB.email, orgB.password)

    await expect(
      createSpace({ orgId: orgA.orgId, hotelId: orgA.hotelId, name: 'Salon bloqueado' }),
    ).rejects.toBeInstanceOf(AppErrorCls)

    const crossEvents = await listEvents({ hotelId: orgA.hotelId })
    expect(crossEvents).toEqual([])

    await expect(
      createBooking({
        orgId: orgA.orgId,
        eventId,
        spaceId,
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
    ).rejects.toBeInstanceOf(AppErrorCls)
  })

  it('procesa OCR local y aplica draft a servicios/menu', async () => {
    await appClient.auth.signOut()
    await signInAppUser(appClient, orgA.email, orgA.password)

    const job = await processOcrLocally(attachmentId, orgA.orgId)
    expect(job.jobId).toBeTruthy()

    const attachments = await listEventAttachments(eventId)
    expect(attachments.find((a) => a.id === attachmentId)?.job?.id).toBe(job.jobId)

    const draft = {
      detectedServices: [
        {
          serviceType: 'desayuno',
          formatGuess: 'buffet',
          startsAtGuess: '08:00',
          paxGuess: 30,
          sections: [
            { title: 'Bebidas', items: ['Cafe', 'Zumo'] },
            { title: 'Platos', items: ['Tostadas'] },
          ],
        },
      ],
    }

    const createdServiceIds = await applyOcrDraft({ eventId, orgId: orgA.orgId, draft } as any)
    expect(createdServiceIds.length).toBeGreaterThan(0)

    const content = await getServiceMenuContent(createdServiceIds[0])
    expect(content[0]?.items.length).toBeGreaterThan(0)

    const firstItemId = content[0]?.items[0]?.id as string
    await updateServiceMenuItem({ itemId: firstItemId, requiresReview: false, portionMultiplier: 2 })
    const updated = await getServiceMenuContent(createdServiceIds[0])
    expect(updated[0]?.items[0]?.requiresReview).toBe(false)
    expect(updated[0]?.items[0]?.portionMultiplier).toBe(2)
  })
})
