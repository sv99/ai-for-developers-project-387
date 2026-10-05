import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const importApi = async () => {
  const eventTypes = await import('../eventTypes')
  const bookings = await import('../bookings')
  return { ...eventTypes, ...bookings }
}

type Api = Awaited<ReturnType<typeof importApi>>

const createType = (api: Api, durationMinutes = 30) =>
  api.createEventType({ name: 'Встреча', description: '', durationMinutes })

const contact = { name: 'Анна', phone: '+7 900 000-00-00' }

describe('bookings API', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('creates an active booking with a generated id', async () => {
    const api = await importApi()
    const type = createType(api, 30)

    const booking = api.createBooking({
      eventTypeId: type.id,
      date: '2026-10-05',
      startTime: '10:00',
      contact,
    })

    expect(booking.id).toBeTruthy()
    expect(booking.status).toBe('active')
    expect(booking.eventTypeId).toBe(type.id)
    expect(booking.date).toBe('2026-10-05')
    expect(booking.startTime).toBe('10:00')
    expect(booking.contact).toEqual(contact)
    expect(booking.createdAt).toBeTruthy()
  })

  it('starts with an empty list and returns created bookings', async () => {
    const api = await importApi()
    const type = createType(api, 30)

    expect(api.listBookings()).toEqual([])

    api.createBooking({ eventTypeId: type.id, date: '2026-10-05', startTime: '10:00', contact })
    api.createBooking({ eventTypeId: type.id, date: '2026-10-05', startTime: '11:00', contact })

    expect(api.listBookings()).toHaveLength(2)
  })

  it('persists bookings across reloads', async () => {
    const first = await importApi()
    const type = createType(first, 30)
    first.createBooking({ eventTypeId: type.id, date: '2026-10-05', startTime: '10:00', contact })

    vi.resetModules()
    const second = await importApi()

    expect(second.listBookings()).toHaveLength(1)
    expect(second.listBookings()[0]?.startTime).toBe('10:00')
  })

  it('rejects a booking that overlaps an existing active one', async () => {
    const api = await importApi()
    const type = createType(api, 30)

    api.createBooking({ eventTypeId: type.id, date: '2026-10-05', startTime: '10:00', contact })

    expect(() =>
      api.createBooking({ eventTypeId: type.id, date: '2026-10-05', startTime: '10:00', contact }),
    ).toThrow()
  })

  it('rejects overlaps across different event types', async () => {
    const api = await importApi()
    const short = createType(api, 30)
    const long = createType(api, 60)

    api.createBooking({ eventTypeId: long.id, date: '2026-10-05', startTime: '10:00', contact })

    expect(() =>
      api.createBooking({ eventTypeId: short.id, date: '2026-10-05', startTime: '10:30', contact }),
    ).toThrow()
  })

  it('allows a booking that only touches the end of another', async () => {
    const api = await importApi()
    const type = createType(api, 30)

    api.createBooking({ eventTypeId: type.id, date: '2026-10-05', startTime: '10:00', contact })
    api.createBooking({ eventTypeId: type.id, date: '2026-10-05', startTime: '10:30', contact })

    expect(api.listBookings()).toHaveLength(2)
  })

  it('rejects a start time outside the 30-minute grid', async () => {
    const api = await importApi()
    const type = createType(api, 30)

    expect(() =>
      api.createBooking({ eventTypeId: type.id, date: '2026-10-05', startTime: '10:15', contact }),
    ).toThrow()
    expect(() =>
      api.createBooking({ eventTypeId: type.id, date: '2026-10-05', startTime: '18:00', contact }),
    ).toThrow()
  })

  it('rejects a booking that does not fit before 18:00', async () => {
    const api = await importApi()
    const long = createType(api, 60)

    expect(() =>
      api.createBooking({ eventTypeId: long.id, date: '2026-10-05', startTime: '17:30', contact }),
    ).toThrow()
  })

  it('rejects an unknown event type', async () => {
    const api = await importApi()

    expect(() =>
      api.createBooking({
        eventTypeId: 'missing',
        date: '2026-10-05',
        startTime: '10:00',
        contact,
      }),
    ).toThrow()
  })

  it('rejects an empty contact', async () => {
    const api = await importApi()
    const type = createType(api, 30)

    expect(() =>
      api.createBooking({
        eventTypeId: type.id,
        date: '2026-10-05',
        startTime: '10:00',
        contact: { name: '  ', phone: '+7 900 000-00-00' },
      }),
    ).toThrow()
    expect(() =>
      api.createBooking({
        eventTypeId: type.id,
        date: '2026-10-05',
        startTime: '10:00',
        contact: { name: 'Анна', phone: ' ' },
      }),
    ).toThrow()
  })

  it('rejects a booking without a date', async () => {
    const api = await importApi()
    const type = createType(api, 30)

    expect(() =>
      api.createBooking({ eventTypeId: type.id, date: '', startTime: '10:00', contact }),
    ).toThrow()
  })
})

describe('upcoming bookings API', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-28T12:15:00'))
    localStorage.clear()
    vi.resetModules()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const book = (api: Api, type: { id: string }, date: string, startTime: string) =>
    api.createBooking({ eventTypeId: type.id, date, startTime, contact })

  it('lists only the future active bookings, earliest first', async () => {
    const api = await importApi()
    const type = createType(api, 30)

    book(api, type, '2026-03-30', '10:00')
    book(api, type, '2026-03-29', '15:00')
    book(api, type, '2026-03-28', '17:00')

    expect(api.listUpcomingBookings().map((item) => `${item.date} ${item.startTime}`)).toEqual([
      '2026-03-28 17:00',
      '2026-03-29 15:00',
      '2026-03-30 10:00',
    ])
  })

  it('leaves out the bookings that already started', async () => {
    const api = await importApi()
    const type = createType(api, 30)

    book(api, type, '2026-03-28', '09:00')
    book(api, type, '2026-03-27', '16:00')

    expect(api.listUpcomingBookings()).toEqual([])
  })

  it('leaves out the cancelled bookings', async () => {
    const api = await importApi()
    const type = createType(api, 30)

    book(api, type, '2026-03-29', '10:00')

    const stored = JSON.parse(localStorage.getItem('calendar-bookings') ?? '[]')
    localStorage.setItem(
      'calendar-bookings',
      JSON.stringify(
        stored.map((booking: { status: string }) => ({ ...booking, status: 'cancelled' })),
      ),
    )

    expect(api.listUpcomingBookings()).toEqual([])
  })

  it('cancels a booking and keeps it in the storage', async () => {
    const api = await importApi()
    const type = createType(api, 30)
    const booking = book(api, type, '2026-03-29', '10:00')

    const cancelled = api.cancelBooking(booking.id)

    expect(cancelled.status).toBe('cancelled')
    expect(cancelled.date).toBe('2026-03-29')
    expect(cancelled.contact).toEqual(contact)
    expect(api.listUpcomingBookings()).toEqual([])
    expect(api.listBookings()).toHaveLength(1)
  })

  it('rejects cancelling an unknown or already cancelled booking', async () => {
    const api = await importApi()
    const type = createType(api, 30)
    const booking = book(api, type, '2026-03-29', '10:00')

    expect(() => api.cancelBooking('missing')).toThrow()

    api.cancelBooking(booking.id)

    expect(() => api.cancelBooking(booking.id)).toThrow()
  })
})
